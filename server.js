const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createDataStore } = require("./db");

const ENV_FILE = path.join(__dirname, ".env");
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

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const MAX_JSON_BODY = "256kb";
const DATA_FILE = path.join(__dirname, "data.json");
const STORAGE_DRIVER = String(process.env.STORAGE_DRIVER || "json").trim().toLowerCase();
const DB_PATH = path.join(__dirname, String(process.env.DB_PATH || "storage/gatelaunch.db"));
const STORAGE_BACKUP_ENABLED =
  String(process.env.STORAGE_BACKUP_ENABLED || "true").toLowerCase() !== "false";
const STORAGE_BACKUP_INTERVAL_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.STORAGE_BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000)
);
const STORAGE_BACKUP_DIR = path.join(
  __dirname,
  String(process.env.STORAGE_BACKUP_DIR || "storage/backups")
);
const STORAGE_BACKUP_ON_STARTUP =
  String(process.env.STORAGE_BACKUP_ON_STARTUP || "true").toLowerCase() !== "false";
const ASSETS_DIR = path.join(__dirname, "assets");
const PROOF_DIR = path.join(__dirname, "uploads", "proofs_private");
const COOKIE_NAME = "gl_session";
const isProd = process.env.NODE_ENV === "production";
const AI_SYNC_ENABLED = String(process.env.AI_SYNC_ENABLED || "true").toLowerCase() !== "false";
const AI_SYNC_INTERVAL_MS = Math.max(60 * 1000, Number(process.env.AI_SYNC_INTERVAL_MS || 5 * 60 * 1000));
const N8N_WEBHOOK_URL = String(process.env.N8N_WEBHOOK_URL || "").trim();
const N8N_WEBHOOK_SECRET = String(process.env.N8N_WEBHOOK_SECRET || "").trim();
const N8N_TIMEOUT_MS = Math.max(3000, Number(process.env.N8N_TIMEOUT_MS || 15000));
const N8N_ENABLED = Boolean(N8N_WEBHOOK_URL);

const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);
const EXTRA_ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);
const LOOPBACK_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const isAllowedOrigin = (origin) =>
  ALLOWED_ORIGINS.has(origin) || EXTRA_ALLOWED_ORIGINS.has(origin) || LOOPBACK_ORIGIN_REGEX.test(origin);

const notificationStreams = new Map();
const sessions = new Map();
const loginRateWindowMs = 15 * 60 * 1000;
const loginRateMax = 30;
const loginRate = new Map();
const aiSyncState = {
  lastRunAt: null,
  lastSignature: null,
  lastNotificationId: null,
  lastResult: null,
  engine: N8N_ENABLED ? "n8n+heuristic-fallback" : "heuristic-local",
};
const storageBackupState = {
  lastRunAt: null,
  lastFile: null,
  lastError: null,
};
const performanceSamples = [];
const performanceErrors = [];
const MAX_PERFORMANCE_SAMPLES = 5000;
const MAX_PERFORMANCE_ERRORS = 50;

const emptyData = () => ({
  users: [],
  tickets: [],
  orders: [],
  accessRequests: [],
  notifications: [],
  receipts: [],
  supportRequests: [],
});

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return "admin";
  if (value === "supervisor") return "supervisor";
  return "user";
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const titleCase = (value) =>
  String(value || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const sanitizeText = (value, max = 500) =>
  String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const store = createDataStore({
  driver: STORAGE_DRIVER,
  dbPath: DB_PATH,
  dataFile: DATA_FILE,
  emptyData,
});
const readData = () => store.readData();
const writeData = (data) => store.writeData(data);

const pbkdf2Iterations = 210000;
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, pbkdf2Iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${pbkdf2Iterations}$${salt}$${hash}`;
};

const verifyPassword = (password, encoded) => {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 100000) return false;
  const salt = parts[2];
  const expectedHex = parts[3];
  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
};

const isStrongPassword = (password) => {
  const value = String(password || "");
  if (value.length < 10 || value.length > 128) return false;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const normalizeAccessResource = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["research_vault", "security_lab", "engineering_hub"].includes(normalized)) return normalized;
  return "";
};
const normalizeAccessStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "approved", "rejected"].includes(normalized)) return normalized;
  return "";
};

const parseCookies = (req) => {
  const raw = req.headers.cookie || "";
  const result = {};
  raw.split(";").forEach((chunk) => {
    const idx = chunk.indexOf("=");
    if (idx <= 0) return;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    result[key] = decodeURIComponent(value);
  });
  return result;
};

const tokenFromRequest = (req) => {
  const cookies = parseCookies(req);
  const cookieToken = cookies[COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
};

const getSession = (req) => {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return { token, session };
};

const getUserFromRequest = (req) => {
  const sessionEntry = getSession(req);
  if (!sessionEntry) return null;
  const data = readData();
  const user = data.users.find((item) => item.id === sessionEntry.session.userId);
  return user || null;
};

const isHttpsRequest = (req) => {
  if (!req) return false;
  if (req.secure === true) return true;
  const xfProto = String(req.headers?.["x-forwarded-proto"] || "").toLowerCase();
  return xfProto.includes("https");
};

// Default: secure cookies only when actually serving over HTTPS. This keeps localhost HTTP working
// even when NODE_ENV=production.
const shouldUseSecureCookie = (req) => {
  const mode = String(process.env.COOKIE_SECURE || "auto").trim().toLowerCase();
  if (mode === "true") return true;
  if (mode === "false") return false;
  return isProd && isHttpsRequest(req);
};

const setSessionCookie = (req, res, token) => {
  const securePart = shouldUseSecureCookie(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${
      SESSION_TTL_MS / 1000
    }${securePart}`
  );
};

