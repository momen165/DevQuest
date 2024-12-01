const express = require('express');
const router = express.Router();

// Controller
const { getUserInfo } = require('../controllers/userInfo.controller');

// Middleware
const authenticateToken = require('../middleware/auth');

// Route to get user info
router.get('/userInforoutes', authenticateToken, getUserInfo);

module.exports = router;
