// website/server/routes/subscription.routes.js
const express = require("express");
const {
  checkActiveSubscription,
  checkSubscriptionStatusFromDb,
  getSubscriptionStatusForUser,
  listSubscriptions,
} = require("../controllers/subscription.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const router = express.Router();

// Database-only routes
router.get(
  "/status",
  authenticateToken,
  requireAuth,
  checkSubscriptionStatusFromDb
); // DB check
router.get("/check", authenticateToken, requireAuth, checkActiveSubscription); // Stripe check
router.get(
  "/list-subscriptions",
  authenticateToken,
  requireAuth,
  listSubscriptions
);
router.get(
  "/user/:userId",
  authenticateToken,
  requireAuth,
  getSubscriptionStatusForUser
); // Admin route

module.exports = router;
