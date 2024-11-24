const express = require('express');
const { addSubscription, getSubscriptions } = require('../controllers/subscription.controller');

const  authenticateToken  = require('../middleware/auth'); // Add your authentication middleware

const router = express.Router();

router.post('/subscribe', authenticateToken, addSubscription);
router.get('/subscriptions', authenticateToken, getSubscriptions);

module.exports = router;
