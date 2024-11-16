const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/api/feedback', async (req, res) => {
    try {
        const result = await db.query('SELECT course_id, Round(AVG(rating)) as average_rating FROM feedback GROUP BY course_id');
        const ratings = result.rows.reduce((acc, row) => {
            acc[row.course_id] = row.average_rating;
            return acc;
        }, {});
        res.json(ratings); // Returns an object with course_id as key and average_rating as value
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

module.exports = router;