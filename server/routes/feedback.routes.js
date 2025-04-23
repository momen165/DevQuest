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
const { authenticateToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/feedback", authenticateToken, requireAuth, getFeedback);
router.post("/feedback", authenticateToken, requireAuth, submitFeedback);
router.post("/feedback/reply", authenticateToken, requireAuth, replyToFeedback);

router.get("/getCoursesWithRatings", getCoursesWithRatings);
router.get("/feedback/public", getPublicFeedback);

router.get(
  "/feedback/eligibility/:courseId",
  authenticateToken,
  requireAuth,
  async (req, res) => {
    try {
      const eligibility = await checkFeedbackEligibility(
        req.user.userId,
        req.params.courseId
      );
      res.json(eligibility);
    } catch (error) {
      console.error("Eligibility check error:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  "/feedback/recent",
  authenticateToken,
  requireAuth,
  getRecentFeedback
);

router.post("/feedback/reopen", authenticateToken, requireAuth, reopenFeedback);

module.exports = router;
