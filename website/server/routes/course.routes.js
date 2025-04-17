const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("../middleware/sanitizeInput");
const cors = require("cors");
const courseController = require("../controllers/course.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");
const upload = require("../config/multer");

// Rate limiting for course routes
const courseRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// Apply rate limiting, input sanitization, and CORS policies to all course routes
router.use(courseRateLimiter);
router.use(sanitizeInput);
router.use(cors());

// Add a course
router.post(
  "/courses",
  authenticateToken,
  requireAuth,
  upload.single("image"),
  courseController.addCourse
);

// Edit a course
router.put(
  "/courses/:course_id",
  authenticateToken,
  requireAuth,
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
  courseController.deleteCourse
);

router.post(
  "/courses/enroll",
  authenticateToken,
  requireAuth,
  courseController.enrollCourse
);

router.get(
  "/courses/:course_id/enrollments/:user_id",
  courseController.checkEnrollmentStatus
);

module.exports = router;
