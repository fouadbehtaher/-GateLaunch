const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CURRENT_SCHEMA_VERSION = 2;

const nowIso = () => new Date().toISOString();

const normalizeSchemaVersion = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
};

const normalizeMeta = (parsedMeta, baseMeta) => {
  const base = baseMeta && typeof baseMeta === "object" ? baseMeta : {};
  const parsed = parsedMeta && typeof parsedMeta === "object" ? parsedMeta : null;

  const schemaVersion =
    normalizeSchemaVersion(parsed?.schemaVersion) ||
    normalizeSchemaVersion(base.schemaVersion) ||
    CURRENT_SCHEMA_VERSION;

  const createdAt =
    typeof parsed?.createdAt === "string"
      ? parsed.createdAt
      : typeof base.createdAt === "string"
        ? base.createdAt
        : nowIso();

  const updatedAt =
    typeof parsed?.updatedAt === "string"
      ? parsed.updatedAt
      : typeof base.updatedAt === "string"
        ? base.updatedAt
        : createdAt;

  return {
    ...base,
    ...(parsed || {}),
    schemaVersion,
    createdAt,
    updatedAt,
  };
};

const normalizeRootData = (value, emptyData) => {
  const base = emptyData();
  const parsed = value && typeof value === "object" ? value : {};
  const ensureArray = (v) => (Array.isArray(v) ? v : []);
  const meta = normalizeMeta(parsed.meta, base.meta);

  return {
    ...base,
    meta,
    users: ensureArray(parsed.users),
    tickets: ensureArray(parsed.tickets),
    orders: ensureArray(parsed.orders),
    accessRequests: ensureArray(parsed.accessRequests),
    notifications: ensureArray(parsed.notifications),
    receipts: ensureArray(parsed.receipts),
    supportRequests: ensureArray(parsed.supportRequests),
    auditLog: ensureArray(parsed.auditLog),
    payments: ensureArray(parsed.payments),
  };
};

const toEpoch = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const safeId = (value) => String(value || "").trim() || crypto.randomUUID();

const readJsonFile = (dataFile) => {
  const file = path.resolve(dataFile);
  if (!fs.existsSync(file)) return { exists: false, file, parsed: null, error: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return { exists: true, file, parsed, error: null };
  } catch (error) {
    return { exists: true, file, parsed: null, error };
  }
};

const loadJsonData = (dataFile, emptyData) => {
  const { exists, parsed } = readJsonFile(dataFile);
  if (!exists) return emptyData();
  if (!parsed) return emptyData();
  return normalizeRootData(parsed, emptyData);
};

