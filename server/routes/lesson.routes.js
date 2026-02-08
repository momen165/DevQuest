const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  requireAuth,
  requireAdmin,
} = require("../middleware/auth");
const sessionTracker = require("../middleware/sessionTracker");
const lessonController = require("../controllers/lesson.controller");

// Unlock hint/solution endpoints
router.post(
  "/lesson/:lessonId/unlock-hint",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.unlockHint,
);
router.post(
  "/lesson/:lessonId/unlock-solution",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.unlockSolution,
);

// CRUD Operations
router.post(
  "/lesson",
  authenticateToken,
  requireAuth,
  requireAdmin,
  sessionTracker,
  lessonController.addLesson,
); // Add a lesson

router.get("/lesson", lessonController.getLessons); // This route will handle both section_id and course_id queries

// Admin route to get all lesson fields for a section
router.get(
  "/admin/lessons",
  authenticateToken,
  requireAuth,
  requireAdmin,
  lessonController.getAdminLessonsForSection,
); // Admin-specific route with all lesson fields

router.get(
  "/lesson/:lessonId",
  authenticateToken,
  requireAuth,
  lessonController.getLessonById,
); // Get a lesson by ID
router.put(
  "/lesson/:lesson_id",
  authenticateToken,
  requireAuth,
  requireAdmin,
  sessionTracker,
  lessonController.editLesson,
); // Update a lesson
router.delete(
  "/lesson/:lesson_id",
  authenticateToken,
  requireAuth,
  requireAdmin,
  sessionTracker,
  lessonController.deleteLesson,
); // Delete a lesson

// Reordering Lessons
router.post(
  "/lesson/reorder",
  authenticateToken,
  requireAuth,
  requireAdmin,
  sessionTracker,
  lessonController.reorderLessons,
); // Reorder lessons

// Update progress
router.put(
  "/update-lesson-progress",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.updateLessonProgress,
); // User-specific progress update
router.get(
  "/lesson-progress",
  authenticateToken,
  requireAuth,
  lessonController.getLessonProgress,
);

// Add this new route
router.post(
  "/lesson/fix-orders",
  authenticateToken,
  requireAuth,
  requireAdmin,
  sessionTracker,
  lessonController.fixLessonOrders,
);

// Add route for checking lesson order integrity
router.get(
  "/admin/lesson-order-integrity",
  authenticateToken,
  requireAuth,
  requireAdmin,
  lessonController.checkLessonOrderIntegrity,
);

router.get(
  "/lessons/section/:sectionId/progress",
  authenticateToken,
  requireAuth,
  sessionTracker,
  lessonController.getLessonsBySection,
);

module.exports = router;
