const crypto = require("crypto");
const logger = require("../utils/logger");
const { normalizeEmail, normalizeRole, hashPassword } = require("../utils/helpers");

const defaultDemoSeedEnabled = () => {
  const isProd = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
  return !isProd;
};

const ensureBootstrapAdmin = (store) => {
  const email = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
  if (!email || !password) return { success: true, skipped: true, reason: "missing_env" };

  const data = store.readData();
  data.users = Array.isArray(data.users) ? data.users : [];

  let changed = false;
  let user = data.users.find((u) => normalizeEmail(u.email) === email);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: "System Admin",
      email,
      role: "admin",
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    data.users.push(user);
    changed = true;
  } else {
    const nextRole = normalizeRole(user.role);
    if (nextRole !== "admin") {
      user.role = "admin";
      changed = true;
    }
    if (!user.passwordHash) {
      user.passwordHash = hashPassword(password);
      changed = true;
    }
  }

  if (changed) {
    store.writeData(data);
    logger.info("Bootstrap admin ensured", { email });
  }

  return { success: true, changed };
};

const ensureDemoUsers = (store) => {
  const envValue = String(process.env.DEMO_SEED_USERS || "").trim().toLowerCase();
  const enabled =
    envValue === "true" ? true : envValue === "false" ? false : defaultDemoSeedEnabled();
  if (!enabled) return { success: true, skipped: true, reason: "disabled" };

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

  const data = store.readData();
  data.users = Array.isArray(data.users) ? data.users : [];

  let changed = false;

  seeds.forEach((seed) => {
    const email = normalizeEmail(seed.email);
    let user = data.users.find((u) => normalizeEmail(u.email) === email);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: seed.name,
        email,
        role: normalizeRole(seed.role),
        passwordHash: hashPassword(seed.password),
        createdAt: Date.now(),
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

  if (changed) {
    store.writeData(data);
    logger.info("Demo users ensured", { count: seeds.length });
  }

  return { success: true, changed };
};

module.exports = {
  ensureBootstrapAdmin,
  ensureDemoUsers,
};
