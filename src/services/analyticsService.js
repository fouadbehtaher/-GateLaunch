const logger = require("../utils/logger");
const cache = require("../utils/cache");
const { percentage } = require("../utils/helpers");

/**
 * Get dashboard analytics
 */
const getDashboardAnalytics = async (store, userId = null, role = "user") => {
  try {
    const cacheKey = userId ? `analytics:dashboard:${userId}` : "analytics:dashboard:all";
    let analytics = await cache.get(cacheKey);

    if (!analytics) {
      const data = store.readData();

      // Filter data based on role
      let orders = data.orders || [];
      let tickets = data.tickets || [];
      let receipts = data.receipts || [];

      if (role !== "admin" && role !== "supervisor" && userId) {
        orders = orders.filter((o) => o.userId === userId);
        tickets = tickets.filter((t) => t.userId === userId);
        receipts = receipts.filter((r) => r.userId === userId);
      }

      // Calculate metrics
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      analytics = {
        overview: {
          totalOrders: orders.length,
          totalTickets: tickets.length,
          totalReceipts: receipts.length,
          totalUsers: role === "admin" || role === "supervisor" ? data.users.length : null,
        },
        orders: {
          total: orders.length,
          pending: orders.filter((o) => o.status === "pending").length,
          approved: orders.filter((o) => o.status === "approved").length,
          rejected: orders.filter((o) => o.status === "rejected").length,
          today: orders.filter((o) => now - o.createdAt <= oneDay).length,
          thisWeek: orders.filter((o) => now - o.createdAt <= oneWeek).length,
          thisMonth: orders.filter((o) => now - o.createdAt <= oneMonth).length,
          totalAmount: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
        },
        tickets: {
          total: tickets.length,
          open: tickets.filter((t) => t.status === "open").length,
          closed: tickets.filter((t) => t.status === "closed").length,
          highPriority: tickets.filter((t) => t.priority === "high").length,
        },
        receipts: {
          total: receipts.length,
          pending: receipts.filter((r) => r.status === "pending").length,
          approved: receipts.filter((r) => r.status === "approved").length,
          rejected: receipts.filter((r) => r.status === "rejected").length,
          totalAmount: receipts.reduce((sum, r) => sum + (r.amount || 0), 0),
        },
        performance: {
          orderApprovalRate: percentage(
            orders.filter((o) => o.status === "approved").length,
            orders.filter((o) => o.status !== "pending").length
          ),
          ticketResolutionRate: percentage(
            tickets.filter((t) => t.status === "closed").length,
            tickets.length
          ),
          averageOrderAmount:
            orders.length > 0
              ? Math.round(orders.reduce((sum, o) => sum + (o.amount || 0), 0) / orders.length)
              : 0,
        },
      };

      await cache.set(cacheKey, analytics, 300); // Cache for 5 minutes
    }

    return {
      success: true,
      data: analytics,
    };
  } catch (error) {
    logger.error("Get dashboard analytics error", { error: error.message });
    return {
      success: false,
      message: "Failed to get analytics",
      code: "ANALYTICS_ERROR",
    };
  }
};

/**
 * Get time series data for charts
 */
const getTimeSeriesData = async (store, type = "orders", period = "week") => {
  try {
    const cacheKey = `analytics:timeseries:${type}:${period}`;
    let timeSeriesData = await cache.get(cacheKey);

    if (!timeSeriesData) {
      const data = store.readData();
      let collection = [];

      switch (type) {
        case "orders":
          collection = data.orders || [];
          break;
        case "tickets":
          collection = data.tickets || [];
          break;
        case "receipts":
          collection = data.receipts || [];
          break;
        default:
          collection = [];
      }

      // Group data by time period
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let days = 7;

      if (period === "month") days = 30;
      if (period === "year") days = 365;

      timeSeriesData = [];

      for (let i = days - 1; i >= 0; i--) {
        const dayStart = now - i * oneDay;
        const dayEnd = dayStart + oneDay;

        const dayData = collection.filter(
          (item) => item.createdAt >= dayStart && item.createdAt < dayEnd
        );

        timeSeriesData.push({
          date: new Date(dayStart).toISOString().split("T")[0],
          count: dayData.length,
          amount: dayData.reduce((sum, item) => sum + (item.amount || 0), 0),
        });
      }

      await cache.set(cacheKey, timeSeriesData, 600); // Cache for 10 minutes
    }

    return {
      success: true,
      data: timeSeriesData,
    };
  } catch (error) {
    logger.error("Get time series data error", { error: error.message });
    return {
      success: false,
      message: "Failed to get time series data",
      code: "TIMESERIES_ERROR",
    };
  }
};

