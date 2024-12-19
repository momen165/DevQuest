const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const lessonController = require('../controllers/lesson.controller');

// CRUD Operations
router.post('/lesson', authenticateToken, lessonController.addLesson); // Add a lesson
router.get('/lesson', lessonController.getLessons);  // This route will handle both section_id and course_id queries
router.get('/lesson/:lessonId', authenticateToken, lessonController.getLessonById); // Get a lesson by ID
router.put('/lesson/:lesson_id', authenticateToken, lessonController.editLesson); // Update a lesson
router.delete('/lesson/:lesson_id', authenticateToken, lessonController.deleteLesson); // Delete a lesson

// Reordering Lessons
router.post('/lesson/reorder', authenticateToken, lessonController.reorderLessons); // Reorder lessons

// Update progress
router.put('/update-lesson-progress', lessonController.updateLessonProgress); // Ensure this route is correct
router.get('/lesson-progress', lessonController.getLessonProgress);

// Add this new route
router.post('/lesson/fix-orders', authenticateToken, lessonController.fixLessonOrders);

module.exports = router;