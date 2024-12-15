const express = require('express');
const { addSubscription, getSubscriptions, cancelSubscription, updateSubscription, listSubscriptions, retrieveSubscription, retrieveSubscriptionFromStripe } = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware
const {getCheckoutSession} = require('../controllers/subscription.controller');
const {handleStripeWebhook} = require('../controllers/subscription.controller');
const router = express.Router();

router.post('/subscribe', authenticateToken, addSubscription);
router.get('/subscriptions', authenticateToken, getSubscriptions);
router.delete('/subscription', authenticateToken, cancelSubscription); // Add the new route
router.put('/subscription', authenticateToken, updateSubscription); // Add the new route
router.get('/list-subscriptions', authenticateToken, listSubscriptions); // Add the new route
router.get('/subscription/:id', authenticateToken, retrieveSubscription); // Add the new route
router.get('/stripe-subscription/:subscriptionId', authenticateToken, retrieveSubscriptionFromStripe); // Add the new route

module.exports = router;
