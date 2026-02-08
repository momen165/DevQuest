const express = require("express");
const badgeController = require("../controllers/badge.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const router = express.Router();

// Apply authentication middleware to all badge routes
router.use(authenticateToken);
router.use(requireAuth);

// Get all badges for the authenticated user
router.get("/user", badgeController.getUserBadges);

// Get all available badges
router.get("/all", badgeController.getAllBadges);

// Admin-only route to manually award badges
router.post("/award", badgeController.awardBadgeToUser);

module.exports = router;
