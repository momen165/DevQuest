const express = require('express');
const { addSubscription, getSubscriptions, cancelSubscription, updateSubscription } = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware

const router = express.Router();

router.post('/subscribe', authenticateToken, addSubscription);
router.get('/subscriptions', authenticateToken, getSubscriptions);
router.delete('/subscription', authenticateToken, cancelSubscription); // Add the new route
router.put('/subscription', authenticateToken, updateSubscription); // Add the new route

module.exports = router;
