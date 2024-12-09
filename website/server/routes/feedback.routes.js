const express = require('express');
const { getFeedback, submitFeedback, getCoursesWithRatings, replyToFeedback } = require('../controllers/feedback.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware

const router = express.Router();

router.get('/feedback', authenticateToken, getFeedback);
router.post('/feedback', authenticateToken, submitFeedback);
router.post('/feedback/reply', authenticateToken, replyToFeedback);

router.get('/getCoursesWithRatings',  getCoursesWithRatings);
module.exports = router;
