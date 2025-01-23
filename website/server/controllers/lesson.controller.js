const logActivity = require('../utils/logger');
const he = require('he');
const { AppError, asyncHandler } = require('../utils/error.utils');
const lessonQueries = require('../models/lesson.model');
const db = require('../config/database');

const FREE_LESSON_LIMIT = 5;

// Add a new lesson
const addLesson = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError('Access denied. Admins only.', 403);
  }

  const { section_id, name, content, xp, test_cases, template_code, hint, solution } = req.body;

  if (!section_id || !name || !content) {
    throw new AppError('section_id, name, and content are required.', 400);
  }

  const nextOrder = await lessonQueries.getNextOrder(section_id);
  const decodedTemplateCode = template_code ? he.decode(template_code) : '';
  const result = await lessonQueries.insertLesson(
    section_id, 
    name, 
    content, 
    xp, 
    test_cases, 
    nextOrder, 
    decodedTemplateCode,
    hint,
    solution
  );

  // Get course_id from section
  const courseResult = await lessonQueries.getCourseIdFromSection(section_id);
  const courseId = courseResult.rows[0].course_id;

  // Recalculate progress for all enrolled users
  await lessonQueries.recalculateProgressForCourse(courseId);
  
  res.status(201).json(result.rows[0]);
});

// Fix existing lesson orders
const fixLessonOrders = asyncHandler(async (req, res) => {
  const sections = await lessonQueries.getAllSections();
  
  for (const section of sections.rows) {
    const lessons = await lessonQueries.getLessonsBySection(section.section_id);
    
    for (let i = 0; i < lessons.rows.length; i++) {
      await lessonQueries.updateLessonOrder(lessons.rows[i].lesson_id, i);
    }
  }
  
  res.status(200).json({ message: 'Lesson orders fixed successfully' });
});

// Get all lessons for a specific section
const getLessonsBySection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const userId = req.user.user_id;

  const result = await lessonQueries.getLessonsBySection(userId, sectionId);
  res.json(result.rows);
});

// Get a specific lesson by ID
const getLessonById = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.user_id;

  // Check subscription status and completed lessons count
  const subscriptionQuery = `
    WITH completed_lessons AS (
      SELECT COUNT(*) as lesson_count
      FROM lesson_progress
      WHERE user_id = $1 AND completed = true
    ),
    subscription_status AS (
      SELECT s.*
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      WHERE us.user_id = $1 
      AND s.status = 'active'
      AND s.subscription_end_date > CURRENT_TIMESTAMP
      ORDER BY s.subscription_start_date DESC
      LIMIT 1
    )
    SELECT 
      cl.lesson_count,
      s.*
    FROM completed_lessons cl
    LEFT JOIN subscription_status s ON true;
  `;

  try {
    const subscriptionResult = await db.query(subscriptionQuery, [userId]);
    const completedLessons = parseInt(subscriptionResult.rows[0]?.lesson_count) || 0;
    const hasActiveSubscription = Boolean(subscriptionResult.rows[0]?.subscription_id);

    // If user has no active subscription and has completed the free lesson limit
    if (!hasActiveSubscription && completedLessons >= FREE_LESSON_LIMIT) {
      return res.status(403).json({
        status: 'subscription_required',
        message: 'You have reached the free lesson limit. Please subscribe to continue learning.'
      });
    }

    const result = await lessonQueries.getLessonById(lessonId);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Lesson not found'
      });
    }

    const lessonData = result.rows[0];

    try {
      lessonData.test_cases = Array.isArray(lessonData.test_cases)
        ? lessonData.test_cases.map(testCase => ({
            input: testCase.input || '',
            expectedOutput: testCase.expected_output || '',
            preserveFormat: true
          }))
        : [{ input: '', expectedOutput: '', preserveFormat: true }];
    } catch (err) {
      lessonData.test_cases = [{ input: '', expectedOutput: '', preserveFormat: true }];
    }

    res.status(200).json(lessonData);
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Unable to load lesson. Please try again later.'
    });
  }
});

