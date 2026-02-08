const prisma = require("../config/prisma");

// Environment-aware logger to reduce console overhead in production
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Enhanced logger with environment awareness
 * - In production: Only logs errors and critical warnings
 * - In development: Logs everything
 */
const logger = {
  // Log levels: error > warn > info > debug

  error: (...args) => {
    // Always log errors regardless of environment
    console.error(`[${new Date().toISOString()}] ERROR:`, ...args);
  },

  warn: (...args) => {
    // Log warnings in all environments
    console.warn(`[${new Date().toISOString()}] WARN:`, ...args);
  },

  info: (...args) => {
    // Only log info in development
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] INFO:`, ...args);
    }
  },

  debug: (...args) => {
    // Only log debug in development
    if (isDevelopment) {
      console.log(`[${new Date().toISOString()}] DEBUG:`, ...args);
    }
  },

  // Performance-critical: only log slow operations
  performance: (operation, duration, threshold = 1000) => {
    if (duration > threshold) {
      console.warn(
        `[${new Date().toISOString()}] SLOW: ${operation} took ${duration.toFixed(2)}ms`,
      );
    }
  },
};

/**
 * Database activity logger
 */
const logActivity = async (actionType, actionDescription, userId = null) => {
  try {
    await prisma.recent_activity.create({
      data: {
        action_type: actionType,
        action_description: actionDescription,
        user_id: userId,
      },
    });
  } catch (err) {
    logger.error("Error logging activity:", err.message || err);
  }
};

module.exports = logActivity;
module.exports.logger = logger;