const createJsonStore = ({ dataFile, emptyData }) => {
  const readData = () => loadJsonData(dataFile, emptyData);
  const writeData = (data) => {
    const normalized = normalizeRootData(data, emptyData);
    normalized.meta = normalizeMeta(normalized.meta, emptyData().meta);
    normalized.meta.schemaVersion = CURRENT_SCHEMA_VERSION;
    normalized.meta.updatedAt = nowIso();
    if (!normalized.meta.createdAt) normalized.meta.createdAt = normalized.meta.updatedAt;

    const dir = path.dirname(path.resolve(dataFile));
    fs.mkdirSync(dir, { recursive: true });

    const tmp = path.join(dir, `.${path.basename(dataFile)}.${process.pid}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(normalized, null, 2));
    fs.renameSync(tmp, dataFile);
  };
  const backup = (targetFile) => {
    const source = path.resolve(dataFile);
    const target = path.resolve(targetFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(source)) {
      fs.writeFileSync(source, JSON.stringify(emptyData(), null, 2));
    }
    fs.copyFileSync(source, target);
    return { file: target, driver: "json" };
  };
  return {
    driver: "json",
    readData,
    writeData,
    backup,
    info: { driver: "json", file: dataFile },
  };
};

const createSqliteStore = ({ dbPath, dataFile, emptyData }) => {
  let BetterSqlite3;
  try {
    BetterSqlite3 = require("better-sqlite3");
  } catch (error) {
    throw new Error(
      [
        "SQLite driver requested but package `better-sqlite3` is not installed or failed to build.",
        "Fix options:",
        "- Recommended: use Node.js LTS v20 and run: npm.cmd install",
        "- Ensure Python 3.x (64-bit) is installed and available on PATH (required by node-gyp on Windows when no prebuild exists).",
        "- Ensure Visual Studio Build Tools (C++ build tools) are installed on Windows.",
        "- Or switch to JSON storage: set STORAGE_DRIVER=json",
      ].join("\n")
    );
  }

  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const db = new BetterSqlite3(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = FULL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      role TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      status TEXT,
      priority TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      wallet TEXT,
      status TEXT,
      amount REAL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      resource TEXT,
      status TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      scope TEXT,
      is_read INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      method TEXT,
      status TEXT,
      amount REAL,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      email TEXT,
      channel TEXT,
      status TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      provider TEXT,
      user_id TEXT,
      order_id TEXT,
      status TEXT,
      amount REAL,
      currency TEXT,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_user_created ON tickets(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_wallet_created ON orders(wallet, created_at);
    CREATE INDEX IF NOT EXISTS idx_access_user_created ON access_requests(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_access_status_created ON access_requests(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_scope_created ON notifications(scope, created_at);
    CREATE INDEX IF NOT EXISTS idx_receipts_user_created ON receipts(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_receipts_status_created ON receipts(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_support_email_created ON support_requests(email, created_at);
    CREATE INDEX IF NOT EXISTS idx_support_status_created ON support_requests(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_logs(actor_user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_order_created ON payments(order_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
  `);

  const readMetaRow = () => db.prepare("SELECT schema_version, data FROM meta WHERE id = 1").get();
  const writeMetaRow = (meta) => {
    const normalized = normalizeMeta(meta, emptyData().meta);
    normalized.schemaVersion = CURRENT_SCHEMA_VERSION;
    normalized.updatedAt = nowIso();
    if (!normalized.createdAt) normalized.createdAt = normalized.updatedAt;

    const schemaVersion = normalizeSchemaVersion(normalized.schemaVersion) || CURRENT_SCHEMA_VERSION;
    db.prepare(
      "INSERT INTO meta (id, schema_version, updated_at, data) VALUES (1, @schema_version, @updated_at, @data) ON CONFLICT(id) DO UPDATE SET schema_version=@schema_version, updated_at=@updated_at, data=@data"
    ).run({
      schema_version: schemaVersion,
      updated_at: toEpoch(normalized.updatedAt),
      data: JSON.stringify(normalized),
    });
    return normalized;
  };

  const ensureMeta = () => {
    const row = readMetaRow();
    if (row && row.data) return;
    const base = emptyData();
    writeMetaRow(base.meta || { schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: nowIso() });
  };
  ensureMeta();

  const countAll = () => {
    const tables = [
      "users",
      "tickets",
      "orders",
      "access_requests",
      "notifications",
      "receipts",
      "support_requests",
      "audit_logs",
      "payments",
    ];
    return tables.reduce((sum, table) => {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
      return sum + Number(row?.c || 0);
    }, 0);
  };

  const readRows = (table) =>
    db
      .prepare(`SELECT data FROM ${table} ORDER BY created_at DESC`)
      .all()
      .map((row) => {
        try {
          return JSON.parse(row.data);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

  const writeAll = db.transaction((data) => {
    const wipe = (table) => db.prepare(`DELETE FROM ${table}`).run();
    [
      "users",
      "tickets",
      "orders",
      "access_requests",
      "notifications",
      "receipts",
      "support_requests",
      "audit_logs",
      "payments",
    ].forEach(wipe);

    const insUser = db.prepare(
      "INSERT INTO users (id, email, role, created_at, data) VALUES (@id, @email, @role, @created_at, @data)"
    );
    const insTicket = db.prepare(
      "INSERT INTO tickets (id, user_id, status, priority, created_at, data) VALUES (@id, @user_id, @status, @priority, @created_at, @data)"
    );
    const insOrder = db.prepare(
      "INSERT INTO orders (id, user_id, wallet, status, amount, created_at, data) VALUES (@id, @user_id, @wallet, @status, @amount, @created_at, @data)"
    );
    const insAccessRequest = db.prepare(
      "INSERT INTO access_requests (id, user_id, resource, status, created_at, data) VALUES (@id, @user_id, @resource, @status, @created_at, @data)"
    );
    const insNotification = db.prepare(
      "INSERT INTO notifications (id, scope, is_read, created_at, data) VALUES (@id, @scope, @is_read, @created_at, @data)"
    );
    const insReceipt = db.prepare(
      "INSERT INTO receipts (id, user_id, method, status, amount, created_at, data) VALUES (@id, @user_id, @method, @status, @amount, @created_at, @data)"
    );
    const insSupport = db.prepare(
      "INSERT INTO support_requests (id, email, channel, status, created_at, data) VALUES (@id, @email, @channel, @status, @created_at, @data)"
    );
    const insAudit = db.prepare(
      "INSERT INTO audit_logs (id, actor_user_id, action, created_at, data) VALUES (@id, @actor_user_id, @action, @created_at, @data)"
    );
    const insPayment = db.prepare(
      "INSERT INTO payments (id, provider, user_id, order_id, status, amount, currency, created_at, data) VALUES (@id, @provider, @user_id, @order_id, @status, @amount, @currency, @created_at, @data)"
    );

    (data.users || []).forEach((item) =>
      insUser.run({
        id: safeId(item.id),
        email: String(item.email || "").trim().toLowerCase(),
        role: String(item.role || "user"),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.tickets || []).forEach((item) =>
      insTicket.run({
        id: safeId(item.id),
        user_id: String(item.userId || ""),
        status: String(item.status || "open"),
        priority: String(item.priority || "medium"),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.orders || []).forEach((item) =>
      insOrder.run({
        id: safeId(item.id),
        user_id: String(item.userId || ""),
        wallet: String(item.wallet || ""),
        status: String(item.status || "pending"),
        amount: Number(item.amount || 0),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.accessRequests || []).forEach((item) =>
      insAccessRequest.run({
        id: safeId(item.id),
        user_id: String(item.userId || ""),
        resource: String(item.resource || ""),
        status: String(item.status || "pending"),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.notifications || []).forEach((item) =>
      insNotification.run({
        id: safeId(item.id),
        scope: String(item.scope || "admin"),
        is_read: item.read ? 1 : 0,
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.receipts || []).forEach((item) =>
      insReceipt.run({
        id: safeId(item.id),
        user_id: String(item.userId || ""),
        method: String(item.method || ""),
        status: String(item.status || "pending"),
        amount: Number(item.amount || 0),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.supportRequests || []).forEach((item) =>
      insSupport.run({
        id: safeId(item.id),
        email: String(item.email || "").trim().toLowerCase(),
        channel: String(item.channel || "whatsapp"),
        status: String(item.status || "new"),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.auditLog || []).forEach((item) =>
      insAudit.run({
        id: safeId(item.id),
        actor_user_id: String(item.actorId || ""),
        action: String(item.action || ""),
        created_at: toEpoch(item.at || item.createdAt),
        data: JSON.stringify(item),
      })
    );
    (data.payments || []).forEach((item) =>
      insPayment.run({
        id: safeId(item.id),
        provider: String(item.provider || "stripe"),
        user_id: String(item.userId || ""),
        order_id: String(item.orderId || ""),
        status: String(item.status || "created"),
        amount: Number(item.amount || 0),
        currency: String(item.currency || "egp"),
        created_at: toEpoch(item.createdAt),
        data: JSON.stringify(item),
      })
    );
  });

  const migrateIfNeeded = () => {
    if (countAll() > 0) return;
    const jsonData = loadJsonData(dataFile, emptyData);
    writeAll(jsonData);
  };
  migrateIfNeeded();

  const readData = () => {
    let meta = null;
    const row = readMetaRow();
    if (row && row.data) {
      try {
        meta = JSON.parse(row.data);
      } catch (error) {
        meta = null;
      }
    }
    const normalizedMeta = normalizeMeta(meta, emptyData().meta);
    return {
      meta: normalizedMeta,
      users: readRows("users"),
      tickets: readRows("tickets"),
      orders: readRows("orders"),
      accessRequests: readRows("access_requests"),
      notifications: readRows("notifications"),
      receipts: readRows("receipts"),
      supportRequests: readRows("support_requests"),
      auditLog: readRows("audit_logs"),
      payments: readRows("payments"),
    };
  };

  const writeData = (data) => {
    const normalized = normalizeRootData(data, emptyData);
    normalized.meta = writeMetaRow(normalized.meta);

    writeAll({
      users: Array.isArray(normalized.users) ? normalized.users : [],
      tickets: Array.isArray(normalized.tickets) ? normalized.tickets : [],
      orders: Array.isArray(normalized.orders) ? normalized.orders : [],
      accessRequests: Array.isArray(normalized.accessRequests) ? normalized.accessRequests : [],
      notifications: Array.isArray(normalized.notifications) ? normalized.notifications : [],
      receipts: Array.isArray(normalized.receipts) ? normalized.receipts : [],
      supportRequests: Array.isArray(normalized.supportRequests) ? normalized.supportRequests : [],
      auditLog: Array.isArray(normalized.auditLog) ? normalized.auditLog : [],
      payments: Array.isArray(normalized.payments) ? normalized.payments : [],
    });
  };

  const backup = (targetFile) => {
    const target = path.resolve(targetFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (typeof db.backup === "function") {
      return db.backup(target).then(() => ({ file: target, driver: "sqlite" }));
    }
    fs.copyFileSync(resolvedPath, target);
    return { file: target, driver: "sqlite" };
  };

  return {
    driver: "sqlite",
    readData,
    writeData,
    backup,
    info: { driver: "sqlite", file: resolvedPath },
  };
};

const createDataStore = ({ driver, dbPath, dataFile, emptyData }) => {
  const value = String(driver || "json").trim().toLowerCase();
  if (value === "sqlite") {
    try {
      return createSqliteStore({ dbPath, dataFile, emptyData });
    } catch (error) {
      const allowFallback =
        String(process.env.ALLOW_SQLITE_FALLBACK || "").trim().toLowerCase() === "true" ||
        String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production";
      if (!allowFallback) throw error;
      // eslint-disable-next-line no-console
      console.warn(`SQLite unavailable, falling back to JSON store: ${error.message}`);
      const store = createJsonStore({ dataFile, emptyData });
      store.info = { ...(store.info || {}), sqliteFallback: true, reason: error.message };
      return store;
    }
  }
  const store = createJsonStore({ dataFile, emptyData });
  const jsonState = readJsonFile(dataFile);
  if (jsonState.exists && jsonState.parsed) {
    const parsedMeta = jsonState.parsed.meta && typeof jsonState.parsed.meta === "object" ? jsonState.parsed.meta : null;
    const parsedVersion = normalizeSchemaVersion(parsedMeta?.schemaVersion) || 1;
    const normalized = normalizeRootData(jsonState.parsed, emptyData);
    const normalizedVersion = normalizeSchemaVersion(normalized.meta?.schemaVersion) || CURRENT_SCHEMA_VERSION;
    const shouldWrite = !parsedMeta || parsedVersion !== normalizedVersion;
    if (shouldWrite) {
      try {
        store.writeData(normalized);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to persist JSON schema migration: ${error.message}`);
      }
    }
  }
  return store;
};

module.exports = { createDataStore };
