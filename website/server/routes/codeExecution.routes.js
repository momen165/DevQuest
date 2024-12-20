const express = require('express');
const router = express.Router();
const { runCode, executionLimiter, getCacheStats } = require('../controllers/codeExecution.controller');
const authenticateToken = require('../middleware/auth');

// Cache statistics endpoint - protected with authentication
router.get('/cache-stats', authenticateToken, getCacheStats);

// Code execution endpoint
router.post('/run', executionLimiter, authenticateToken, runCode);

module.exports = router;
