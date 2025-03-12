const express = require("express");
const {
  getFeedback,
  submitFeedback,
  getCoursesWithRatings,
  replyToFeedback,
  getPublicFeedback,
  checkFeedbackEligibility,
  getRecentFeedback,
  reopenFeedback,
} = require("../controllers/feedback.controller");
const authenticateToken = require("../middleware/auth"); // Add your authentication middleware

const router = express.Router();

router.get("/feedback", authenticateToken, getFeedback);
router.post("/feedback", authenticateToken, submitFeedback);
router.post("/feedback/reply", authenticateToken, replyToFeedback);

router.get("/getCoursesWithRatings", getCoursesWithRatings);
router.get("/feedback/public", getPublicFeedback);

router.get(
  "/feedback/eligibility/:courseId",
  authenticateToken,
  async (req, res) => {
    try {
      const eligibility = await checkFeedbackEligibility(
        req.user.userId,
        req.params.courseId,
      );
      res.json(eligibility);
    } catch (error) {
      console.error("Eligibility check error:", error);
      res.status(400).json({ error: error.message });
    }
  },
);

router.get("/feedback/recent", authenticateToken, getRecentFeedback);

router.post("/feedback/reopen", authenticateToken, reopenFeedback);

module.exports = router;
