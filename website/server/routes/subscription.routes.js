// website/server/routes/subscription.routes.js
const express = require('express');
const { 
    checkActiveSubscription, 
    checkSubscriptionStatusFromDb,
    getSubscriptionStatusForUser,
    listSubscriptions
} = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Database-only routes
router.get('/status', authenticateToken, checkSubscriptionStatusFromDb); // DB check
router.get('/check', authenticateToken, checkActiveSubscription); // Stripe check
router.get('/list-subscriptions', authenticateToken, listSubscriptions);
router.get('/user/:userId', authenticateToken, getSubscriptionStatusForUser); // Admin route

module.exports = router;