const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("./logger");

/**
 * Generate access token
 */
const generateAccessToken = (userId, role, email) => {
  try {
    return jwt.sign(
      {
        userId,
        role,
        email,
        type: "access",
      },
      config.security.jwtSecret,
      {
        expiresIn: config.security.jwtExpiresIn,
        issuer: config.app.name,
        subject: userId,
      }
    );
  } catch (error) {
    logger.error("Failed to generate access token", { error: error.message, userId });
    throw error;
  }
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  try {
    return jwt.sign(
      {
        userId,
        type: "refresh",
      },
      config.security.jwtSecret,
      {
        expiresIn: config.security.jwtRefreshExpiresIn,
        issuer: config.app.name,
        subject: userId,
      }
    );
  } catch (error) {
    logger.error("Failed to generate refresh token", { error: error.message, userId });
    throw error;
  }
};

/**
 * Generate both tokens
 */
const generateTokens = (userId, role, email) => {
  return {
    accessToken: generateAccessToken(userId, role, email),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Verify token
 */
const verifyToken = (token, requiredType = "access") => {
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret, {
      issuer: config.app.name,
    });

    if (decoded.type !== requiredType) {
      throw new Error(`Invalid token type. Expected ${requiredType}, got ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.warn("Token expired", { error: error.message });
      throw new Error("Token expired");
    }
    if (error.name === "JsonWebTokenError") {
      logger.warn("Invalid token", { error: error.message });
      throw new Error("Invalid token");
    }
    logger.error("Token verification failed", { error: error.message });
    throw error;
  }
};

/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error("Token decode failed", { error: error.message });
    return null;
  }
};

/**
 * Extract token from request header
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
};
