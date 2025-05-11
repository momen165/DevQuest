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
const router = express.Router();

// Database-only routes
router.get(
  "/status",
  authenticateToken,
  requireAuth,
  sessionTracker,
  checkSubscriptionStatusFromDb
); // DB check
router.get("/check", authenticateToken, requireAuth, sessionTracker, checkActiveSubscription); // Stripe check
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
