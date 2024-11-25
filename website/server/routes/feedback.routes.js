const express = require('express');
const { getFeedback, submitFeedback } = require('../controllers/feedback.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware

const router = express.Router();

router.get('/feedback', authenticateToken, getFeedback);
router.post('/feedbackFormStudent', authenticateToken, submitFeedback);

module.exports = router;
