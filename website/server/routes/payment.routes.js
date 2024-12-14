const express = require('express');
const { createCheckoutSession, handleWebhook } = require('../controllers/payment.controller'); // Remove listPaymentIntents

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession); // Create checkout session
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook); // Handle webhook

module.exports = router;
