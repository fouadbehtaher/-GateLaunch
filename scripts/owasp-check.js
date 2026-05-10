const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");

const readEnvFile = () => {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
};

const main = () => {
  const env = readEnvFile();
  const nodeEnv = String(env.NODE_ENV || process.env.NODE_ENV || "development").trim().toLowerCase();
  const isProd = nodeEnv === "production";

  const warnings = [];
  const infos = [];

  infos.push(`NODE_ENV=${nodeEnv}`);

  if (isProd) {
    const demoSeed = String(env.DEMO_SEED_USERS || process.env.DEMO_SEED_USERS || "").trim().toLowerCase();
    if (demoSeed === "true") {
      warnings.push("DEMO_SEED_USERS=true in production (disable it).");
    }

    const bootstrapEmail = String(env.ADMIN_BOOTSTRAP_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim();
    const bootstrapPass = String(env.ADMIN_BOOTSTRAP_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "").trim();
    if (!bootstrapEmail || !bootstrapPass) {
      warnings.push("Missing ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD in production.");
    }

    const trustProxy = String(env.TRUST_PROXY || process.env.TRUST_PROXY || "false").trim().toLowerCase();
    if (trustProxy !== "true") {
      infos.push("Tip: set TRUST_PROXY=true when running behind Nginx/Caddy/IIS reverse proxy.");
    }

    const distDir = path.join(ROOT, "dist");
    if (!fs.existsSync(distDir)) {
      warnings.push("dist/ not found. Run: npm run vendor:fetch && npm run build");
    }
  }

  const rateMax = Number(env.API_RATE_MAX || process.env.API_RATE_MAX || 300);
  if (!Number.isFinite(rateMax) || rateMax < 60) {
    warnings.push("API_RATE_MAX is too low/invalid; consider 300+ for normal usage.");
  }

  console.log("OWASP readiness checks");
  infos.forEach((line) => console.log(`- ${line}`));
  if (warnings.length) {
    console.log("\nWarnings");
    warnings.forEach((line) => console.log(`- ${line}`));
    process.exitCode = 2;
    return;
  }
  console.log("\nOK");
};

main();

