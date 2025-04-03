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

// Routes
router.get("/students", authenticateToken, requireAuth, getAllStudents);
router.get(
  "/students/:studentId",
  authenticateToken,
  requireAuth,
  getStudentById
);
router.get(
  "/students/:studentId/courses",
  authenticateToken,
  requireAuth,
  getCoursesByStudentId
);
router.get(
  "/students/:userId/enrollments",
  authenticateToken,
  requireAuth,
  getEnrollmentsByUserId
);
router.get(
  "/student/stats/:userId",
  authenticateToken,
  requireAuth,
  getStudentStats
);
router.get(
  "/student/courses/:courseId/stats",
  authenticateToken,
  requireAuth,
  getCourseStats
);
router.delete(
  "/student/delete-account",
  authenticateToken,
  requireAuth,
  deleteStudentAccount
);

// Export router
module.exports = router;
