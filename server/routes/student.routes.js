const express = require("express");
const router = express.Router();

// Controllers
const {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getStudentStats,
  getCourseStats,
  deleteStudentAccount,
} = require("../controllers/student.controller");

// Middleware
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const {
  performanceMiddleware,
} = require("../middleware/performance.middleware");
const updateUserStreak = require("../middleware/updateUserStreak");

// Routes
router.get(
  "/students",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  performanceMiddleware("students-list"),

  getAllStudents,
);
router.get(
  "/students/:studentId",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  performanceMiddleware("student-details"),

  getStudentById,
);
router.get(
  "/students/:studentId/courses",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  getCoursesByStudentId,
);
router.get(
  "/students/:userId/enrollments",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  performanceMiddleware("student-enrollments"),

  getEnrollmentsByUserId,
);
router.get(
  "/student/stats/:userId",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  getStudentStats,
);
router.get(
  "/student/courses/:courseId/stats",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  getCourseStats,
);
router.delete(
  "/student/delete-account",
  authenticateToken,
  requireAuth,
  updateUserStreak,
  sessionTracker,
  deleteStudentAccount,
);

// Export router
module.exports = router;
