const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const lessonController = require('../controllers/lesson.controller');

// CRUD Operations
router.post('/lesson', authenticateToken, lessonController.addLesson); // Add a lesson
router.get('/lesson', authenticateToken, lessonController.getLessonsBySection); // Get lessons by section
router.get('/lesson/:lessonId', authenticateToken, lessonController.getLessonById); // Get a lesson by ID
router.put('/lesson/:lesson_id', authenticateToken, lessonController.editLesson); // Update a lesson
router.delete('/lesson/:lesson_id', authenticateToken, lessonController.deleteLesson); // Delete a lesson

// Reordering Lessons
router.post('/lesson/reorder', authenticateToken, lessonController.reorderLessons); // Reorder lessons

// Update progress
router.put('/update-lesson-progress', lessonController.updateLessonProgress); // Ensure this route is correct
router.get('/lesson-progress', lessonController.getLessonProgress);
module.exports = router;