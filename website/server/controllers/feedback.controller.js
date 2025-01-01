const db = require('../config/database');
const { sendFeedbackReplyEmail } = require('./auth.controller');

// SQL Queries
const QUERIES = {
  getAllFeedback: `
    SELECT f.feedback_id, u.name AS student_name, c.name AS course_name, 
           f.comment AS feedback, f.rating, f.status
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    ORDER BY f.feedback_id DESC
  `,
  getPublicFeedback: `
    SELECT f.feedback_id, f.rating, f.comment, u.name, u.profileimage, 
           u.country, c.name as course_name, c.difficulty
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE f.rating >= 4 AND f.comment IS NOT NULL AND f.comment != ''
    ORDER BY f.rating DESC, RANDOM()
    LIMIT 5
  `
};

// Error handler wrapper
const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(`Error in ${fn.name}:`, error.message);
    res.status(500).json({ error: `Failed to ${fn.name}` });
  }
};

// Get all feedback for admins
const getFeedback = handleAsync(async (req, res) => {
  if (!req.user.admin) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  const { rows } = await db.query(QUERIES.getAllFeedback);
  res.status(200).json(rows || []);
});

// Get courses with ratings and user counts
const getCoursesWithRatings = handleAsync(async (req, res) => {
  const [courses, ratings, userscount] = await Promise.all([
    db.query('SELECT * FROM course'),
    db.query('SELECT course_id, ROUND(AVG(rating), 2) AS avg_rating FROM feedback GROUP BY course_id'),
    db.query('SELECT course_id, COUNT(user_id) AS userscount FROM enrollment GROUP BY course_id')
  ]);

  const ratingsMap = Object.fromEntries(ratings.rows.map(r => [r.course_id, r.avg_rating]));
  const userscountMap = Object.fromEntries(userscount.rows.map(u => [u.course_id, u.userscount]));

  res.status(200).json({ 
    courses: courses.rows, 
    ratings: ratingsMap, 
    userscount: userscountMap 
  });
});

// Submit feedback
const submitFeedback = handleAsync(async (req, res) => {
  const { course_id, rating, comment } = req.body;
  
  if (!course_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ 
      error: 'Invalid input. Provide a valid course ID and a rating between 1 and 5.' 
    });
  }

  const courseExists = await db.query('SELECT 1 FROM course WHERE course_id = $1', [course_id]);
  if (!courseExists.rowCount) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const { rows } = await db.query(
    'INSERT INTO feedback (user_id, course_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.userId, course_id, rating, comment || null]
  );

  res.status(201).json({ message: 'Feedback submitted successfully!', feedback: rows[0] });
});

// Reply to feedback
const replyToFeedback = handleAsync(async (req, res) => {
  const { feedback_id, reply } = req.body;

  if (!feedback_id || !reply) {
    return res.status(400).json({ error: 'Feedback ID and reply message are required.' });
  }

  await db.query('BEGIN');
  try {
    const [updateResult, userDetails] = await Promise.all([
      db.query('UPDATE feedback SET status = $1 WHERE feedback_id = $2 RETURNING *', ['closed', feedback_id]),
      db.query('SELECT u.email, u.name, f.comment FROM feedback f JOIN users u ON f.user_id = u.user_id WHERE f.feedback_id = $1', [feedback_id])
    ]);

    if (!updateResult.rows.length) {
      throw new Error('Feedback not found');
    }

    const { email, name, comment } = userDetails.rows[0];
    await sendFeedbackReplyEmail(email, name, comment, reply);
    await db.query('COMMIT');

    res.status(200).json({ 
      message: 'Reply sent successfully and feedback closed.',
      feedback: updateResult.rows[0]
    });
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});

// Get public feedback
const getPublicFeedback = handleAsync(async (req, res) => {
  const { rows } = await db.query(QUERIES.getPublicFeedback);
  res.status(200).json(rows);
});

module.exports = { 
  getFeedback, 
  submitFeedback, 
  getCoursesWithRatings, 
  replyToFeedback, 
  getPublicFeedback 
};