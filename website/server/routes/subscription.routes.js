const express = require('express');
const { addSubscription, getSubscriptions, cancelSubscription, updateSubscription } = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware
const {getCheckoutSession} = require('../controllers/subscription.controller');
const {handleStripeWebhook} = require('../controllers/subscription.controller');
const router = express.Router();

router.post('/subscribe', authenticateToken, addSubscription);
router.get('/subscriptions', authenticateToken, getSubscriptions);
router.delete('/subscription', authenticateToken, cancelSubscription); // Add the new route
router.put('/subscription', authenticateToken, updateSubscription); // Add the new route
router.get('/checkout-session/:sessionId', getCheckoutSession);
router.post('/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

module.exports = router;
