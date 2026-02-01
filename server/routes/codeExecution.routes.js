const express = require("express");
const router = express.Router();
const {
  runCode,
  executionLimiter,
  getCacheStats,
} = require("../controllers/codeExecution.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");

// Cache statistics endpoint - protected with authentication
router.get("/cache-stats", authenticateToken, requireAuth, getCacheStats);

// Code execution endpoint
router.post("/run", executionLimiter, authenticateToken, requireAuth, runCode);

module.exports = router;
