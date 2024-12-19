const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const authenticateToken = require('../middleware/auth');

// Admin routes
router.post('/sections', authenticateToken, sectionController.addSection);
router.get('/admin/sections/course', authenticateToken, sectionController.getAdminSections); // For admin panel
router.put('/sections/:section_id', authenticateToken, sectionController.editSection);
router.delete('/sections/:section_id', authenticateToken, sectionController.deleteSection);
router.post('/sections/reorder', authenticateToken, sectionController.reorderSections);

router.get('/sections/:sectionId', authenticateToken, sectionController.getSectionById);
// User routes
router.get('/sections/course/:courseId', authenticateToken, sectionController.getUserSections); // For users

module.exports = router;