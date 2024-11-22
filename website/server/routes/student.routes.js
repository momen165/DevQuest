const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
} = require('../controllers/student.controller');
const authenticateToken = require('../middleware/auth');

// Routes
router.get('/students', authenticateToken, getAllStudents);
router.get('/students/:studentId', authenticateToken, getStudentById);
router.get('/students/:studentId/courses', authenticateToken, getCoursesByStudentId);

module.exports = router;
