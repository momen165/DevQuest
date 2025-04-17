const express = require("express");
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("../middleware/sanitizeInput");
const cors = require("cors");
const {
  checkActiveSubscription,
  checkSubscriptionStatusFromDb,
  getSubscriptionStatusForUser,
  listSubscriptions,
} = require("../controllers/subscription.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const router = express.Router();

// Rate limiting for subscription routes
const subscriptionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Apply rate limiting, input sanitization, and CORS policies to all subscription routes
router.use(subscriptionRateLimiter);
router.use(sanitizeInput);
router.use(cors());

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
