const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const sanitizeInput = require("../middleware/sanitizeInput");
const cors = require("cors");

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

// Rate limiting middleware for student routes
const studentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

// CORS options for student routes
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Routes
router.get(
  "/students",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getAllStudents
);
router.get(
  "/students/:studentId",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getStudentById
);
router.get(
  "/students/:studentId/courses",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getCoursesByStudentId
);
router.get(
  "/students/:userId/enrollments",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getEnrollmentsByUserId
);
router.get(
  "/student/stats/:userId",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getStudentStats
);
router.get(
  "/student/courses/:courseId/stats",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  getCourseStats
);
router.delete(
  "/student/delete-account",
  authenticateToken,
  requireAuth,
  studentRateLimiter,
  sanitizeInput,
  cors(corsOptions),
  deleteStudentAccount
);

// Export router
module.exports = router;
