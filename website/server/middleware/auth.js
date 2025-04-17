const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sanitize = require("sanitize")();
const cors = require("cors");
require("dotenv").config();

// List of routes that should be publicly accessible without authentication
const publicRoutes = [
  "system-settings",
  "maintenance-status",
  "getCoursesWithRatings",
  "feedback/public",
  "health",
];

const authenticateToken = (req, res, next) => {
  // Check if the route is in the public routes list
  const pathParts = req.path.split("/").filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];

  if (
    publicRoutes.some((route) => {
      return req.path.includes(route) || lastPathPart === route;
    })
  ) {
    console.log(`Public route detected: ${req.path}`);
    return next(); // Skip authentication for public routes
  }

  // Get auth header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // No token provided, continue but with no user
  if (!token) {
    req.user = null;
    return next();
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Handle specific JWT errors more gracefully
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "Token has expired",
          code: "TOKEN_EXPIRED",
        });
      }

      console.error("Token verification failed:", err.message);
      return res.status(403).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Normalize userId/user_id to ensure consistent naming
    req.user = { ...user, user_id: user.userId || user.user_id };

    next();
  });
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  // Check if the route is in the public routes list
  const pathParts = req.path.split("/").filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];

  if (
    publicRoutes.some((route) => {
      return req.path.includes(route) || lastPathPart === route;
    })
  ) {
    console.log(`Public route skipping auth check: ${req.path}`);
    return next();
  }

  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }
  next();
};

// Middleware to require admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  if (!req.user.admin) {
    return res.status(403).json({
      error: "Admin privileges required",
      code: "ADMIN_REQUIRED",
    });
  }

  next();
};

// Rate limiting middleware for authentication routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
};

// Stricter CORS policies
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
  authRateLimiter,
  sanitizeInput,
  corsOptions,
};
