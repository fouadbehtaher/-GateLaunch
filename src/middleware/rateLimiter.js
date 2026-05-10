const logger = require("../utils/logger");
const config = require("../config");

// Store for rate limiting
const rateLimitStore = new Map();

/**
 * Clean expired rate limit entries
 */
const cleanExpired = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

// Clean every minute
const cleanInterval = setInterval(cleanExpired, 60 * 1000);
if (typeof cleanInterval.unref === "function") {
  cleanInterval.unref();
}

/**
 * Rate limiter middleware
 */
const rateLimiter = (options = {}) => {
  const {
    windowMs = config.security.rateLimitWindowMs,
    max = config.security.rateLimitMax,
    message = "Too many requests, please try again later",
    keyGenerator = (req) => req.ip || "unknown",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData || now > rateLimitData.resetAt) {
      rateLimitData = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, rateLimitData);
    }

    rateLimitData.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - rateLimitData.count));
    res.setHeader("X-RateLimit-Reset", new Date(rateLimitData.resetAt).toISOString());

    if (rateLimitData.count > max) {
      logger.warn("Rate limit exceeded", {
        key,
        count: rateLimitData.count,
        max,
        ip: req.ip,
        path: req.path,
      });

      return res.status(429).json({
        success: false,
        message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((rateLimitData.resetAt - now) / 1000),
      });
    }

    // Handle skip options
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send;
      res.send = function (data) {
        const statusCode = res.statusCode;
        const shouldSkip =
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400);

        if (shouldSkip) {
          rateLimitData.count--;
        }

        return originalSend.call(this, data);
      };
    }

    next();
  };
};

/**
 * Login-specific rate limiter
 */
const loginRateLimiter = rateLimiter({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: "Too many login attempts, please try again later",
  keyGenerator: (req) => {
    const email = req.body?.email || "unknown";
    return `${req.ip || "unknown"}|${email}`;
  },
  skipSuccessfulRequests: true, // Only count failed logins
});

/**
 * API rate limiter
 */
const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "API rate limit exceeded",
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: "Too many requests for this operation",
});

module.exports = {
  rateLimiter,
  loginRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
};
