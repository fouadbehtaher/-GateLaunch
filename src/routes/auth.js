const express = require("express");
const authService = require("../services/authService");
const { loginRateLimiter } = require("../middleware/rateLimiter");
const { authenticate } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_FIELDS",
      });
    }

    const result = await authService.login(
      req.app.locals.store,
      email,
      password,
      req
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Login route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    User registration
 * @access  Public
 */
router.post("/signup", loginRateLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_FIELDS",
      });
    }

    const result = await authService.signup(
      req.app.locals.store,
      { email, password, name },
      req
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error("Signup route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        code: "MISSING_TOKEN",
      });
    }

    const result = await authService.refresh(req.app.locals.store, refreshToken);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Refresh route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/profile", authenticate, async (req, res) => {
  try {
    const result = await authService.getProfile(
      req.app.locals.store,
      req.user.id
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Get profile route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const result = await authService.updateProfile(
      req.app.locals.store,
      req.user.id,
      req.body
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Update profile route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post("/logout", authenticate, (req, res) => {
  // With JWT, logout is handled client-side by deleting the token
  // We can add token blacklisting if needed
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
