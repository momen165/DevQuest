// website/server/routes/subscription.routes.js
const express = require('express');
const { 
    addSubscription, 
    getSubscriptions, 
    cancelSubscription, 
    updateSubscription, 
    listSubscriptions, 
    retrieveSubscription, 
    retrieveSubscriptionFromStripe, 
    checkActiveSubscription,
    checkSubscriptionStatusFromDb  // Add this import
} = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Stripe-related routes
router.post('/subscribe', authenticateToken, addSubscription);
router.delete('/subscription', authenticateToken, cancelSubscription);
router.put('/subscription', authenticateToken, updateSubscription);
router.get('/stripe-subscription/:subscriptionId', authenticateToken, retrieveSubscriptionFromStripe);
router.get('/check', authenticateToken, checkActiveSubscription); // Stripe check

// Database-only routes
router.get('/status', authenticateToken, checkSubscriptionStatusFromDb); // DB check
router.get('/subscriptions', authenticateToken, getSubscriptions);
router.get('/list-subscriptions', authenticateToken, listSubscriptions);

module.exports = router;