const logger = require("../utils/logger");
const { generateTokens } = require("../utils/jwt");
const { hashPassword, verifyPassword, isStrongPassword, isValidEmail, normalizeEmail } = require("../utils/helpers");
const cache = require("../utils/cache");

/**
 * User login
 */
const login = async (store, email, password, req) => {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      logger.warn("Login failed - invalid email", { email: normalizedEmail });
      return {
        success: false,
        message: "Invalid email format",
        code: "INVALID_EMAIL",
      };
    }

    // Check cache first
    const cacheKey = `user:${normalizedEmail}`;
    let user = await cache.get(cacheKey);

    if (!user) {
      const data = store.readData();
      user = data.users.find((u) => normalizeEmail(u.email) === normalizedEmail);

      if (user) {
        await cache.set(cacheKey, user, 3600); // Cache for 1 hour
      }
    }

    if (!user) {
      logger.warn("Login failed - user not found", { email: normalizedEmail });
      return {
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    const passwordValid = verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      logger.warn("Login failed - invalid password", {
        email: normalizedEmail,
        userId: user.id,
      });
      return {
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Generate JWT tokens
    const tokens = generateTokens(user.id, user.role, user.email);

    logger.logAuth("login", user.email, true, req);

    return {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        ...tokens,
      },
    };
  } catch (error) {
    logger.error("Login error", { error: error.message, email });
    return {
      success: false,
      message: "Login failed",
      code: "LOGIN_ERROR",
    };
  }
};

/**
 * User signup
 */
const signup = async (store, { email, password, name }, req) => {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return {
        success: false,
        message: "Invalid email format",
        code: "INVALID_EMAIL",
      };
    }

    if (!isStrongPassword(password)) {
      return {
        success: false,
        message: "Password must be at least 10 characters with uppercase, lowercase, and digit",
        code: "WEAK_PASSWORD",
      };
    }

    const data = store.readData();

    // Check if user exists
    const existingUser = data.users.find((u) => normalizeEmail(u.email) === normalizedEmail);

    if (existingUser) {
      logger.warn("Signup failed - email already exists", { email: normalizedEmail });
      return {
        success: false,
        message: "Email already registered",
        code: "EMAIL_EXISTS",
      };
    }

    // Create new user
    const newUser = {
      id: require("crypto").randomUUID(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: "user",
      name: name || "",
      createdAt: Date.now(),
    };

    data.users.push(newUser);
    store.writeData(data);

    // Cache the new user
    await cache.set(`user:${normalizedEmail}`, newUser, 3600);

    // Generate tokens
    const tokens = generateTokens(newUser.id, newUser.role, newUser.email);

    logger.logAuth("signup", newUser.email, true, req);

    return {
      success: true,
      message: "Account created successfully",
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.name,
        },
        ...tokens,
      },
    };
  } catch (error) {
    logger.error("Signup error", { error: error.message, email });
    return {
      success: false,
      message: "Signup failed",
      code: "SIGNUP_ERROR",
    };
  }
};

/**
 * Refresh token
 */
const refresh = async (store, refreshToken) => {
  try {
    const { verifyToken } = require("../utils/jwt");
    const decoded = verifyToken(refreshToken, "refresh");

    const data = store.readData();
    const user = data.users.find((u) => u.id === decoded.userId);

    if (!user) {
      return {
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    const tokens = generateTokens(user.id, user.role, user.email);

    return {
      success: true,
      data: tokens,
    };
  } catch (error) {
    logger.error("Token refresh error", { error: error.message });
    return {
      success: false,
      message: "Invalid refresh token",
      code: "INVALID_REFRESH_TOKEN",
    };
  }
};

/**
 * Get user profile
 */
const getProfile = async (store, userId) => {
  try {
    const cacheKey = `profile:${userId}`;
    let user = await cache.get(cacheKey);

    if (!user) {
      const data = store.readData();
      user = data.users.find((u) => u.id === userId);

      if (user) {
        await cache.set(cacheKey, user, 1800); // Cache for 30 minutes
      }
    }

    if (!user) {
      return {
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    logger.error("Get profile error", { error: error.message, userId });
    return {
      success: false,
      message: "Failed to get profile",
      code: "PROFILE_ERROR",
    };
  }
};

/**
 * Update user profile
 */
const updateProfile = async (store, userId, updates) => {
  try {
    const data = store.readData();
    const userIndex = data.users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return {
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      };
    }

    const user = data.users[userIndex];

    // Update allowed fields
    if (updates.name !== undefined) {
      user.name = String(updates.name).trim();
    }

    data.users[userIndex] = user;
    store.writeData(data);

    // Invalidate cache
    await cache.del(`profile:${userId}`);
    await cache.del(`user:${user.email}`);

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  } catch (error) {
    logger.error("Update profile error", { error: error.message, userId });
    return {
      success: false,
      message: "Failed to update profile",
      code: "UPDATE_ERROR",
    };
  }
};

module.exports = {
  login,
  signup,
  refresh,
  getProfile,
  updateProfile,
};
