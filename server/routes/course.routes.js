const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const upload = require("../config/multer");

// Add a course
router.post(
  "/courses",
  authenticateToken,
  requireAuth,
  sessionTracker,
  upload.single("image"),
  courseController.addCourse
);

// Edit a course
router.put(
  "/courses/:course_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  upload.single("image"),
  courseController.editCourse
);

// Get all courses
router.get("/courses", courseController.getCourses);

// Get a specific course by ID
router.get("/courses/:course_id", courseController.getCourseById);

// Get course stats for a user
router.get(
  "/courses/:course_id/stats/:user_id",
  courseController.getUserCourseStats
);

// Get user's overall stats
router.get("/users/:user_id/stats", courseController.getUserOverallStats);

// Delete a course
router.delete(
  "/courses/:course_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.deleteCourse
);

router.post(
  "/courses/enroll",
  authenticateToken,
  requireAuth,
  sessionTracker,
  courseController.enrollCourse
);

router.get(
  "/courses/:course_id/enrollments/:user_id",
  courseController.checkEnrollmentStatus
);

module.exports = router;