/**
 * Get top games/services
 */
const getTopGames = async (store, limit = 10) => {
  try {
    const cacheKey = `analytics:top_games:${limit}`;
    let topGames = await cache.get(cacheKey);

    if (!topGames) {
      const data = store.readData();
      const orders = data.orders || [];

      // Group by game
      const gameStats = {};

      orders.forEach((order) => {
        const game = order.game || "Unknown";
        if (!gameStats[game]) {
          gameStats[game] = {
            game,
            count: 0,
            totalAmount: 0,
          };
        }
        gameStats[game].count++;
        gameStats[game].totalAmount += order.amount || 0;
      });

      // Sort by count and get top N
      topGames = Object.values(gameStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      await cache.set(cacheKey, topGames, 600);
    }

    return {
      success: true,
      data: topGames,
    };
  } catch (error) {
    logger.error("Get top games error", { error: error.message });
    return {
      success: false,
      message: "Failed to get top games",
      code: "TOP_GAMES_ERROR",
    };
  }
};

/**
 * Get wallet usage statistics
 */
const getWalletStats = async (store) => {
  try {
    const cacheKey = "analytics:wallet_stats";
    let walletStats = await cache.get(cacheKey);

    if (!walletStats) {
      const data = store.readData();
      const orders = data.orders || [];

      const walletData = {};

      orders.forEach((order) => {
        const wallet = order.wallet || "Unknown";
        if (!walletData[wallet]) {
          walletData[wallet] = {
            wallet,
            count: 0,
            totalAmount: 0,
          };
        }
        walletData[wallet].count++;
        walletData[wallet].totalAmount += order.amount || 0;
      });

      walletStats = Object.values(walletData);

      await cache.set(cacheKey, walletStats, 600);
    }

    return {
      success: true,
      data: walletStats,
    };
  } catch (error) {
    logger.error("Get wallet stats error", { error: error.message });
    return {
      success: false,
      message: "Failed to get wallet statistics",
      code: "WALLET_STATS_ERROR",
    };
  }
};

/**
 * Get user activity report
 */
const getUserActivityReport = async (store, userId) => {
  try {
    const cacheKey = `analytics:user_activity:${userId}`;
    let report = await cache.get(cacheKey);

    if (!report) {
      const data = store.readData();

      const userOrders = data.orders.filter((o) => o.userId === userId);
      const userTickets = data.tickets.filter((t) => t.userId === userId);
      const userReceipts = data.receipts.filter((r) => r.userId === userId);

      report = {
        userId,
        totalOrders: userOrders.length,
        totalTickets: userTickets.length,
        totalReceipts: userReceipts.length,
        totalSpent: userOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
        lastOrderDate: userOrders.length > 0 ? Math.max(...userOrders.map((o) => o.createdAt)) : null,
        favoriteGames: userOrders
          .reduce((acc, order) => {
            const game = order.game || "Unknown";
            acc[game] = (acc[game] || 0) + 1;
            return acc;
          }, {})
      };

      await cache.set(cacheKey, report, 900); // Cache for 15 minutes
    }

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    logger.error("Get user activity report error", {
      error: error.message,
      userId,
    });
    return {
      success: false,
      message: "Failed to get user activity report",
      code: "USER_ACTIVITY_ERROR",
    };
  }
};

module.exports = {
  getDashboardAnalytics,
  getTimeSeriesData,
  getTopGames,
  getWalletStats,
  getUserActivityReport,
};
