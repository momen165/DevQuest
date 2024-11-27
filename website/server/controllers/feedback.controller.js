const db = require('../config/database'); // Adjust path to your DB connection

// Get all feedback for admins
const getFeedback = async (req, res) => {
  try {
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const query = `
      SELECT 
        f.feedback_id, 
        u.name AS student_name, 
        c.name AS course_name, 
        f.comment AS feedback, 
        f.rating
      FROM feedback f
      JOIN users u ON f.user_id = u.user_id
      JOIN course c ON f.course_id = c.course_id
      ORDER BY f.feedback_id DESC;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows.length ? rows : []);
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};



const getCoursesWithRatings = async (req, res) => {
  try {
    const coursesQuery = 'SELECT * FROM course';
    const userscountQuery = `
      SELECT 
        course.course_id, 
        COUNT(enrollment.user_id) AS userscount 
      FROM course 
      LEFT JOIN enrollment ON course.course_id = enrollment.course_id 
      GROUP BY course.course_id
    `;
    const ratingsQuery = `
      SELECT
        course_id,
        ROUND(AVG(rating), 2) AS avg_rating
      FROM feedback
      GROUP BY course_id
    `;

    const [coursesResult, ratingsResult, userscountResult] = await Promise.all([
      db.query(coursesQuery),
      db.query(ratingsQuery),
      db.query(userscountQuery)
    ]);

    const courses = coursesResult.rows;
    const ratingsMap = ratingsResult.rows.reduce((acc, row) => {
      acc[row.course_id] = row.avg_rating;
      return acc;
    }, {});
    const userscountMap = userscountResult.rows.reduce((acc, row) => {
      acc[row.course_id] = row.userscount;
      return acc;
    }, {});

    res.status(200).json({ courses, ratings: ratingsMap, userscount: userscountMap });
  } catch (error) {
    console.error('Error fetching courses and ratings:', error.message);
    res.status(500).json({ error: 'Failed to fetch courses and ratings' });
  }
};









// Submit feedback
const submitFeedback = async (req, res) => {
  const { course_id, rating, comment } = req.body;
  const userId = req.user.userId;

  if (!course_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid input. Provide a valid course ID and a rating between 1 and 5.' });
  }

  try {
    const courseQuery = `SELECT course_id FROM course WHERE course_id = $1`;
    const courseCheck = await db.query(courseQuery, [course_id]);

    if (courseCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const feedbackQuery = `
      INSERT INTO feedback (user_id, course_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await db.query(feedbackQuery, [userId, course_id, rating, comment || null]);
    res.status(201).json({ message: 'Feedback submitted successfully!', feedback: rows[0] });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
};

module.exports = { getFeedback, submitFeedback, getCoursesWithRatings };