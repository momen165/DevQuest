const express = require('express');
const router = express.Router();
const { getFeedbackRatings } = require('../controllers/feedback.controller');

// Route to fetch average feedback ratings for each course
router.get('/feedback', getFeedbackRatings);

module.exports = router;
