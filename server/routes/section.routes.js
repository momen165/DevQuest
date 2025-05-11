const express = require("express");
const router = express.Router();
const sectionController = require("../controllers/section.controller");
const sessionTracker = require("../middleware/sessionTracker");
const { authenticateToken, requireAuth } = require("../middleware/auth");

// Admin routes
router.post(
  "/sections",
  authenticateToken,
  requireAuth,
  sessionTracker,
  sectionController.addSection
);
router.get(
  "/admin/sections",
  authenticateToken,
  requireAuth,
  sessionTracker,
  sectionController.getAdminSections
);
router.put(
  "/sections/:section_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  sectionController.editSection
);
router.delete(
  "/sections/:section_id",
  authenticateToken,
  requireAuth,
  sessionTracker,
  sectionController.deleteSection
);
router.post(
  "/sections/reorder",
  authenticateToken,
  requireAuth,
  sessionTracker,
  sectionController.reorderSections
);

// User routes
router.get("/sections", authenticateToken, sessionTracker, sectionController.getAdminSections);
router.get(
  "/sections/course/:courseId",
  authenticateToken,
  sessionTracker,
  sectionController.getUserSections
);
router.get(
  "/sections/:section_id",
  authenticateToken,
  sessionTracker,
  sectionController.getSectionById
);

module.exports = router;
