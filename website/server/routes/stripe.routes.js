
const express = require('express');
const { createCheckoutSession, handleWebhook } = require('../controllers/payment.controller');
const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;