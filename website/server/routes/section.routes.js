const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const authenticateToken = require('../middleware/auth');
const { getSectionsByCourse } = require('../controllers/section.controller');
// Add a new section
router.post('/sections', authenticateToken, sectionController.addSection);

// Get all sections for a course
router.get('/section', getSectionsByCourse);

// Edit a section
router.put('/sections/:section_id', authenticateToken, sectionController.editSection);

// Delete a section
router.delete('/sections/:section_id', authenticateToken, sectionController.deleteSection);

// Reorder sections
router.post('/sections/reorder', authenticateToken, sectionController.reorderSections);

module.exports = router;
