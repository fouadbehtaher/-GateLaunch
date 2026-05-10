const winston = require("winston");
const path = require("path");
const fs = require("fs");
const config = require("../config");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = "\n" + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: config.logging.combinedLogPath,
      maxsize: 20971520, // 20MB
      maxFiles: config.logging.maxFiles,
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: config.logging.errorLogPath,
      level: "error",
      maxsize: 20971520,
      maxFiles: config.logging.maxFiles,
    }),
  ],
});

// Add console transport in development
if (!config.app.isProd) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create stream for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Utility methods
logger.logRequest = (req, res, duration) => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
};

logger.logError = (error, req) => {
  logger.error("Application Error", {
    message: error.message,
    stack: error.stack,
    method: req?.method,
    url: req?.originalUrl,
    ip: req?.ip,
  });
};

logger.logAuth = (action, email, success, req) => {
  logger.info("Authentication", {
    action,
    email,
    success,
    ip: req?.ip,
  });
};

logger.logDatabase = (operation, collection, success, details = {}) => {
  logger.info("Database Operation", {
    operation,
    collection,
    success,
    ...details,
  });
};

module.exports = logger;
