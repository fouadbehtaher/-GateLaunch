const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const toEpoch = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const safeId = (value) => String(value || "").trim() || crypto.randomUUID();

const loadJsonData = (dataFile, emptyData) => {
  if (!fs.existsSync(dataFile)) return emptyData();
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      accessRequests: Array.isArray(parsed.accessRequests) ? parsed.accessRequests : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : [],
      supportRequests: Array.isArray(parsed.supportRequests) ? parsed.supportRequests : [],
    };
  } catch (error) {
    return emptyData();
  }
};

const createJsonStore = ({ dataFile, emptyData }) => {
  const readData = () => loadJsonData(dataFile, emptyData);
  const writeData = (data) => {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
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
      "SQLite driver requested but package `better-sqlite3` is not installed. Run: npm install"
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
  `);

  const countAll = () => {
    const tables = ["users", "tickets", "orders", "access_requests", "notifications", "receipts", "support_requests"];
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
    ["users", "tickets", "orders", "access_requests", "notifications", "receipts", "support_requests"].forEach(wipe);

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
  });

  const migrateIfNeeded = () => {
    if (countAll() > 0) return;
    const jsonData = loadJsonData(dataFile, emptyData);
    writeAll(jsonData);
  };
  migrateIfNeeded();

  const readData = () => ({
    users: readRows("users"),
    tickets: readRows("tickets"),
    orders: readRows("orders"),
    accessRequests: readRows("access_requests"),
    notifications: readRows("notifications"),
    receipts: readRows("receipts"),
    supportRequests: readRows("support_requests"),
  });

  const writeData = (data) => {
    writeAll({
      users: Array.isArray(data.users) ? data.users : [],
      tickets: Array.isArray(data.tickets) ? data.tickets : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      accessRequests: Array.isArray(data.accessRequests) ? data.accessRequests : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      receipts: Array.isArray(data.receipts) ? data.receipts : [],
      supportRequests: Array.isArray(data.supportRequests) ? data.supportRequests : [],
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
    return createSqliteStore({ dbPath, dataFile, emptyData });
  }
  return createJsonStore({ dataFile, emptyData });
};

module.exports = { createDataStore };
