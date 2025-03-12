const express = require("express");
const router = express.Router();
const { getRecentActivities } = require("../models/activity");
const authenticateToken = require("../middleware/auth");

// Get recent activities
router.get("/activities/recent", authenticateToken, async (req, res) => {
  try {
    const activities = await getRecentActivities(10); // Fetch 10 recent activities
    res.status(200).json(activities);
  } catch (err) {
    console.error("Error fetching recent activities:", err);
    res.status(500).json({ error: "Failed to fetch recent activities." });
  }
});

module.exports = router;
