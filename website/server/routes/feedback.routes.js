const express = require('express');
const { getFeedback, submitFeedback, getCoursesWithRatings} = require('../controllers/feedback.controller');
const authenticateToken = require('../middleware/auth'); // Add your authentication middleware

const router = express.Router();

router.get('/feedback', authenticateToken, getFeedback);
router.post('/feedbackFormStudent', authenticateToken, submitFeedback);

router.get('/getCoursesWithRatings',  getCoursesWithRatings);
module.exports = router;