const updateLesson = asyncHandler(async (req, res) => {
  const { lesson_id } = req.params;
  const { 
    name, 
    content, 
    xp, 
    test_cases, 
    section_id, 
    template_code, 
    hint, 
    solution,
    auto_detect
  } = req.body;

  console.log('Updating lesson with data:', {
    lesson_id,
    name,
    xp,
    test_cases,
    section_id,
    auto_detect
  });

  try {
    // Instead, use the test cases directly
    const result = await lessonQueries.updateLesson(
      lesson_id,
      name,
      content,
      xp,
      test_cases,  // Use original test cases
      section_id,
      template_code,
      hint,
      solution,
      test_cases[0]?.auto_detect || false  // Use first test case's auto_detect value
    );

    if (result.rows.length === 0) {
      throw new AppError('Lesson not found', 404);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw new AppError(error.message, 500);
  }
});

// Delete a lesson
const deleteLesson = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError('Access denied. Admins only.', 403);
  }

  const { lesson_id } = req.params;

  await lessonQueries.deleteLessonProgress(lesson_id);
  const result = await lessonQueries.deleteLesson(lesson_id);

  if (result.rows.length === 0) {
    throw new AppError('Lesson not found.', 404);
  }

  res.status(200).json({ message: 'Lesson deleted successfully.' });
});

// Reorder lessons
const reorderLessons = asyncHandler(async (req, res) => {
  const { lessons } = req.body;

  if (!Array.isArray(lessons)) {
    throw new AppError('Invalid request format. Expected an array of lessons.', 400);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await Promise.all(
      lessons.map(({ lesson_id, order }) => 
        lessonQueries.updateLessonOrder(lesson_id, order, client)
      )
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const updateLessonProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id, completed, submitted_code } = req.body;

  if (!user_id || !lesson_id || completed === undefined) {
    throw new AppError('Missing required fields.', 400);
  }

  const courseResult = await lessonQueries.getCourseIdForLesson(lesson_id);
  if (courseResult.rows.length === 0) {
    throw new AppError('Lesson not found or not linked to a course.', 404);
  }

  const courseId = courseResult.rows[0].course_id;
  const checkResult = await lessonQueries.checkLessonProgress(user_id, lesson_id);
  const sanitizedCode = he.decode(submitted_code);
  const completedAt = completed ? new Date() : null;

  if (checkResult.rows.length > 0) {
    const updateResult = await lessonQueries.updateLessonProgress(
      user_id, lesson_id, completed, completedAt, sanitizedCode
    );

    if (updateResult.rows.length === 0) {
      throw new AppError('Error updating progress.', 404);
    }
  } else {
    await lessonQueries.insertLessonProgress(
      user_id, lesson_id, completed, completedAt, courseId, sanitizedCode
    );
  }

  const totalLessonsResult = await lessonQueries.getTotalLessonsCount(courseId);
  const totalLessons = parseInt(totalLessonsResult.rows[0].total_lessons, 10);

  const completedLessonsResult = await lessonQueries.getCompletedLessonsCount(user_id, courseId);
  const completedLessons = parseInt(completedLessonsResult.rows[0].completed_lessons, 10);

  const progress = (completedLessons / totalLessons) * 100;
  const updateEnrollmentResult = await lessonQueries.updateEnrollmentProgress(progress, user_id, courseId);

  if (updateEnrollmentResult.rows.length === 0) {
    throw new AppError('Enrollment not found.', 404);
  }

  res.status(200).json({
    message: 'Lesson progress and enrollment updated.',
    data: updateEnrollmentResult.rows[0],
  });
});

const getLessonProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id } = req.query;

  if (!user_id || !lesson_id) {
    throw new AppError('user_id and lesson_id are required.', 400);
  }

  const result = await lessonQueries.getLessonProgress(user_id, lesson_id);

  if (result.rows.length === 0) {
    return res.status(200).json({ completed: false, completed_at: null, submitted_code: '' });
  }

  res.status(200).json(result.rows[0]);
});

const getLastAccessedLesson = async (userId, courseId) => {
  const result = await lessonQueries.getLastAccessedLesson(userId, courseId);
  return result.rows[0] || null;
};

const getLessons = asyncHandler(async (req, res) => {
  const { section_id, course_id } = req.query;

  if (!section_id && !course_id) {
    throw new AppError('Either section_id or course_id must be provided.', 400);
  }

  const result = await lessonQueries.getLessons(section_id, course_id);
  res.status(200).json(result.rows);
});

module.exports = {
  addLesson,
  getLessonsBySection,
  getLessonById,
  editLesson: updateLesson,
  deleteLesson,
  reorderLessons,
  updateLessonProgress,
  getLessonProgress,
  getLastAccessedLesson,
  getLessons,
  fixLessonOrders
};
