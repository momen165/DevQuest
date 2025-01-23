const db = require('../config/database');
const { sendFeedbackReplyEmail } = require('./auth.controller');
const NodeCache = require('node-cache');
const { AppError } = require('../utils/error.utils');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Cache key for courses data
const COURSES_CACHE_KEY = 'courses_with_ratings';

// Function to clear courses cache
const clearCoursesCache = () => {
  console.log('🧹 Cache CLEAR: Removing courses data from cache');
  cache.del(COURSES_CACHE_KEY);
};

// SQL Queries
const QUERIES = {
  getAllFeedback: `
    SELECT f.feedback_id, u.name AS student_name, c.name AS course_name, 
           f.comment, f.rating, f.status
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE ($1::int IS NULL OR f.course_id = $1)
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
  `,
  checkUserProgress: `
    SELECT e.progress, f.feedback_id
    FROM enrollment e
    LEFT JOIN feedback f ON f.user_id = e.user_id AND f.course_id = e.course_id
    WHERE e.user_id = $1 AND e.course_id = $2
  `,
  getRecentFeedback: `
    SELECT f.feedback_id, u.name AS student_name, c.name AS course_name, 
           f.comment, f.created_at
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    JOIN course c ON f.course_id = c.course_id
    WHERE f.created_at >= NOW() - INTERVAL '48 HOURS'
    ORDER BY f.created_at DESC
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
  const courseId = req.query.course_id ? parseInt(req.query.course_id) : null;
  const { rows } = await db.query(QUERIES.getAllFeedback, [courseId]);
  res.status(200).json(rows || []);
});

// Get courses with ratings and user counts
const getCoursesWithRatings = handleAsync(async (req, res) => {
  // Check cache first
  const cachedData = cache.get(COURSES_CACHE_KEY);
  if (cachedData) {
    console.log('🎯 Cache HIT: Returning cached courses data');
    return res.status(200).json(cachedData);
  }

  console.log('🔍 Cache MISS: Fetching courses data from database');
  const [courses, userscount] = await Promise.all([
    db.query('SELECT * FROM course WHERE status = \'Published\''),
    db.query('SELECT course_id, COUNT(user_id) AS userscount FROM enrollment GROUP BY course_id')
  ]); 

  console.log('DEBUG - Course statuses:', courses.rows.map(c => ({ id: c.course_id, status: c.status })));

  const userscountMap = Object.fromEntries(userscount.rows.map(u => [u.course_id, u.userscount]));

  const responseData = { 
    courses: courses.rows, 
    userscount: userscountMap 
  };

  // Store in cache
  cache.set(COURSES_CACHE_KEY, responseData);
  console.log('💾 Cache SET: Stored fresh courses data in cache');

  res.status(200).json(responseData);
});

// Add this before submitFeedback function
const checkFeedbackEligibility = async (userId, courseId) => {
  const { rows } = await db.query(QUERIES.checkUserProgress, [userId, courseId]);
  
  if (!rows.length) {
    throw new AppError('User is not enrolled in this course', 400);
  }

  const progress = parseFloat(rows[0].progress) || 0;
  const existingFeedback = rows[0].feedback_id;

  return {
    canSubmitFeedback: progress >= 30 || (existingFeedback && progress === 100),
    hasExistingFeedback: !!existingFeedback,
    progress
  };
};

// Modify submitFeedback function
const submitFeedback = handleAsync(async (req, res) => {
  const { course_id, rating, comment } = req.body;
  
  if (!course_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ 
      error: 'Invalid input. Provide a valid course ID and a rating between 1 and 5.' 
    });
  }

  const eligibility = await checkFeedbackEligibility(req.user.userId, course_id);

  if (!eligibility.canSubmitFeedback) {
    return res.status(403).json({ 
      error: 'You need to complete at least 30% of the course to submit feedback',
      progress: eligibility.progress
    });
  }

  if (eligibility.hasExistingFeedback && eligibility.progress < 100) {
    return res.status(403).json({ 
      error: 'You need to complete the entire course to submit additional feedback',
      progress: eligibility.progress
    });
  }

  const courseExists = await db.query('SELECT 1 FROM course WHERE course_id = $1', [course_id]);
  if (!courseExists.rowCount) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  await db.query('BEGIN');
  try {
    // Insert the feedback
    const { rows } = await db.query(
      'INSERT INTO feedback (user_id, course_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, course_id, rating, comment || null]
    );

    // Update course rating
    await db.query(
      `UPDATE course 
       SET rating = (
         SELECT ROUND(AVG(rating)::numeric, 2)
         FROM feedback 
         WHERE course_id = $1
       )
       WHERE course_id = $1`,
      [course_id]
    );

    await db.query('COMMIT');
    clearCoursesCache();
    res.status(201).json({ message: 'Feedback submitted successfully!', feedback: rows[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});

// Reply to feedback
const replyToFeedback = handleAsync(async (req, res) => {
  const { feedback_id, reply } = req.body;

  if (!feedback_id || !reply) {
    return res.status(400).json({ error: 'Feedback ID and reply message are required.' });
  }

  await db.query('BEGIN');
  try {
    // Get user details and feedback content with a more specific query
    const userDetails = await db.query(
      `SELECT u.email, u.name, f.comment, f.rating, c.name as course_name
       FROM feedback f 
       JOIN users u ON f.user_id = u.user_id 
       JOIN course c ON f.course_id = c.course_id
       WHERE f.feedback_id = $1`,
      [feedback_id]
    );

    if (!userDetails.rows.length) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Update the feedback status to 'closed'
    const updateResult = await db.query(
      'UPDATE feedback SET status = $1 WHERE feedback_id = $2 RETURNING *',
      ['closed', feedback_id]
    );

    const { email, name, comment, rating, course_name } = userDetails.rows[0];

    // Send email with all the necessary information
    try {
      await sendFeedbackReplyEmail({
        email,
        name,
        comment,
        rating,
        courseName: course_name,
        reply
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue with the transaction even if email fails
    }

    await db.query('COMMIT');

    res.status(200).json({ 
      message: 'Reply sent successfully and feedback closed.',
      feedback: updateResult.rows[0]
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error in replyToFeedback:', error);
    res.status(500).json({ 
      error: 'Failed to process feedback reply',
      details: error.message 
    });
  }
});

// Get public feedback
const getPublicFeedback = handleAsync(async (req, res) => {
  const { rows } = await db.query(QUERIES.getPublicFeedback);
  res.status(200).json(rows);
});

// Add this function to get recent feedback
const getRecentFeedback = handleAsync(async (req, res) => {
  const { rows } = await db.query(QUERIES.getRecentFeedback);
  res.status(200).json(rows || []);
});

const reopenFeedback = handleAsync(async (req, res) => {
  const { feedback_id } = req.body;

  if (!feedback_id) {
    return res.status(400).json({ error: 'Feedback ID is required.' });
  }

  const updateResult = await db.query(
    'UPDATE feedback SET status = $1 WHERE feedback_id = $2 RETURNING *',
    ['open', feedback_id]
  );

  if (!updateResult.rows.length) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  res.status(200).json({ 
    message: 'Feedback reopened successfully',
    feedback: updateResult.rows[0]
  });
});

module.exports = { 
  getFeedback, 
  submitFeedback, 
  getCoursesWithRatings, 
  replyToFeedback, 
  getPublicFeedback,

  checkFeedbackEligibility,
  getRecentFeedback,
  reopenFeedback,

  clearCoursesCache

};