const express = require('express');
const router = express.Router();

// Controllers
const {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
} = require('../controllers/student.controller');

// Middleware
const authenticateToken = require('../middleware/auth');

// Routes
router.get('/students', authenticateToken, getAllStudents);
router.get('/students/:studentId', authenticateToken, getStudentById);
router.get('/students/:studentId/courses', authenticateToken, getCoursesByStudentId);

// Export router
module.exports = router;
