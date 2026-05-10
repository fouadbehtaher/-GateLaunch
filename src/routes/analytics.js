const express = require("express");
const analyticsService = require("../services/analyticsService");
const { authenticate, requireStaff } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard analytics
 * @access  Private
 */
router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const result = await analyticsService.getDashboardAnalytics(
      req.app.locals.store,
      req.user.role === "admin" || req.user.role === "supervisor" ? null : req.user.id,
      req.user.role
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Dashboard analytics route error", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/analytics/timeseries
 * @desc    Get time series data for charts
 * @access  Staff
 */
router.get("/timeseries", authenticate, requireStaff, async (req, res) => {
  try {
    const { type = "orders", period = "week" } = req.query;

    if (!["orders", "tickets", "receipts"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type parameter",
        code: "INVALID_TYPE",
      });
    }

    if (!["week", "month", "year"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period parameter",
        code: "INVALID_PERIOD",
      });
    }

    const result = await analyticsService.getTimeSeriesData(
      req.app.locals.store,
      type,
      period
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Time series route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/analytics/top-games
 * @desc    Get top games/services
 * @access  Staff
 */
router.get("/top-games", authenticate, requireStaff, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await analyticsService.getTopGames(
      req.app.locals.store,
      parseInt(limit)
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Top games route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/analytics/wallet-stats
 * @desc    Get wallet usage statistics
 * @access  Staff
 */
router.get("/wallet-stats", authenticate, requireStaff, async (req, res) => {
  try {
    const result = await analyticsService.getWalletStats(req.app.locals.store);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Wallet stats route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/analytics/user-activity/:userId
 * @desc    Get user activity report
 * @access  Admin/Self
 */
router.get("/user-activity/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only see their own activity, unless they're admin
    if (
      req.user.id !== userId &&
      req.user.role !== "admin" &&
      req.user.role !== "supervisor"
    ) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN",
      });
    }

    const result = await analyticsService.getUserActivityReport(
      req.app.locals.store,
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("User activity route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

module.exports = router;
