const express = require("express");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const config = require("./config");
const logger = require("./utils/logger");
const cache = require("./utils/cache");
const { createDataStore } = require("../db");
const { initWebSocket, closeWebSocket } = require("./websocket");
const { ensureBootstrapAdmin, ensureDemoUsers } = require("./services/bootstrapService");

// Import routes
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const analyticsRoutes = require("./routes/analytics");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Trust proxy (for Heroku, AWS, etc.)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: config.security.maxJsonBody }));
app.use(express.urlencoded({ extended: true, limit: config.security.maxJsonBody }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed =
    config.cors.allowedOrigins.includes(origin) || config.cors.loopbackRegex.test(origin);

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Request logging
if (!config.app.isProd) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: logger.stream,
      skip: (req) => req.url === "/api/health",
    })
  );
}

// Performance tracking
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });

  next();
});

// Initialize storage
const store = createDataStore({
  driver: config.database.driver,
  dataFile: config.database.jsonFile,
  dbPath: config.database.sqlitePath,
  emptyData: () => ({
    meta: {
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    users: [],
    tickets: [],
    orders: [],
    accessRequests: [],
    notifications: [],
    receipts: [],
    supportRequests: [],
    auditLog: [],
    payments: [],
  }),
});

// Make store available to routes
app.locals.store = store;
app.locals.sessions = new Map();

// Initialize cache
cache.initRedis().catch((error) => {
  logger.warn("Redis initialization failed, using memory cache", {
    error: error.message,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: config.app.env,
    version: config.app.version,
  });
});

// API documentation
app.get("/api", (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        signup: "POST /api/auth/signup",
        refresh: "POST /api/auth/refresh",
        profile: "GET /api/auth/profile",
        updateProfile: "PATCH /api/auth/profile",
        logout: "POST /api/auth/logout",
      },
      orders: {
        list: "GET /api/orders",
        create: "POST /api/orders",
        update: "PATCH /api/orders/:id",
        stats: "GET /api/orders/stats",
      },
      analytics: {
        dashboard: "GET /api/analytics/dashboard",
        timeseries: "GET /api/analytics/timeseries",
        topGames: "GET /api/analytics/top-games",
        walletStats: "GET /api/analytics/wallet-stats",
        userActivity: "GET /api/analytics/user-activity/:userId",
      },
    },
    websocket: {
      enabled: config.websocket.enabled,
      path: config.websocket.path,
      url: `ws://localhost:${config.app.port}${config.websocket.path}?token=YOUR_JWT_TOKEN`,
    },
  });
});

// Static files
const distDir = path.join(__dirname, "..", "dist");
if (require("fs").existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      fallthrough: true,
      maxAge: config.app.isProd ? 365 * 24 * 60 * 60 * 1000 : 0,
      immutable: config.app.isProd,
    })
  );
}

app.use(express.static(path.join(__dirname, "..")));
app.use(
  "/assets",
  express.static(config.storage.assetsDir, {
    fallthrough: false,
    maxAge: config.app.isProd ? 7 * 24 * 60 * 60 * 1000 : 0,
    immutable: config.app.isProd,
  })
);

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../dashboard.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    code: "NOT_FOUND",
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.logError(err, req);

  const statusCode = err.statusCode || 500;
  const message = config.app.isProd ? "Internal server error" : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || "SERVER_ERROR",
    ...(config.app.isProd ? {} : { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Bootstrap admin if needed
    ensureBootstrapAdmin(store);
    ensureDemoUsers(store);

    // Initialize WebSocket
    initWebSocket(server);

    server.listen(config.app.port, () => {
      logger.info(`Server started successfully`, {
        port: config.app.port,
        env: config.app.env,
        version: config.app.version,
        pid: process.pid,
      });

      logger.info("Configuration loaded", {
        database: config.database.driver,
        redis: config.redis.enabled ? "enabled" : "disabled",
        websocket: config.websocket.enabled ? "enabled" : "disabled",
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutdown signal received, closing server...");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Close WebSocket connections
  closeWebSocket();

  // Close Redis connection
  await cache.closeRedis();

  setTimeout(() => {
    logger.error("Graceful shutdown timeout, forcing exit");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Uncaught exception handler
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", {
    reason,
    promise,
  });
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
