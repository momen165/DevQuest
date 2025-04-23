const express = require("express");
const router = express.Router();
const sectionController = require("../controllers/section.controller");
const { authenticateToken, requireAuth } = require("../middleware/auth");

// Admin routes
router.post(
  "/sections",
  authenticateToken,
  requireAuth,
  sectionController.addSection
);
router.get(
  "/admin/sections",
  authenticateToken,
  requireAuth,
  sectionController.getAdminSections
);
router.put(
  "/sections/:section_id",
  authenticateToken,
  requireAuth,
  sectionController.editSection
);
router.delete(
  "/sections/:section_id",
  authenticateToken,
  requireAuth,
  sectionController.deleteSection
);
router.post(
  "/sections/reorder",
  authenticateToken,
  requireAuth,
  sectionController.reorderSections
);

// User routes
router.get("/sections", authenticateToken, sectionController.getAdminSections);
router.get(
  "/sections/course/:courseId",
  authenticateToken,
  sectionController.getUserSections
);
router.get(
  "/sections/:section_id",
  authenticateToken,
  sectionController.getSectionById
);

module.exports = router;
