const express = require('express');
const { createCheckoutSession, handleWebhook } = require('../controllers/payment.controller'); // Remove listPaymentIntents
const paymentController = require('../controllers/payment.controller');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
router.post('/create-checkout-session', createCheckoutSession); // Create checkout session
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook); // Handle webhook

router.post('/create-portal-session', authMiddleware, paymentController.createPortalSession);

module.exports = router;
