const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const { parseCookies } = require("../utils/helpers");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Authentication middleware - supports both JWT and session cookie
 */
const authenticate = (req, res, next) => {
  try {
    // Try JWT first (from Authorization header)
    const jwtToken = extractTokenFromHeader(req);
    if (jwtToken) {
      try {
        const decoded = verifyToken(jwtToken, "access");
        req.user = {
          id: decoded.userId,
          role: decoded.role,
          email: decoded.email,
          authMethod: "jwt",
        };
        return next();
      } catch (jwtError) {
        // JWT verification failed, try session cookie
        logger.warn("JWT verification failed, trying session cookie", {
          error: jwtError.message,
        });
      }
    }

    // Fallback to session cookie (legacy support)
    const cookies = parseCookies(req);
    const sessionToken = cookies[config.security.cookieName];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    // Verify session token (you'll need to implement session verification)
    const session = req.app.locals.sessions?.get(sessionToken);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        code: "SESSION_EXPIRED",
      });
    }

    // Get user from database
    const data = req.app.locals.store.readData();
    const user = data.users.find((u) => u.id === session.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      authMethod: "session",
    };

    next();
  } catch (error) {
    logger.error("Authentication middleware error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Require specific role
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const userRole = req.user.role?.toLowerCase();
    const hasRole = allowedRoles.some((role) => role.toLowerCase() === userRole);

    if (!hasRole) {
      logger.warn("Access denied - insufficient permissions", {
        userId: req.user.id,
        requiredRoles: allowedRoles,
        userRole,
      });
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN",
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole("admin");

/**
 * Require staff role (admin or supervisor)
 */
const requireStaff = requireRole("admin", "supervisor");

/**
 * Optional authentication - doesn't fail if not authenticated
 */
const optionalAuth = (req, res, next) => {
  try {
    const jwtToken = extractTokenFromHeader(req);
    if (jwtToken) {
      try {
        const decoded = verifyToken(jwtToken, "access");
        req.user = {
          id: decoded.userId,
          role: decoded.role,
          email: decoded.email,
          authMethod: "jwt",
        };
      } catch (error) {
        // Silently fail
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireStaff,
  optionalAuth,
};
