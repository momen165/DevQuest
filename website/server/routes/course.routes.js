const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const authenticateToken = require('../middleware/auth');
const upload = require('../config/multer');


// Add a course
router.post('/addCourses', authenticateToken, upload.single('image'), courseController.addCourse);

// Edit a course
router.put('/editCourses/:course_id', authenticateToken, upload.single('image'), courseController.editCourse);

// Get all courses
router.get('/courses', courseController.getCourses);

// Get a specific course by ID
router.get('/courses/:course_id', courseController.getCourseById);

// Delete a course
router.delete('/courses/:course_id', authenticateToken, courseController.deleteCourse);

router.post('/enrollCourse', authenticateToken, courseController.enrollCourse);

router.get('/enrollments/:user_id/:course_id', courseController.checkEnrollmentStatus);

module.exports = router;
