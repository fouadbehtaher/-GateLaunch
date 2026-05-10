const logger = require("../utils/logger");
const cache = require("../utils/cache");
const { paginate } = require("../utils/helpers");

/**
 * Get all orders with filters and pagination
 */
const getOrders = async (store, filters = {}, page = 1, limit = 10) => {
  try {
    const cacheKey = `orders:${JSON.stringify(filters)}:${page}:${limit}`;
    let result = await cache.get(cacheKey);

    if (!result) {
      const data = store.readData();
      let orders = data.orders || [];

      // Apply filters
      if (filters.userId) {
        orders = orders.filter((o) => o.userId === filters.userId);
      }

      if (filters.status) {
        orders = orders.filter((o) => o.status === filters.status);
      }

      if (filters.wallet) {
        orders = orders.filter((o) => o.wallet === filters.wallet);
      }

      // Sort by creation date (newest first)
      orders.sort((a, b) => b.createdAt - a.createdAt);

      // Paginate
      result = paginate(orders, page, limit);

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300);
    }

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    logger.error("Get orders error", { error: error.message, filters });
    return {
      success: false,
      message: "Failed to get orders",
      code: "GET_ORDERS_ERROR",
    };
  }
};

/**
 * Create new order
 */
const createOrder = async (store, orderData, userId) => {
  try {
    const data = store.readData();

    const newOrder = {
      id: require("crypto").randomUUID(),
      userId,
      game: orderData.game,
      playerId: orderData.playerId,
      amount: orderData.amount,
      wallet: orderData.wallet,
      proofUrl: orderData.proofUrl || null,
      status: "pending",
      createdAt: Date.now(),
    };

    data.orders = data.orders || [];
    data.orders.push(newOrder);
    store.writeData(data);

    // Clear cache
    await cache.delPrefix("orders:");
    await cache.delPrefix("order_stats:");

    logger.info("Order created", {
      orderId: newOrder.id,
      userId,
      game: orderData.game,
    });

    return {
      success: true,
      message: "Order created successfully",
      data: newOrder,
    };
  } catch (error) {
    logger.error("Create order error", { error: error.message, userId });
    return {
      success: false,
      message: "Failed to create order",
      code: "CREATE_ORDER_ERROR",
    };
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (store, orderId, status, adminId) => {
  try {
    const data = store.readData();
    const orderIndex = data.orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      return {
        success: false,
        message: "Order not found",
        code: "ORDER_NOT_FOUND",
      };
    }

    const order = data.orders[orderIndex];
    order.status = status;
    order.updatedAt = Date.now();
    order.updatedBy = adminId;

    data.orders[orderIndex] = order;
    store.writeData(data);

    // Clear cache
    await cache.delPrefix("orders:");
    await cache.delPrefix("order_stats:");

    logger.info("Order status updated", {
      orderId,
      status,
      adminId,
    });

    return {
      success: true,
      message: "Order status updated",
      data: order,
    };
  } catch (error) {
    logger.error("Update order status error", {
      error: error.message,
      orderId,
    });
    return {
      success: false,
      message: "Failed to update order",
      code: "UPDATE_ORDER_ERROR",
    };
  }
};

/**
 * Get order statistics
 */
const getOrderStats = async (store, userId = null) => {
  try {
    const cacheKey = userId ? `order_stats:${userId}` : "order_stats:all";
    let stats = await cache.get(cacheKey);

    if (!stats) {
      const data = store.readData();
      let orders = data.orders || [];

      if (userId) {
        orders = orders.filter((o) => o.userId === userId);
      }

      stats = {
        total: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        approved: orders.filter((o) => o.status === "approved").length,
        rejected: orders.filter((o) => o.status === "rejected").length,
        totalAmount: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
      };

      await cache.set(cacheKey, stats, 600); // Cache for 10 minutes
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    logger.error("Get order stats error", { error: error.message });
    return {
      success: false,
      message: "Failed to get statistics",
      code: "STATS_ERROR",
    };
  }
};

module.exports = {
  getOrders,
  createOrder,
  updateOrderStatus,
  getOrderStats,
};
