// website/server/middleware/auth.js

const jwt = require("jsonwebtoken");
require("dotenv").config();

// List of routes that should be publicly accessible without authentication
const publicRoutes = [
  "system-settings",
  "maintenance-status",
  "getCoursesWithRatings",
  "feedback/public",
  "health",
];

const authenticateToken = async (req, res, next) => {
  // Check if the route is in the public routes list
  const pathParts = req.path.split("/").filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];

  if (
    publicRoutes.some((route) => {
      return req.path.includes(route) || lastPathPart === route;
    })
  ) {
    //console.log(`Public route detected: ${req.path}`);
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
  try {
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
        if (err) {
          return reject(err);
        }
        resolve(decodedUser);
      });
    });

    // Normalize userId/user_id to ensure consistent naming
    req.user = { ...user, user_id: user.userId || user.user_id };
    next(); // Only call next() if token is successfully verified
  } catch (err) {
    // Handle specific JWT errors more gracefully
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    } else {
      console.error("Token verification failed:", err.message);
      return res.status(403).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }
  }
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
   // console.log(`Public route skipping auth check: ${req.path}`);
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

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin,
};
