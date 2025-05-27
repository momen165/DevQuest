const express = require("express");
const {
  getFeedback,
  submitFeedback,
  getCoursesWithRatings,
  getOptimizedCoursesData,
  getOptimizedCourseSectionData,
  replyToFeedback,
  getPublicFeedback,
  checkFeedbackEligibility,
  getRecentFeedback,
  reopenFeedback,
} = require("../controllers/feedback.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const { cacheMiddleware } = require("../utils/cache.utils");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");

const router = express.Router();

router.get(
  "/feedback",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getFeedback
);
router.post(
  "/feedback",
  authenticateToken,
  requireAuth,
  sessionTracker,
  submitFeedback
);
router.post(
  "/feedback/reply",
  authenticateToken,
  requireAuth,
  sessionTracker,
  replyToFeedback
);

router.get(
  "/getCoursesWithRatings",
  performanceMiddleware("getCoursesWithRatings"),
  cacheMiddleware("courses", 300),
  getCoursesWithRatings
);
router.get(
  "/optimized-courses",
  performanceMiddleware("optimized-courses"),
  cacheMiddleware("courses", 300),
  getOptimizedCoursesData
); // New optimized endpoint with performance monitoring
router.get(
  "/feedback/public",
  performanceMiddleware("publicFeedback"),
  cacheMiddleware("static", 600),
  getPublicFeedback
);

router.get(
  "/feedback/eligibility/:courseId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("feedback-eligibility"),
  cacheMiddleware("user", 180), // 3 minutes cache for user-specific data
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
  sessionTracker,
  getRecentFeedback
);

router.post(
  "/feedback/reopen",
  authenticateToken,
  requireAuth,
  sessionTracker,
  reopenFeedback
);
router.get(
  "/optimized-course-section/:courseId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  performanceMiddleware("optimized-course-section"),
  cacheMiddleware("course-section", 180), // 3 minutes cache
  getOptimizedCourseSectionData
);

module.exports = router;