const clearSessionCookie = (req, res) => {
  const securePart = shouldUseSecureCookie(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${securePart}`
  );
};

const createSession = (userId) => {
  const token = crypto.randomUUID();
  sessions.set(token, {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
};

const purgeExpiredSessions = () => {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) sessions.delete(token);
  });
};
setInterval(purgeExpiredSessions, 60 * 1000).unref();

const isAdmin = (user) => normalizeRole(user?.role) === "admin";
const isStaff = (user) => {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "supervisor";
};

const loginKey = (req, email) => `${req.ip || "unknown"}|${email}`;
const enforceLoginRateLimit = (req, email) => {
  const key = loginKey(req, email);
  const now = Date.now();
  const current = loginRate.get(key);
  if (!current || now > current.resetAt) {
    loginRate.set(key, { count: 1, resetAt: now + loginRateWindowMs });
    return false;
  }
  current.count += 1;
  if (current.count > loginRateMax) return true;
  return false;
};

const purgeExpiredLoginRate = () => {
  const now = Date.now();
  loginRate.forEach((entry, key) => {
    if (!entry || now > entry.resetAt) loginRate.delete(key);
  });
};
setInterval(purgeExpiredLoginRate, 5 * 60 * 1000).unref();

const postJson = async (url, payload, headers = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};

const integrationStatus = () => ({
  telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  slack: Boolean(process.env.SLACK_WEBHOOK_URL),
  webhook: Boolean(process.env.ADMIN_WEBHOOK_URL),
  n8n: N8N_ENABLED,
  aiSync: AI_SYNC_ENABLED,
  storage: store.driver,
});

const summarizePerformance = (windowMs = 60 * 60 * 1000) => {
  const now = Date.now();
  const rows = performanceSamples.filter((item) => now - item.at <= windowMs);
  const total = rows.length;
  const success = rows.filter((item) => item.status >= 200 && item.status < 400).length;
  const errors = rows.filter((item) => item.status >= 400).length;
  const avgLatencyMs = total
    ? Math.round(rows.reduce((sum, item) => sum + item.latencyMs, 0) / total)
    : 0;
  const sorted = rows.map((item) => item.latencyMs).sort((a, b) => a - b);
  const p95LatencyMs = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.95)] : 0;
  return {
    windowMs,
    total,
    success,
    errors,
    successRate: total ? Math.round((success / total) * 100) : 100,
    avgLatencyMs,
    p95LatencyMs,
    topPaths: Object.entries(
      rows.reduce((acc, item) => {
        acc[item.path] = (acc[item.path] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count })),
  };
};

const runStorageBackup = async (reason = "scheduled") => {
  if (!STORAGE_BACKUP_ENABLED || typeof store.backup !== "function") {
    return { skipped: true, reason: "Backup disabled or unsupported driver" };
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = store.driver === "sqlite" ? ".db" : ".json";
  const backupFile = path.join(STORAGE_BACKUP_DIR, `backup-${stamp}${ext}`);
  try {
    const result = await Promise.resolve(store.backup(backupFile));
    storageBackupState.lastRunAt = new Date().toISOString();
    storageBackupState.lastFile = result?.file || backupFile;
    storageBackupState.lastError = null;
    return {
      skipped: false,
      reason,
      file: storageBackupState.lastFile,
      at: storageBackupState.lastRunAt,
    };
  } catch (error) {
    storageBackupState.lastError = error.message || "Backup failed";
    return { skipped: true, reason: storageBackupState.lastError };
  }
};

const parseIsoDate = (value) => {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : null;
};

const createdWithinHours = (value, hours) => {
  const ts = parseIsoDate(value);
  if (!ts) return false;
  return Date.now() - ts <= hours * 60 * 60 * 1000;
};

const pct = (value) => Math.max(0, Math.min(100, Math.round(value)));

const buildAiInsights = (data, user = null) => {
  const totalUsers = data.users.length;
  const totalOrders = data.orders.length;
  const totalTickets = data.tickets.length;
  const totalReceipts = data.receipts.length;
  const pendingOrders = data.orders.filter((o) => o.status === "pending").length;
  const approvedOrders = data.orders.filter((o) => o.status === "approved").length;
  const rejectedOrders = data.orders.filter((o) => o.status === "rejected").length;
  const openTickets = data.tickets.filter((t) => t.status === "open").length;
  const recentReceipts = data.receipts.filter((r) => createdWithinHours(r.createdAt, 24)).length;
  const recentOrders = data.orders.filter((o) => createdWithinHours(o.createdAt, 24)).length;
  const avgOrderAmount = totalOrders
    ? Math.round(data.orders.reduce((sum, order) => sum + Number(order.amount || 0), 0) / totalOrders)
    : 0;
  const moderationDone = approvedOrders + rejectedOrders;
  const approvalRate = moderationDone ? pct((approvedOrders / moderationDone) * 100) : 0;

  const backlogRatio = totalOrders ? pendingOrders / totalOrders : 0;
  const ticketPressure = totalTickets ? openTickets / totalTickets : 0;
  const riskScore = pct(100 - (backlogRatio * 45 + ticketPressure * 35 + Math.min(recentReceipts, 100) * 0.2));
  const healthLevel = riskScore >= 75 ? "healthy" : riskScore >= 45 ? "watch" : "critical";

  const recommendations = [];
  if (pendingOrders >= 8) recommendations.push("Increase order review throughput to reduce pending queue.");
  if (openTickets >= 6) recommendations.push("Prioritize ticket triage for SLA stability.");
  if (approvalRate < 60 && moderationDone >= 4)
    recommendations.push("Review payment quality checks to improve approval quality.");
  if (recentOrders >= 12) recommendations.push("High order velocity detected. Add a temporary reviewer shift.");
  if (recommendations.length === 0) {
    recommendations.push("Operations are stable. Keep current cadence and monitor every cycle.");
  }

  const base = {
    generatedAt: new Date().toISOString(),
    scope: isStaff(user) ? "staff" : "user",
    health: {
      score: riskScore,
      level: healthLevel,
      pendingOrders,
      openTickets,
      approvalRate,
    },
    platform: {
      users: totalUsers,
      orders: totalOrders,
      tickets: totalTickets,
      receipts: totalReceipts,
      ordersLast24h: recentOrders,
      receiptsLast24h: recentReceipts,
      avgOrderAmount,
    },
    recommendations,
  };

  if (!user || isStaff(user)) return base;

  const userOrders = data.orders.filter((o) => o.userId === user.id);
  const userReceipts = data.receipts.filter((r) => r.userId === user.id);
  const userPending = userOrders.filter((o) => o.status === "pending").length;
  const userApproved = userOrders.filter((o) => o.status === "approved").length;
  return {
    ...base,
    user: {
      orders: userOrders.length,
      receipts: userReceipts.length,
      pendingOrders: userPending,
      approvedOrders: userApproved,
      lastOrderAt: userOrders[0]?.createdAt || null,
    },
  };
};

const runAiSync = ({ source = "system", actor = null, force = false } = {}) => {
  const data = readData();
  const insights = buildAiInsights(data, null);
  const signature = `${insights.health.pendingOrders}|${insights.health.openTickets}|${insights.platform.ordersLast24h}|${insights.platform.receiptsLast24h}`;
  const nowIso = new Date().toISOString();
  const lastTs = parseIsoDate(aiSyncState.lastRunAt);
  const recentlyRan = lastTs && Date.now() - lastTs < Math.max(30 * 1000, AI_SYNC_INTERVAL_MS / 2);

  if (!force && aiSyncState.lastSignature === signature && recentlyRan) {
    aiSyncState.lastResult = { skipped: true, reason: "No significant changes", at: nowIso };
    return { skipped: true, reason: "No significant changes", insights };
  }

  const notification = pushAdminNotification(data, {
    type: "ai_sync_report",
    title: "AI Sync Report",
    message: `Health ${insights.health.level.toUpperCase()} | pending orders ${insights.health.pendingOrders} | open tickets ${insights.health.openTickets}`,
    details: {
      source,
      triggeredBy: actor?.email || "system",
      healthScore: insights.health.score,
      approvalRate: `${insights.health.approvalRate}%`,
      pendingOrders: insights.health.pendingOrders,
      openTickets: insights.health.openTickets,
      generatedAt: insights.generatedAt,
    },
  });
  writeData(data);

  aiSyncState.lastRunAt = nowIso;
  aiSyncState.lastSignature = signature;
  aiSyncState.lastNotificationId = notification.id;
  aiSyncState.lastResult = { skipped: false, at: nowIso, notificationId: notification.id };
  return { skipped: false, notification, insights };
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const postToN8n = async (eventType, payload = {}) => {
  if (!N8N_ENABLED) throw new Error("n8n webhook is not configured");
  const response = await fetchWithTimeout(
    N8N_WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_WEBHOOK_SECRET ? { "x-n8n-secret": N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        eventType,
        sentAt: new Date().toISOString(),
        payload,
      }),
    },
    N8N_TIMEOUT_MS
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `n8n HTTP ${response.status}`);
  return body;
};

const localAssistantReply = (message, user, insights) => {
  const text = String(message || "").trim().toLowerCase();
  const lines = [];
  if (!text) {
    lines.push("Write your question and I will help with payments, orders, and support flow.");
  }
  if (text.includes("status") || text.includes("health") || text.includes("حالة")) {
    lines.push(
      `Current platform health is ${insights.health.level} (${insights.health.score}/100).`
    );
  }
  if (text.includes("payment") || text.includes("دفع") || text.includes("wallet")) {
    lines.push(
      "InstaPay transfers use 01147794004. All other wallets use 01143813016. Upload proof before confirm."
    );
  }
  if (text.includes("order") || text.includes("طلب") || text.includes("top-up")) {
    lines.push(
      `Pending orders: ${insights.health.pendingOrders}. Open tickets: ${insights.health.openTickets}.`
    );
  }
  if (lines.length === 0) {
    lines.push(
      `I can help with payments, order tracking, and support. Current health score: ${insights.health.score}/100.`
    );
  }
  if (insights.recommendations?.length) {
    lines.push(`Recommendation: ${insights.recommendations[0]}`);
  }
  return {
    answer: lines.join(" "),
    source: "local-fallback",
  };
};

const telegramApi = async (method, payload = null) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram token is not configured");
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const hasPayload = payload && typeof payload === "object";
  const response = await fetchWithTimeout(url, {
    method: hasPayload ? "POST" : "GET",
    headers: hasPayload ? { "Content-Type": "application/json" } : undefined,
    body: hasPayload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    throw new Error(body.description || `Telegram API HTTP ${response.status}`);
  }
  return body.result;
};

const dispatchExternalNotification = async (notification) => {
  const status = integrationStatus();
  const details = Object.entries(notification.details || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const text = `${notification.title}\n${notification.message}${details ? `\n${details}` : ""}`;
  const results = [];

  if (status.telegram) {
    try {
      await telegramApi("sendMessage", {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
      });
      results.push({ provider: "telegram", ok: true });
    } catch (error) {
      results.push({ provider: "telegram", ok: false, error: error.message });
    }
  }
  if (status.slack) {
    try {
      await postJson(process.env.SLACK_WEBHOOK_URL, { text });
      results.push({ provider: "slack", ok: true });
    } catch (error) {
      results.push({ provider: "slack", ok: false, error: error.message });
    }
  }
  if (status.webhook) {
    try {
      await postJson(
        process.env.ADMIN_WEBHOOK_URL,
        { notification },
        process.env.ADMIN_WEBHOOK_SECRET
          ? { "x-admin-webhook-secret": process.env.ADMIN_WEBHOOK_SECRET }
          : {}
      );
      results.push({ provider: "webhook", ok: true });
    } catch (error) {
      results.push({ provider: "webhook", ok: false, error: error.message });
    }
  }
  if (status.n8n) {
    try {
      await postToN8n("admin_notification", { notification, text });
      results.push({ provider: "n8n", ok: true });
    } catch (error) {
      results.push({ provider: "n8n", ok: false, error: error.message });
    }
  }
  return results;
};

const broadcastNotification = (notification) => {
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  notificationStreams.forEach((stream) => {
    stream.write(payload);
  });
};

const pushAdminNotification = (data, payload) => {
  const notification = {
    id: crypto.randomUUID(),
    scope: "admin",
    read: false,
    createdAt: new Date().toISOString(),
    ...payload,
  };
  data.notifications.unshift(notification);
  broadcastNotification(notification);
  dispatchExternalNotification(notification).catch(() => {});
  return notification;
};

const canAccessProof = (user, fileName, data) => {
  if (isStaff(user)) return true;
  const belongsToOrder = data.orders.some(
    (o) => o.userId === user.id && String(o.proofUrl || "").endsWith(`/${fileName}`)
  );
  if (belongsToOrder) return true;
  return data.receipts.some(
    (r) => r.userId === user.id && String(r.proofUrl || "").endsWith(`/${fileName}`)
  );
};

const requireAuth = (req, res, next) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
};

app.disable("x-powered-by");
app.use(express.json({ limit: MAX_JSON_BODY }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (!isAllowedOrigin(origin)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Filename, X-Filetype");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const ended = process.hrtime.bigint();
    const latencyMs = Number((ended - started) / 1000000n);
    const row = {
      at: Date.now(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs,
    };
    performanceSamples.push(row);
    if (performanceSamples.length > MAX_PERFORMANCE_SAMPLES) {
      performanceSamples.splice(0, performanceSamples.length - MAX_PERFORMANCE_SAMPLES);
    }
    if (res.statusCode >= 400) {
      performanceErrors.unshift({
        at: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        latencyMs,
      });
      if (performanceErrors.length > MAX_PERFORMANCE_ERRORS) {
        performanceErrors.splice(MAX_PERFORMANCE_ERRORS);
      }
    }
  });
  next();
});

app.use("/assets", express.static(ASSETS_DIR, { fallthrough: false }));
app.get("/styles.css", (req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/app.js", (req, res) => res.sendFile(path.join(__dirname, "app.js")));
app.get("/", (req, res) => res.redirect("/index.html"));
const sendPage = (name) => (req, res) => res.sendFile(path.join(__dirname, name));
[
  "index.html",
  "landing.html",
  "dashboard.html",
  "admin.html",
  "help.html",
  "payment-instapay.html",
  "payment-vodafone.html",
  "payment-orange.html",
  "payment-etisalat.html",
  "payment-fawry.html",
  "payment-meeza.html",
].forEach((page) => {
  app.get(`/${page}`, sendPage(page));
});

const ensureBootstrapAdmin = () => {
  const email = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
  if (!email || !password) return;
  const data = readData();
  let user = data.users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: "System Admin",
      email,
      role: "admin",
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
  } else {
    user.role = "admin";
    if (!user.passwordHash) user.passwordHash = hashPassword(password);
  }
  writeData(data);
};
ensureBootstrapAdmin();

const ensureDemoUsers = () => {
  const defaultDemoSeed = process.env.NODE_ENV === "production" ? "false" : "true";
  const enabled = String(process.env.DEMO_SEED_USERS || defaultDemoSeed).toLowerCase() !== "false";
  if (!enabled) return;
  const data = readData();
  const seeds = [
    {
      email: "admin.demo@university.edu",
      name: "Demo Admin",
      role: "admin",
      password: "admin1234",
    },
    {
      email: "supervisor.demo@university.edu",
      name: "Demo Supervisor",
      role: "supervisor",
      password: "Supervisor1234",
    },
    {
      email: "user.demo@university.edu",
      name: "Demo User",
      role: "user",
      password: "User123456",
    },
  ];

  let changed = false;
  seeds.forEach((seed) => {
    const email = normalizeEmail(seed.email);
    let user = data.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: seed.name,
        email,
        role: seed.role,
        passwordHash: hashPassword(seed.password),
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      changed = true;
      return;
    }
    const nextRole = normalizeRole(user.role || seed.role);
    if (user.role !== nextRole) {
      user.role = nextRole;
      changed = true;
    }
    if (!user.passwordHash) {
      user.passwordHash = hashPassword(seed.password);
      changed = true;
    }
  });

  if (changed) writeData(data);
};
ensureDemoUsers();

app.post("/api/public/assistant", async (req, res) => {
  const message = sanitizeText(req.body?.message, 800);
  const scope = String(req.body?.scope || "landing").trim().toLowerCase();
  if (!message || message.length > 800) {
    return res.status(400).json({ error: "Invalid message" });
  }
  if (!["landing", "public"].includes(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  const data = readData();
  const insights = buildAiInsights(data, null);
  if (N8N_ENABLED) {
    try {
      const n8nResult = await postToN8n("public_assistant_chat", {
        message,
        scope,
        insights: {
          health: insights.health,
          platform: insights.platform,
        },
      });
      const answer =
        String(n8nResult.answer || n8nResult.message || "").trim() ||
        localAssistantReply(message, null, insights).answer;
      return res.json({ answer, source: "n8n-public" });
    } catch (error) {
      const fallback = localAssistantReply(message, null, insights);
      return res.json({
        answer: fallback.answer,
        source: "public-fallback",
        fallbackReason: error.message || "n8n failed",
      });
    }
  }
  const fallback = localAssistantReply(message, null, insights);
  return res.json({ answer: fallback.answer, source: "public-fallback" });
});

app.post("/api/public/support-request", (req, res) => {
  const name = sanitizeText(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const channel = sanitizeText(req.body?.channel || "whatsapp", 32).toLowerCase();
  const message = sanitizeText(req.body?.message, 1200);
  const source = sanitizeText(req.body?.source || "landing", 40).toLowerCase();
  if (!name || !message || !isValidEmail(email)) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["whatsapp", "phone", "email"].includes(channel)) {
    return res.status(400).json({ error: "Invalid contact channel" });
  }

  const data = readData();
  const request = {
    id: crypto.randomUUID(),
    name,
    email,
    channel,
    message,
    source,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  data.supportRequests.unshift(request);
  pushAdminNotification(data, {
    type: "public_support_request",
    title: "New landing support request",
    message: `${name} submitted a new support request`,
    details: {
      requestId: request.id,
      name: request.name,
      email: request.email,
      channel: request.channel,
      source: request.source,
      message: request.message,
    },
  });
  writeData(data);
  return res.json({ request });
});

app.post("/api/signup", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const requestedName = String(req.body?.name || "").trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email" });
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Password must be 10+ chars with upper/lower/digit" });
  }
  if (enforceLoginRateLimit(req, email)) return res.status(429).json({ error: "Too many attempts" });

  const data = readData();
  const existing = data.users.find((u) => u.email === email);
  if (existing && existing.passwordHash) {
    return res.status(409).json({ error: "Email already registered" });
  }
  if (existing && !existing.passwordHash) {
    existing.passwordHash = hashPassword(password);
    existing.role = normalizeRole(existing.role);
    if (!existing.name) existing.name = titleCase(requestedName || email.split("@")[0]);
    writeData(data);
    const token = createSession(existing.id);
    setSessionCookie(req, res, token);
    return res.json({
      user: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
      },
    });
  }
  const nameSource = requestedName || email.split("@")[0].replace(/[._-]/g, " ");
  const user = {
    id: crypto.randomUUID(),
    name: titleCase(nameSource || "User"),
    email,
    role: "user",
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  writeData(data);

  const token = createSession(user.id);
  setSessionCookie(req, res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post("/api/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!isValidEmail(email) || password.length < 1) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  if (enforceLoginRateLimit(req, email)) return res.status(429).json({ error: "Too many attempts" });

  const data = readData();
  const user = data.users.find((u) => u.email === email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createSession(user.id);
  setSessionCookie(req, res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: normalizeRole(user.role) } });
});

app.post("/api/logout", (req, res) => {
  const sessionEntry = getSession(req);
  if (sessionEntry) sessions.delete(sessionEntry.token);
  clearSessionCookie(req, res);
  res.json({ success: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    },
  });
});

app.get("/api/tickets", requireAuth, (req, res) => {
  const data = readData();
  const tickets = isStaff(req.user)
    ? data.tickets
    : data.tickets.filter((ticket) => ticket.userId === req.user.id);
  res.json({ tickets });
});

app.post("/api/tickets", requireAuth, (req, res) => {
  const title = String(req.body?.title || "").trim();
  const priority = ["high", "medium", "low"].includes(req.body?.priority) ? req.body.priority : "medium";
  if (!title) return res.status(400).json({ error: "Title required" });

  const data = readData();
  const ticket = {
    id: crypto.randomUUID(),
    title,
    priority,
    status: "open",
    createdAt: new Date().toISOString(),
    userId: req.user.id,
  };
  data.tickets.unshift(ticket);
  pushAdminNotification(data, {
    type: "ticket_created",
    title: "New support ticket",
    message: `${req.user.name} created a ticket: ${ticket.title}`,
    details: {
      ticketId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      createdBy: req.user.name,
      email: req.user.email,
    },
  });
  writeData(data);
  res.json({ ticket });
});

app.patch("/api/tickets/:id", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const data = readData();
  const ticket = data.tickets.find((item) => item.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  ticket.status = req.body?.status === "closed" ? "closed" : "open";
  writeData(data);
  res.json({ ticket });
});

app.get("/api/access-requests", requireAuth, (req, res) => {
  const data = readData();
  data.accessRequests = Array.isArray(data.accessRequests) ? data.accessRequests : [];
  const accessRequests = isStaff(req.user)
    ? data.accessRequests
    : data.accessRequests.filter((item) => item.userId === req.user.id);
  res.json({ accessRequests });
});

app.post("/api/access-requests", requireAuth, (req, res) => {
  const resource = normalizeAccessResource(req.body?.resource);
  const useCase = sanitizeText(req.body?.useCase, 240);
  const duration = sanitizeText(req.body?.duration || "single_task", 40);
  if (!resource || !useCase) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const data = readData();
  data.accessRequests = Array.isArray(data.accessRequests) ? data.accessRequests : [];
  const accessRequest = {
    id: crypto.randomUUID(),
    resource,
    useCase,
    duration,
    status: "pending",
    createdAt: new Date().toISOString(),
    userId: req.user.id,
  };
  data.accessRequests.unshift(accessRequest);
  pushAdminNotification(data, {
    type: "access_request_created",
    title: "New access request",
    message: `${req.user.name} requested ${resource}`,
    details: {
      accessRequestId: accessRequest.id,
      resource: accessRequest.resource,
      useCase: accessRequest.useCase,
      duration: accessRequest.duration,
      createdBy: req.user.name,
      email: req.user.email,
    },
  });
  writeData(data);
  res.json({ accessRequest });
});

app.patch("/api/access-requests/:id", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const nextStatus = normalizeAccessStatus(req.body?.status);
  if (!nextStatus) return res.status(400).json({ error: "Invalid status" });

  const data = readData();
  data.accessRequests = Array.isArray(data.accessRequests) ? data.accessRequests : [];
  const accessRequest = data.accessRequests.find((item) => item.id === req.params.id);
  if (!accessRequest) return res.status(404).json({ error: "Access request not found" });

  accessRequest.status = nextStatus;
  accessRequest.reviewedAt = new Date().toISOString();
  accessRequest.reviewedBy = req.user.id;
  writeData(data);
  res.json({ accessRequest });
});

app.get("/api/orders", requireAuth, (req, res) => {
  const data = readData();
  const orders = isStaff(req.user)
    ? data.orders
    : data.orders.filter((order) => order.userId === req.user.id);
  res.json({ orders });
});

app.post("/api/orders", requireAuth, (req, res) => {
  const game = String(req.body?.game || "").trim();
  const playerId = String(req.body?.playerId || "").trim();
  const wallet = String(req.body?.wallet || "").trim().toLowerCase();
  const sender = String(req.body?.sender || "").trim();
  const paymentRef = String(req.body?.paymentRef || "").trim();
  const proofUrl = String(req.body?.proofUrl || "").trim();
  const amount = Number(req.body?.amount);

  const allowedWallets = new Set(["vodafone_cash", "orange_cash", "etisalat_cash", "instapay", "fawry"]);
  if (!game || !playerId || !sender || !paymentRef || !proofUrl || !allowedWallets.has(wallet)) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
  if (!proofUrl.startsWith("/api/uploads/proof/")) {
    return res.status(400).json({ error: "Invalid proof reference" });
  }

  const data = readData();
  const order = {
    id: crypto.randomUUID(),
    game,
    playerId,
    amount,
    wallet,
    sender,
    paymentRef,
    proofUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
    userId: req.user.id,
  };
  data.orders.unshift(order);
  pushAdminNotification(data, {
    type: "order_created",
    title: "New game top-up order",
    message: `${req.user.name} submitted ${order.game} order for ${order.amount} EGP`,
    details: {
      orderId: order.id,
      game: order.game,
      playerId: order.playerId,
      amount: order.amount,
      wallet: order.wallet,
      sender: order.sender,
      paymentRef: order.paymentRef,
      createdBy: req.user.name,
      email: req.user.email,
    },
  });
  writeData(data);
  res.json({ order });
});

app.patch("/api/orders/:id", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const nextStatus = String(req.body?.status || "");
  if (!["pending", "approved", "rejected"].includes(nextStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const data = readData();
  const order = data.orders.find((item) => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = nextStatus;
  order.reviewedAt = new Date().toISOString();
  writeData(data);
  res.json({ order });
});

app.post("/api/uploads/proof", requireAuth, express.raw({ type: "*/*", limit: "4mb" }), (req, res) => {
  const raw = req.body;
  if (!raw || !raw.length) return res.status(400).json({ error: "Empty file" });
  const originalName = String(req.headers["x-filename"] || "proof.bin");
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : null;
  if (!safeExt) return res.status(400).json({ error: "Unsupported file type" });

  fs.mkdirSync(PROOF_DIR, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
  const filePath = path.join(PROOF_DIR, fileName);
  fs.writeFileSync(filePath, raw);
  res.json({ fileUrl: `/api/uploads/proof/${fileName}` });
});

app.get("/api/uploads/proof/:fileName", requireAuth, (req, res) => {
  const fileName = String(req.params.fileName || "");
  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(fileName)) {
    return res.status(400).json({ error: "Invalid file name" });
  }
  const data = readData();
  if (!canAccessProof(req.user, fileName, data)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const fullPath = path.join(PROOF_DIR, fileName);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Not found" });
  res.sendFile(fullPath);
});

app.post("/api/payment-receipts", requireAuth, (req, res) => {
  const amount = Number(req.body?.amount);
  const method = String(req.body?.method || "instapay").trim().toLowerCase();
  const allowedMethods = new Set(["vodafone_cash", "orange_cash", "etisalat_cash", "instapay", "fawry"]);
  const receipt = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    method,
    receiver: String(req.body?.receiver || "").trim(),
    sender: String(req.body?.sender || "").trim(),
    amount,
    paymentRef: String(req.body?.paymentRef || "").trim(),
    note: String(req.body?.note || "").trim(),
    proofUrl: String(req.body?.proofUrl || "").trim(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  if (!receipt.receiver || !receipt.sender || !receipt.paymentRef || !receipt.proofUrl) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!allowedMethods.has(receipt.method)) {
    return res.status(400).json({ error: "Invalid payment method" });
  }
  if (!Number.isFinite(receipt.amount) || receipt.amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (!receipt.proofUrl.startsWith("/api/uploads/proof/")) {
    return res.status(400).json({ error: "Invalid proof reference" });
  }

  const data = readData();
  data.receipts.unshift(receipt);
  pushAdminNotification(data, {
    type: "payment_receipt_created",
    title: "New payment receipt",
    message: `${req.user.name} submitted a payment receipt (${receipt.amount} EGP)`,
    details: {
      receiptId: receipt.id,
      amount: receipt.amount,
      sender: receipt.sender,
      paymentRef: receipt.paymentRef,
      createdBy: req.user.name,
      email: req.user.email,
    },
  });
  writeData(data);
  res.json({ receipt });
});

app.get("/api/payment-receipts", requireAuth, (req, res) => {
  const data = readData();
  const receipts = isStaff(req.user)
    ? data.receipts
    : data.receipts.filter((item) => item.userId === req.user.id);
  res.json({ receipts });
});

app.get("/api/notifications", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const data = readData();
  res.json({ notifications: data.notifications.filter((item) => item.scope === "admin") });
});

app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const data = readData();
  const item = data.notifications.find((n) => n.id === req.params.id && n.scope === "admin");
  if (!item) return res.status(404).json({ error: "Notification not found" });
  item.read = true;
  item.readAt = new Date().toISOString();
  writeData(data);
  res.json({ notification: item });
});

app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ error: "Forbidden" });
  const data = readData();
  const now = new Date().toISOString();
  data.notifications.forEach((item) => {
    if (item.scope === "admin") {
      item.read = true;
      item.readAt = now;
    }
  });
  writeData(data);
  res.json({ success: true });
});

app.get("/api/notifications/stream", requireAuth, (req, res) => {
  if (!isStaff(req.user)) return res.status(403).end();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write("event: ready\ndata: connected\n\n");

  const streamId = crypto.randomUUID();
  notificationStreams.set(streamId, res);
  const heartbeat = setInterval(() => {
    res.write("event: ping\ndata: keepalive\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    notificationStreams.delete(streamId);
  });
});

app.get("/api/integrations/status", requireAuth, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  res.json({ integrations: integrationStatus() });
});

app.get("/api/integrations/telegram/check", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(400).json({
      error: "Telegram integration is not configured",
      configured: false,
    });
  }
  try {
    const bot = await telegramApi("getMe");
    let chat = null;
    try {
      chat = await telegramApi("getChat", { chat_id: chatId });
    } catch (error) {
      chat = { reachable: false, error: error.message };
    }
    return res.json({
      configured: true,
      bot: {
        id: bot?.id,
        username: bot?.username || null,
        name: bot?.first_name || null,
      },
      chat: chat
        ? {
            id: chat.id || chatId,
            title: chat.title || chat.username || chat.first_name || null,
            type: chat.type || null,
            reachable: chat.reachable !== false,
            error: chat.error || null,
          }
        : null,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Telegram check failed",
      configured: true,
    });
  }
});

app.get("/api/integrations/n8n/check", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  if (!N8N_ENABLED) {
    return res.status(400).json({
      configured: false,
      error: "n8n webhook is not configured",
    });
  }
  try {
    const result = await postToN8n("health_check", {
      by: req.user.email,
      role: normalizeRole(req.user.role),
    });
    return res.json({
      configured: true,
      reachable: true,
      result,
    });
  } catch (error) {
    return res.status(400).json({
      configured: true,
      reachable: false,
      error: error.message || "n8n check failed",
    });
  }
});

app.post("/api/integrations/telegram/test", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(400).json({ error: "Telegram integration is not configured" });
  }
  const text =
    String(req.body?.text || "").trim() ||
    `GateLaunch test message - ${new Date().toISOString()}`;
  try {
    const sent = await telegramApi("sendMessage", {
      chat_id: chatId,
      text,
    });
    return res.json({
      success: true,
      messageId: sent?.message_id || null,
      chatId,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Telegram test failed" });
  }
});

app.post("/api/integrations/test", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const fake = {
    id: crypto.randomUUID(),
    title: "Integration test",
    message: `Manual test triggered by ${req.user.name}`,
    details: { at: new Date().toISOString(), by: req.user.email },
  };
  const results = await dispatchExternalNotification(fake);
  res.json({ results });
});

app.post("/api/ai/assistant", requireAuth, async (req, res) => {
  const message = sanitizeText(req.body?.message, 1200);
  const scope = sanitizeText(req.body?.scope || "dashboard", 40).toLowerCase();
  const allowedScopes = new Set(["dashboard", "admin", "landing"]);
  if (!message || message.length > 1200) {
    return res.status(400).json({ error: "Invalid message" });
  }
  if (!allowedScopes.has(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  const data = readData();
  const insights = buildAiInsights(data, req.user);
  if (N8N_ENABLED) {
    try {
      const n8nResult = await postToN8n("assistant_chat", {
        message,
        scope,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: normalizeRole(req.user.role),
          name: req.user.name,
        },
        insights,
      });
      const answer =
        String(n8nResult.answer || n8nResult.message || "").trim() ||
        localAssistantReply(message, req.user, insights).answer;
      return res.json({
        answer,
        source: "n8n",
        raw: n8nResult,
      });
    } catch (error) {
      const fallback = localAssistantReply(message, req.user, insights);
      return res.json({
        answer: fallback.answer,
        source: fallback.source,
        fallbackReason: error.message || "n8n call failed",
      });
    }
  }

  const fallback = localAssistantReply(message, req.user, insights);
  return res.json({
    answer: fallback.answer,
    source: fallback.source,
  });
});

app.get("/api/ai/status", requireAuth, (req, res) => {
  res.json({
    aiSync: {
      enabled: AI_SYNC_ENABLED,
      intervalMs: AI_SYNC_INTERVAL_MS,
      lastRunAt: aiSyncState.lastRunAt,
      lastNotificationId: aiSyncState.lastNotificationId,
      engine: aiSyncState.engine,
      lastResult: aiSyncState.lastResult,
    },
  });
});

app.get("/api/ai/insights", requireAuth, (req, res) => {
  const data = readData();
  const insights = buildAiInsights(data, req.user);
  res.json({ insights });
});

app.post("/api/ai/sync", requireAuth, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  if (!AI_SYNC_ENABLED) return res.status(400).json({ error: "AI sync disabled" });
  const force = req.body?.force === true;
  const result = runAiSync({ source: "manual", actor: req.user, force });
  res.json(result);
});

app.get("/api/storage/health", requireAuth, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const data = readData();
  const storageFile = String(store.info?.file || DATA_FILE);
  const exists = fs.existsSync(storageFile);
  let sizeBytes = 0;
  try {
    sizeBytes = exists ? fs.statSync(storageFile).size : 0;
  } catch (error) {
    sizeBytes = 0;
  }
  let backupDirWritable = false;
  try {
    fs.mkdirSync(STORAGE_BACKUP_DIR, { recursive: true });
    fs.accessSync(STORAGE_BACKUP_DIR, fs.constants.W_OK);
    backupDirWritable = true;
  } catch (error) {
    backupDirWritable = false;
  }

  res.json({
    storage: {
      driver: store.driver,
      file: storageFile,
      exists,
      sizeBytes,
      backup: {
        enabled: STORAGE_BACKUP_ENABLED,
        intervalMs: STORAGE_BACKUP_INTERVAL_MS,
        dir: STORAGE_BACKUP_DIR,
        writable: backupDirWritable,
        lastRunAt: storageBackupState.lastRunAt,
        lastFile: storageBackupState.lastFile,
        lastError: storageBackupState.lastError,
      },
      records: {
        users: data.users.length,
        tickets: data.tickets.length,
        orders: data.orders.length,
        accessRequests: Array.isArray(data.accessRequests) ? data.accessRequests.length : 0,
        notifications: data.notifications.length,
        receipts: data.receipts.length,
        supportRequests: data.supportRequests.length,
      },
    },
  });
});

app.post("/api/storage/backup", requireAuth, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const result = await runStorageBackup("manual");
  if (result.skipped) return res.status(400).json(result);
  return res.json(result);
});

app.get("/api/metrics/performance", requireAuth, (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  const oneHour = summarizePerformance(60 * 60 * 1000);
  const fiveMin = summarizePerformance(5 * 60 * 1000);
  res.json({
    performance: {
      oneHour,
      fiveMin,
      recentErrors: performanceErrors.slice(0, 10),
      sampleCount: performanceSamples.length,
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (AI_SYNC_ENABLED) {
  setInterval(() => {
    try {
      runAiSync({ source: "auto" });
    } catch (error) {}
  }, AI_SYNC_INTERVAL_MS).unref();
  setTimeout(() => {
    try {
      runAiSync({ source: "startup" });
    } catch (error) {}
  }, 8000).unref();
}

if (STORAGE_BACKUP_ENABLED) {
  setInterval(() => {
    runStorageBackup("scheduled").catch(() => {});
  }, STORAGE_BACKUP_INTERVAL_MS).unref();
  if (STORAGE_BACKUP_ON_STARTUP) {
    setTimeout(() => {
      runStorageBackup("startup").catch(() => {});
    }, 12000).unref();
  }
}

app.listen(PORT, () => {
  console.log(`GateLaunch running at http://localhost:${PORT} (storage=${store.driver})`);
});
