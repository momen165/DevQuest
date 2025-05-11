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

// Routes
router.get("/students", authenticateToken, requireAuth, sessionTracker, getAllStudents);
router.get(
  "/students/:studentId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getStudentById
);
router.get(
  "/students/:studentId/courses",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getCoursesByStudentId
);
router.get(
  "/students/:userId/enrollments",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getEnrollmentsByUserId
);
router.get(
  "/student/stats/:userId",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getStudentStats
);
router.get(
  "/student/courses/:courseId/stats",
  authenticateToken,
  requireAuth,
  sessionTracker,
  getCourseStats
);
router.delete(
  "/student/delete-account",
  authenticateToken,
  requireAuth,
  sessionTracker,
  deleteStudentAccount
);

// Export router
module.exports = router;
