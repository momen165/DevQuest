const express = require('express');
const { 
    createCheckoutSession,
    handleWebhook,
    createPortalSession 
} = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Regular routes with JSON parsing
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/create-portal-session', authMiddleware, createPortalSession);

// Export webhook handler separately to be used directly in server.js
module.exports = {
    router,
    webhookHandler: handleWebhook
};
