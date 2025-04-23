const express = require("express");
const router = express.Router();
const { authenticateToken, requireAuth } = require("../middleware/auth");
const lessonController = require("../controllers/lesson.controller");

// CRUD Operations
router.post(
  "/lesson",
  authenticateToken,
  requireAuth,
  lessonController.addLesson
); // Add a lesson
router.get("/lesson", lessonController.getLessons); // This route will handle both section_id and course_id queries
router.get(
  "/lesson/:lessonId",
  authenticateToken,
  lessonController.getLessonById
); // Get a lesson by ID
router.put(
  "/lesson/:lesson_id",
  authenticateToken,
  requireAuth,
  lessonController.editLesson
); // Update a lesson
router.delete(
  "/lesson/:lesson_id",
  authenticateToken,
  requireAuth,
  lessonController.deleteLesson
); // Delete a lesson

// Reordering Lessons
router.post(
  "/lesson/reorder",
  authenticateToken,
  requireAuth,
  lessonController.reorderLessons
); // Reorder lessons

// Update progress
router.put(
  "/update-lesson-progress",
  authenticateToken,
  lessonController.updateLessonProgress
); // User-specific progress update
router.get("/lesson-progress", lessonController.getLessonProgress);

// Add this new route
router.post(
  "/lesson/fix-orders",
  authenticateToken,
  requireAuth,
  lessonController.fixLessonOrders
);

router.get(
  "/lessons/section/:sectionId/progress",
  authenticateToken,
  lessonController.getLessonsBySection
);

module.exports = router;
