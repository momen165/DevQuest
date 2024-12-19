const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// Controllers
const {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getStudentStats, // Add this line
} = require('../controllers/student.controller');

// Middleware

// Routes
router.get('/students', authenticateToken, getAllStudents);
router.get('/students/:studentId', authenticateToken, getStudentById);
router.get('/students/:studentId/courses', authenticateToken, getCoursesByStudentId);
router.get('/students/:userId/enrollments', authenticateToken, getEnrollmentsByUserId);
router.get('/students/:studentId/stats', authenticateToken, getStudentStats); // Add this line

// Export router
module.exports = router;
