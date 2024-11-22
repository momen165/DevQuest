const db = require('../config/database');

/**
 * Fetches the average feedback rating for each course.
 */
const getFeedbackRatings = async (req, res) => {
  try {
    const query = `
      SELECT course_id, ROUND(AVG(rating), 1) as average_rating 
      FROM feedback 
      GROUP BY course_id;
    `;
    const result = await db.query(query);

    // Transform the result into a key-value object
    const ratings = result.rows.reduce((acc, row) => {
      acc[row.course_id] = row.average_rating;
      return acc;
    }, {});

    res.status(200).json(ratings); // Return course_id as key and average_rating as value
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

module.exports = { getFeedbackRatings };
