const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authenticateToken = require('../middleware/auth');

router.post('/subscribe', authenticateToken, subscriptionController.subscribe);

module.exports = router;
