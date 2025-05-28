const express = require("express");
const router = express.Router();
const { authenticateToken, requireAuth } = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const lessonController = require("../controllers/lesson.controller");

// Unlock hint/solution endpoints
router.post(
  "/lesson/:lessonId/unlock-hint",
  authenticateToken,
  sessionTracker,
  lessonController.unlockHint
);
router.post(
  "/lesson/:lessonId/unlock-solution",
  authenticateToken,
  sessionTracker,
  lessonController.unlockSolution
);

// CRUD Operations
router.post(
  "/lesson",
  authenticateToken,
  requireAuth,
  sessionTracker,
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
  sessionTracker,
  lessonController.editLesson
); // Update a lesson
router.delete(
  "/lesson/:lesson_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.deleteLesson
); // Delete a lesson

// Reordering Lessons
router.post(
  "/lesson/reorder",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.reorderLessons
); // Reorder lessons

// Update progress
router.put(
  "/update-lesson-progress",
  authenticateToken,
  sessionTracker,
  lessonController.updateLessonProgress
); // User-specific progress update
router.get("/lesson-progress", lessonController.getLessonProgress);

// Add this new route
router.post(
  "/lesson/fix-orders",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.fixLessonOrders
);

router.get(
  "/lessons/section/:sectionId/progress",
  authenticateToken,
  sessionTracker,
  lessonController.getLessonsBySection
);

module.exports = router;
