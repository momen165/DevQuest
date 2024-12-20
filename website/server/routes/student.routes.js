const express = require('express');
const router = express.Router();

// Controllers
const {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getStudentStats,
  getCourseStats,
} = require('../controllers/student.controller');

// Middleware
const authenticateToken = require('../middleware/auth');

// Routes
router.get('/students', authenticateToken, getAllStudents);
router.get('/students/:studentId', authenticateToken, getStudentById);
router.get('/students/:studentId/courses', authenticateToken, getCoursesByStudentId);
router.get('/students/:userId/enrollments', authenticateToken, getEnrollmentsByUserId);
router.get('/student/stats/:userId', authenticateToken, getStudentStats);
router.get('/student/courses/:courseId/stats', authenticateToken, getCourseStats);

// Export router
module.exports = router;
