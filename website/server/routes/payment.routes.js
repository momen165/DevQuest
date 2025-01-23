const express = require('express');
const { 
    createCheckoutSession, 
    handleWebhook,
    createPortalSession 
} = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Stripe webhook handling
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/create-portal-session', authMiddleware, createPortalSession);

module.exports = router;
