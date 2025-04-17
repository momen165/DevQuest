const express = require("express");
const {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
} = require("../controllers/payment.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("../middleware/sanitizeInput");
const cors = require("cors");
const router = express.Router();

// Rate limiting for payment routes
const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Apply rate limiting, input sanitization, and CORS policies to all payment routes
router.use(paymentRateLimiter);
router.use(sanitizeInput);
router.use(cors());

// Regular routes with JSON parsing and authentication
router.post(
  "/create-checkout-session",
  authenticateToken,
  requireAuth,
  createCheckoutSession
);
router.post(
  "/create-portal-session",
  authenticateToken,
  requireAuth,
  createPortalSession
);

// Export webhook handler separately to be used directly in server.js
module.exports = {
  router,
  webhookHandler: handleWebhook,
};
