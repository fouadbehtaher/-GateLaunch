const path = require("path");
const fs = require("fs");

// Load environment variables
const ENV_FILE = path.join(__dirname, "../../.env");
if (fs.existsSync(ENV_FILE)) {
  const lines = fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

const config = {
  // App settings
  app: {
    name: "GateLaunch",
    version: "2.0.0",
    env: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    isProd: process.env.NODE_ENV === "production",
  },

  // Security settings
  security: {
    jwtSecret: process.env.JWT_SECRET || "change-this-secret-in-production",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    sessionTtlMs: 1000 * 60 * 60 * 12, // 12 hours
    cookieName: "gl_session",
    maxJsonBody: "256kb",
    pbkdf2Iterations: 310000,
    rateLimitWindowMs: 15 * 60 * 1000,
    rateLimitMax: 30,
  },

  // Database settings
  database: {
    driver: String(process.env.STORAGE_DRIVER || "json").trim().toLowerCase(),
    jsonFile: path.join(__dirname, "../../", String(process.env.DATA_JSON_FILE || "data.json")),
    sqlitePath: path.join(__dirname, "../../", String(process.env.DB_PATH || "storage/gatelaunch.db")),
  },

  // Storage settings
  storage: {
    backupEnabled: String(process.env.STORAGE_BACKUP_ENABLED || "true").toLowerCase() !== "false",
    backupIntervalMs: Math.max(60 * 60 * 1000, Number(process.env.STORAGE_BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000)),
    backupDir: path.join(__dirname, "../../", String(process.env.STORAGE_BACKUP_DIR || "storage/backups")),
    backupOnStartup: String(process.env.STORAGE_BACKUP_ON_STARTUP || "true").toLowerCase() !== "false",
    assetsDir: path.join(__dirname, "../../assets"),
    proofDir: path.join(__dirname, "../../uploads", "proofs_private"),
  },

  // Redis settings (for caching)
  redis: {
    enabled: String(process.env.REDIS_ENABLED || "false").toLowerCase() === "true",
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || "",
    db: Number(process.env.REDIS_DB || 0),
    ttl: Number(process.env.REDIS_TTL || 3600), // 1 hour default
  },

  // AI/ML settings
  ai: {
    syncEnabled: String(process.env.AI_SYNC_ENABLED || "true").toLowerCase() !== "false",
    syncIntervalMs: Math.max(60 * 1000, Number(process.env.AI_SYNC_INTERVAL_MS || 5 * 60 * 1000)),
  },

  // External integrations
  integrations: {
    n8n: {
      enabled: Boolean(process.env.N8N_WEBHOOK_URL),
      webhookUrl: String(process.env.N8N_WEBHOOK_URL || "").trim(),
      secret: String(process.env.N8N_WEBHOOK_SECRET || "").trim(),
      timeoutMs: Math.max(3000, Number(process.env.N8N_TIMEOUT_MS || 15000)),
    },
    telegram: {
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      botToken: String(process.env.TELEGRAM_BOT_TOKEN || "").trim(),
      chatId: String(process.env.TELEGRAM_CHAT_ID || "").trim(),
    },
    slack: {
      enabled: Boolean(process.env.SLACK_WEBHOOK_URL),
      webhookUrl: String(process.env.SLACK_WEBHOOK_URL || "").trim(),
    },
    adminWebhook: {
      enabled: Boolean(process.env.ADMIN_WEBHOOK_URL),
      url: String(process.env.ADMIN_WEBHOOK_URL || "").trim(),
      secret: String(process.env.ADMIN_WEBHOOK_SECRET || "").trim(),
    },
  },

  // CORS settings
  cors: {
    allowedOrigins: [
      `http://localhost:${Number(process.env.PORT || 3000)}`,
      `http://127.0.0.1:${Number(process.env.PORT || 3000)}`,
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      ...String(process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ],
    loopbackRegex: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
    maxFiles: Number(process.env.LOG_MAX_FILES || 14),
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    errorLogPath: path.join(__dirname, "../../logs/error.log"),
    combinedLogPath: path.join(__dirname, "../../logs/combined.log"),
  },

  // WebSocket settings
  websocket: {
    enabled: String(process.env.WEBSOCKET_ENABLED || "true").toLowerCase() !== "false",
    path: "/ws",
    pingInterval: Number(process.env.WS_PING_INTERVAL || 30000),
    pingTimeout: Number(process.env.WS_PING_TIMEOUT || 5000),
  },
};

module.exports = config;
