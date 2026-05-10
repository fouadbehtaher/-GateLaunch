const fs = require("fs");
const path = require("path");
const { createDataStore } = require("../db");

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
  const args = { backup: false, write: true, vacuum: false };
  argv.forEach((raw) => {
    const item = String(raw || "").trim();
    if (!item) return;
    if (item === "--backup") args.backup = true;
    if (item === "--no-write") args.write = false;
    if (item === "--vacuum") args.vacuum = true;
    if (item.startsWith("--driver=")) args.driver = item.split("=").slice(1).join("=");
    if (item.startsWith("--data-file=")) args.dataFile = item.split("=").slice(1).join("=");
    if (item.startsWith("--db-path=")) args.dbPath = item.split("=").slice(1).join("=");
    if (item === "--help" || item === "-h") args.help = true;
  });
  return args;
};

const emptyData = () => ({
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
});

const main = async () => {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Storage upgrade");
    console.log("Usage:");
    console.log("  node scripts/storage-upgrade.js [--backup] [--no-write] [--driver=json|sqlite]");
    console.log("  node scripts/storage-upgrade.js [--data-file=PATH] [--db-path=PATH]");
    process.exitCode = 0;
    return;
  }

  const driver = String(args.driver || process.env.STORAGE_DRIVER || "json").trim().toLowerCase();
  const dataFile = path.join(ROOT, String(args.dataFile || "data.json"));
  const dbPath = path.join(ROOT, String(args.dbPath || process.env.DB_PATH || "storage/gatelaunch.db"));

  const store = createDataStore({ driver, dataFile, dbPath, emptyData });

  if (args.backup && typeof store.backup === "function") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = store.driver === "sqlite" ? ".db" : ".json";
    const target = path.join(ROOT, "storage", "backups", `upgrade-${stamp}${ext}`);
    const result = await Promise.resolve(store.backup(target));
    console.log(`Backup created: ${result.file || target}`);
  }

  const before = store.readData();
  const beforeVersion = before?.meta?.schemaVersion || "unknown";

  if (!args.write) {
    console.log(`OK (no-write). driver=${store.driver} schemaVersion=${beforeVersion}`);
    return;
  }

  store.writeData(before);
  const after = store.readData();
  const afterVersion = after?.meta?.schemaVersion || "unknown";
  console.log(`Upgraded. driver=${store.driver} schemaVersion=${beforeVersion} -> ${afterVersion}`);

  if (args.vacuum && store.driver === "sqlite") {
    console.log("Note: --vacuum is handled by scripts/storage-optimize.js");
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

