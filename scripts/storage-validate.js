const path = require("path");
const { createDataStore } = require("../db");

const ROOT = path.join(__dirname, "..");

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

const uniq = (values) => new Set(values).size === values.length;

const main = () => {
  const driver = String(process.env.STORAGE_DRIVER || "json").trim().toLowerCase();
  const store = createDataStore({
    driver,
    dataFile: path.join(ROOT, String(process.env.DATA_JSON_FILE || "data.json")),
    dbPath: path.join(ROOT, String(process.env.DB_PATH || "storage/gatelaunch.db")),
    emptyData,
  });

  const data = store.readData();
  const warnings = [];

  const userIds = (data.users || []).map((u) => u.id).filter(Boolean);
  if (!uniq(userIds)) warnings.push("Duplicate user IDs detected.");

  const orderIds = (data.orders || []).map((o) => o.id).filter(Boolean);
  if (!uniq(orderIds)) warnings.push("Duplicate order IDs detected.");

  const receiptIds = (data.receipts || []).map((r) => r.id).filter(Boolean);
  if (!uniq(receiptIds)) warnings.push("Duplicate receipt IDs detected.");

  (data.orders || []).forEach((o) => {
    if (!o.userId) warnings.push(`Order missing userId: ${o.id || "(no id)"}`);
    if (!o.wallet) warnings.push(`Order missing wallet: ${o.id || "(no id)"}`);
  });

  (data.receipts || []).forEach((r) => {
    if (!r.userId) warnings.push(`Receipt missing userId: ${r.id || "(no id)"}`);
    if (!r.method) warnings.push(`Receipt missing method: ${r.id || "(no id)"}`);
    if (r.proofUrl && !String(r.proofUrl).startsWith("/api/uploads/proof/")) {
      warnings.push(`Receipt invalid proofUrl: ${r.id || "(no id)"}`);
    }
  });

  console.log("Storage validation");
  console.log(`- driver=${store.driver}`);
  if (data.meta && typeof data.meta === "object") {
    console.log(`- schemaVersion=${data.meta.schemaVersion || "unknown"}`);
  }
  console.log(`- users=${(data.users || []).length}`);
  console.log(`- orders=${(data.orders || []).length}`);
  console.log(`- receipts=${(data.receipts || []).length}`);
  console.log(`- tickets=${(data.tickets || []).length}`);

  if (warnings.length) {
    console.log("\nWarnings");
    warnings.slice(0, 50).forEach((w) => console.log(`- ${w}`));
    process.exitCode = 2;
    return;
  }

  console.log("\nOK");
};

main();
