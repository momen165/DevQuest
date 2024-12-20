const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const authenticateToken = require('../middleware/auth');

// Admin routes
router.post('/sections', authenticateToken, sectionController.addSection);
router.get('/admin/sections', authenticateToken, sectionController.getAdminSections);
router.put('/sections/:section_id', authenticateToken, sectionController.editSection);
router.delete('/sections/:section_id', authenticateToken, sectionController.deleteSection);
router.post('/sections/reorder', authenticateToken, sectionController.reorderSections);

// User routes
router.get('/sections', authenticateToken, sectionController.getAdminSections);
router.get('/sections/course/:courseId', authenticateToken, sectionController.getUserSections);
router.get('/sections/:section_id', authenticateToken, sectionController.getSectionById);

module.exports = router;