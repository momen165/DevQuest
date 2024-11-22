const express = require('express');
const router = express.Router();
const { runCode } = require('../controllers/codeExecution.controller');
const authenticateToken = require('../middleware/auth');

// Define the POST endpoint for running code
router.post('/run', authenticateToken, runCode);

module.exports = router;
