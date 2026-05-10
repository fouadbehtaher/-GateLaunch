const config = require("../config");
const logger = require("./logger");

let redisClient = null;
let memoryCache = new Map();

/**
 * Initialize Redis connection
 */
const initRedis = async () => {
  if (!config.redis.enabled) {
    logger.info("Redis caching disabled, using in-memory cache");
    return null;
  }

  try {
    const redis = require("redis");
    redisClient = redis.createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    redisClient.on("error", (err) => {
      logger.error("Redis connection error", { error: err.message });
    });

    redisClient.on("connect", () => {
      logger.info("Redis connected successfully");
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn("Redis initialization failed, falling back to memory cache", {
      error: error.message,
    });
    return null;
  }
};

/**
 * Set cache value
 */
const set = async (key, value, ttl = config.redis.ttl) => {
  try {
    const serialized = JSON.stringify(value);

    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(key, ttl, serialized);
    } else {
      memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttl * 1000,
      });
    }

    return true;
  } catch (error) {
    logger.error("Cache set failed", { key, error: error.message });
    return false;
  }
};

/**
 * Get cache value
 */
const get = async (key) => {
  try {
    if (redisClient && redisClient.isOpen) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = memoryCache.get(key);
      if (!cached) return null;

      if (Date.now() > cached.expiresAt) {
        memoryCache.delete(key);
        return null;
      }

      return JSON.parse(cached.value);
    }
  } catch (error) {
    logger.error("Cache get failed", { key, error: error.message });
    return null;
  }
};

/**
 * Delete cache value
 */
const del = async (key) => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(key);
    } else {
      memoryCache.delete(key);
    }
    return true;
  } catch (error) {
    logger.error("Cache delete failed", { key, error: error.message });
    return false;
  }
};

/**
 * Delete cache keys by prefix (supports Redis + memory cache)
 */
const delPrefix = async (prefix) => {
  const value = String(prefix || "");
  if (!value) return false;

  try {
    if (redisClient && redisClient.isOpen) {
      const pattern = `${value}*`;
      const keys = [];

      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
        if (keys.length >= 500) {
          await redisClient.del(keys);
          keys.length = 0;
        }
      }

      if (keys.length) {
        await redisClient.del(keys);
      }

      return true;
    }

    for (const key of memoryCache.keys()) {
      if (String(key).startsWith(value)) {
        memoryCache.delete(key);
      }
    }

    return true;
  } catch (error) {
    logger.error("Cache delPrefix failed", { prefix: value, error: error.message });
    return false;
  }
};

/**
 * Clear all cache
 */
const clear = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.flushDb();
    } else {
      memoryCache.clear();
    }
    logger.info("Cache cleared successfully");
    return true;
  } catch (error) {
    logger.error("Cache clear failed", { error: error.message });
    return false;
  }
};

/**
 * Clean expired memory cache entries
 */
const cleanExpired = () => {
  if (!redisClient || !redisClient.isOpen) {
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
      if (now > cached.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }
};

// Clean expired entries every 5 minutes
const cleanInterval = setInterval(cleanExpired, 5 * 60 * 1000);
if (typeof cleanInterval.unref === "function") {
  cleanInterval.unref();
}

/**
 * Close Redis connection (if any)
 */
const closeRedis = async () => {
  const client = redisClient;
  redisClient = null;

  if (!client) return;

  try {
    if (client.isOpen) {
      await client.quit();
    }
  } catch (_) {
    try {
      await client.disconnect();
    } catch (_) {}
  }
};

module.exports = {
  initRedis,
  set,
  get,
  del,
  delPrefix,
  clear,
  closeRedis,
};
