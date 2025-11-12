const express = require("express");
const {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
  getPricingPlans,
} = require("../controllers/payment.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const router = express.Router();

// Public route - pricing plans (no auth required)
router.get("/pricing-plans", getPricingPlans);

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
