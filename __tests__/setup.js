const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_TEST_DATA_FILE = "storage/test-data.json";

beforeAll(() => {
  const rel = String(process.env.DATA_JSON_FILE || DEFAULT_TEST_DATA_FILE);
  const file = path.resolve(ROOT, rel);
  try {
    fs.rmSync(file, { force: true });
  } catch (_) {}
});

