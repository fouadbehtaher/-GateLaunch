const express = require("express");
const Joi = require("joi");
const orderService = require("../services/orderService");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const { validate, validateQuery, validateParams } = require("../middleware/validator");
const { notifyAdmins, notifyUser } = require("../websocket");
const logger = require("../utils/logger");

const router = express.Router();

const walletSchema = Joi.string().valid(
  "vodafone_cash",
  "orange_cash",
  "etisalat_cash",
  "instapay",
  "fawry",
  "meeza",
  "online_card"
);

/**
 * @route   GET /api/orders
 * @desc    Get orders
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  apiRateLimiter,
  validateQuery(
    Joi.object({
      status: Joi.string().valid("pending", "approved", "rejected").optional(),
      wallet: walletSchema.optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
    })
  ),
  async (req, res) => {
  try {
    const { status, wallet, page, limit } = req.query;

    const filters = {};

    // Non-admin users can only see their own orders
    if (req.user.role !== "admin" && req.user.role !== "supervisor") {
      filters.userId = req.user.id;
    }

    if (status) filters.status = status;
    if (wallet) filters.wallet = wallet;

    const result = await orderService.getOrders(
      req.app.locals.store,
      filters,
      Number(page),
      Number(limit)
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Get orders route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
  }
);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  apiRateLimiter,
  validate(
    Joi.object({
      game: Joi.string().trim().min(1).max(120).required(),
      playerId: Joi.string().trim().min(1).max(80).required(),
      amount: Joi.number().positive().required(),
      wallet: walletSchema.required(),
      proofUrl: Joi.string().trim().max(400).allow("", null).optional(),
    })
  ),
  async (req, res) => {
  try {
    const { game, playerId, amount, wallet, proofUrl } = req.body;

    const result = await orderService.createOrder(
      req.app.locals.store,
      { game, playerId, amount, wallet, proofUrl },
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    notifyAdmins({
      type: "new_order",
      message: "New order created",
      data: result.data,
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error("Create order route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
  }
);

/**
 * @route   PATCH /api/orders/:id
 * @desc    Update order status
 * @access  Admin
 */
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(Joi.object({ id: Joi.string().trim().min(1).max(80).required() })),
  validate(
    Joi.object({
      status: Joi.string().valid("pending", "approved", "rejected").required(),
    })
  ),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await orderService.updateOrderStatus(
      req.app.locals.store,
      id,
      status,
      req.user.id
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Notify the user
    notifyUser(result.data.userId, {
      type: "order_updated",
      message: `Your order has been ${status}`,
      data: result.data,
    });

    res.json(result);
  } catch (error) {
    logger.error("Update order route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
  }
);

/**
 * @route   GET /api/orders/stats
 * @desc    Get order statistics
 * @access  Private
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    // Admins can see all stats, users can see their own
    const userId = req.user.role === "admin" || req.user.role === "supervisor" 
      ? null 
      : req.user.id;

    const result = await orderService.getOrderStats(
      req.app.locals.store,
      userId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error("Get order stats route error", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Server error",
      code: "SERVER_ERROR",
    });
  }
});

module.exports = router;
