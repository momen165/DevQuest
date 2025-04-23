const express = require("express");
const {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
} = require("../controllers/payment.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const router = express.Router();

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
