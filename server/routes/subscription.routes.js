// website/server/routes/subscription.routes.js
const express = require("express");
const {
  checkActiveSubscription,
  checkSubscriptionStatusFromDb,
  getSubscriptionStatusForUser,
  listSubscriptions,
} = require("../controllers/subscription.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const { cacheMiddleware } = require("../utils/cache.utils");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");
const router = express.Router();

// Database-only routes
router.get(
  "/status",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("subscription-status"),
  cacheMiddleware("user", 180),
  checkSubscriptionStatusFromDb
); // Optimized DB check with caching and performance monitoring
router.get(
  "/check",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("subscription-check"),
  cacheMiddleware("user", 180),
  checkActiveSubscription
); // Optimized Stripe check with caching and performance monitoring
router.get(
  "/list-subscriptions",
  authenticateToken,
  requireAuth,
  sessionTracker,
  listSubscriptions
);
router.get(
  "/user/:userId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getSubscriptionStatusForUser
); // Admin route

module.exports = router;
