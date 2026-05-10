const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const loadDotEnv = () => {
  const envFile = path.join(ROOT, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  });
};

const parseArgs = (argv) => {
  const args = { vacuum: false };
  argv.forEach((raw) => {
    const item = String(raw || "").trim();
    if (!item) return;
    if (item === "--vacuum") args.vacuum = true;
    if (item === "--help" || item === "-h") args.help = true;
    if (item.startsWith("--db-path=")) args.dbPath = item.split("=").slice(1).join("=");
  });
  return args;
};

const main = () => {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Storage optimize (SQLite)");
    console.log("Usage:");
    console.log("  node scripts/storage-optimize.js [--vacuum] [--db-path=PATH]");
    process.exitCode = 0;
    return;
  }

  const driver = String(process.env.STORAGE_DRIVER || "json").trim().toLowerCase();
  if (driver !== "sqlite") {
    console.log(`Skipped. STORAGE_DRIVER=${driver} (set to sqlite to optimize).`);
    return;
  }

  let BetterSqlite3;
  try {
    BetterSqlite3 = require("better-sqlite3");
  } catch (error) {
    console.error("better-sqlite3 is not available. Use Node.js v20 and install dependencies, or switch to JSON.");
    process.exitCode = 1;
    return;
  }

  const resolved = path.resolve(ROOT, String(args.dbPath || process.env.DB_PATH || "storage/gatelaunch.db"));
  const db = new BetterSqlite3(resolved);
  db.pragma("busy_timeout = 5000");

  db.pragma("optimize");
  db.exec("PRAGMA optimize;");
  if (args.vacuum) {
    db.exec("VACUUM;");
  }

  console.log(`Optimized: ${resolved}${args.vacuum ? " (vacuum)" : ""}`);
};

main();

