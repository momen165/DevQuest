const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const upload = require("../config/multer");
const { cacheMiddleware } = require("../utils/cache.utils");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");

// Add a course
router.post(
  "/courses",
  authenticateToken,
  requireAuth,
  sessionTracker,
  upload.single("image"),
  courseController.addCourse,
);

// Edit a course
router.put(
  "/courses/:course_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  upload.single("image"),
  courseController.editCourse,
);

// Get all courses
router.get(
  "/courses",
  cacheMiddleware("courses", 300),
  performanceMiddleware("courses"),
  courseController.getCourses,
);

// Get a specific course by ID
router.get("/courses/:course_id", courseController.getCourseById);

// Get course stats for a user
router.get(
  "/courses/:course_id/stats/:user_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.getUserCourseStats,
);

// Get user's overall stats
router.get(
  "/users/:user_id/stats",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.getUserOverallStats,
);

// Delete a course
router.delete(
  "/courses/:course_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.deleteCourse,
);

router.post(
  "/courses/enroll",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.enrollCourse,
);

router.get(
  "/courses/:course_id/enrollments/:user_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.checkEnrollmentStatus,
);

module.exports = router;
