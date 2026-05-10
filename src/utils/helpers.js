const crypto = require("crypto");

/**
 * Parse cookies from request
 */
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((chunk) => {
    const idx = chunk.indexOf("=");
    if (idx <= 0) return;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    cookies[key] = value;
  });

  return cookies;
};

/**
 * Normalize role
 */
const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return "admin";
  if (value === "supervisor") return "supervisor";
  return "user";
};

/**
 * Normalize email
 */
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Title case
 */
const titleCase = (value) =>
  String(value || "")
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

/**
 * Sanitize text
 */
const sanitizeText = (value, max = 500) =>
  String(value || "")
    .trim()
    .slice(0, max)
    .replace(/[<>]/g, "");

/**
 * Hash password
 */
const hashPassword = (password, iterations = 310000) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `v1$${iterations}$${salt}$${hash}`;
};

/**
 * Verify password
 */
const verifyPassword = (password, encoded) => {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 4) return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expectedHex = parts[3];
  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const expected = Buffer.from(expectedHex, "hex");
  return crypto.timingSafeEqual(actual, expected);
};

/**
 * Check strong password
 */
const isStrongPassword = (password) => {
  const value = String(password || "");
  if (value.length < 10) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return true;
};

/**
 * Validate email
 */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Normalize access resource
 */
const normalizeAccessResource = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["research_vault", "security_lab", "engineering_hub"].includes(normalized)) {
    return normalized;
  }
  return null;
};

/**
 * Normalize access status
 */
const normalizeAccessStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "approved", "rejected"].includes(normalized)) {
    return normalized;
  }
  return "pending";
};

/**
 * Generate random ID
 */
const generateId = () => crypto.randomUUID();

/**
 * Paginate array
 */
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    data: array.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: offset + limit < array.length,
      hasPrev: page > 1,
    },
  };
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format date
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Calculate percentage
 */
const percentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

module.exports = {
  parseCookies,
  normalizeRole,
  normalizeEmail,
  titleCase,
  sanitizeText,
  hashPassword,
  verifyPassword,
  isStrongPassword,
  isValidEmail,
  normalizeAccessResource,
  normalizeAccessStatus,
  generateId,
  paginate,
  sleep,
  formatDate,
  percentage,
};
