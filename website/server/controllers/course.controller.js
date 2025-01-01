const logActivity = require('../utils/logger');
const { uploadImageToS3 } = require('../utils/s3.utils');
const { 
  validateCourseFields, 
  validateAdmin, 
  validateCourseId,
  validateEnrollmentFields 
} = require('../utils/validation.utils');
const courseQueries = require('../models/course.model');
const { AppError, asyncHandler } = require('../utils/error.utils');

const addCourse = asyncHandler(async (req, res) => {
  validateAdmin(req.user);
  validateCourseFields(req.body);

  const { title, description, status, difficulty, language_id } = req.body;
  let imageUrl = null;

  if (req.file) {
    imageUrl = await uploadImageToS3(req.file);
  }

  const result = await courseQueries.insertCourse(
    title, description, status, difficulty, language_id, imageUrl
  );

  if (result.rowCount === 0) {
    throw new AppError('Failed to add course', 400);
  }

  await logActivity('Course', `New course added: ${title} by user ID ${req.user.userId}`, req.user.userId);
  res.status(201).json(result.rows[0]);
});

const editCourse = asyncHandler(async (req, res) => {
  validateAdmin(req.user);
  const { course_id } = req.params;
  validateCourseId(course_id);
  validateCourseFields(req.body);

  const { title, description, status, difficulty, language_id } = req.body;
  let imageUrl = null;

  if (req.file) {
    imageUrl = await uploadImageToS3(req.file, title);
  }

  const result = await courseQueries.updateCourse(
    course_id, title, description, status, difficulty, language_id, imageUrl
  );

  if (result.rowCount === 0) {
    throw new AppError('Course not found', 404);
  }

  await logActivity('Course', `Course updated: ${title} by user ID ${req.user.userId}`, req.user.userId);
  res.status(200).json(result.rows[0]);
});

const deleteCourse = asyncHandler(async (req, res) => {
  validateAdmin(req.user);
  const { course_id } = req.params;
  validateCourseId(course_id);

  await courseQueries.deleteCourseData(course_id);
  await logActivity('Course', `Course deleted by user ID ${req.user.userId}`, req.user.userId);
  
  res.status(200).json({ message: 'Course and related data deleted successfully.' });
});

const getCourses = asyncHandler(async (req, res) => {
  const result = await courseQueries.getAllCourses();
  res.status(200).json(result.rows);
});

const getCourseById = asyncHandler(async (req, res) => {
  const { course_id } = req.params;
  validateCourseId(course_id);

  const result = await courseQueries.getCourseById(course_id);
  
  if (result.rows.length === 0) {
    throw new AppError('Course not found', 404);
  }

  res.status(200).json(result.rows[0]);
});

const getUserCourseStats = asyncHandler(async (req, res) => {
  const { course_id, user_id } = req.params;
  validateCourseId(course_id);

  const result = await courseQueries.getUserCourseStats(user_id, course_id);
  
  const stats = {
    name: result.rows[0]?.name || '',
    profileImage: result.rows[0]?.profileimage || '',
    courseXP: parseInt(result.rows[0]?.total_xp) || 0,
    exercisesCompleted: parseInt(result.rows[0]?.completed_exercises) || 0,
    streak: result.rows[0]?.streak || 0
  };

  res.status(200).json(stats);
});

const enrollCourse = asyncHandler(async (req, res) => {
  validateEnrollmentFields(req.body);
  const { user_id, course_id } = req.body;

  const result = await courseQueries.enrollUser(user_id, course_id);
  res.status(200).json({ message: 'Enrollment successful', result: result.rows[0] });
});

const checkEnrollmentStatus = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.params;
  validateCourseId(course_id);

  const result = await courseQueries.checkEnrollment(user_id, course_id);
  res.status(200).json({ isEnrolled: result.rowCount > 0 });
});

const getUserOverallStats = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const result = await courseQueries.getUserOverallStats(user_id);
  
  const stats = {
    name: result.rows[0]?.name || '',
    profileImage: result.rows[0]?.profileimage || '',
    completedCourses: parseInt(result.rows[0]?.completed_courses) || 0,
    exercisesCompleted: parseInt(result.rows[0]?.total_exercises_completed) || 0,
    totalXP: parseInt(result.rows[0]?.total_xp) || 0,
    level: parseInt(result.rows[0]?.level) || 0,
    streak: result.rows[0]?.streak || 0
  };

  res.status(200).json(stats);
});

module.exports = {
  addCourse,
  editCourse,
  getCourses,
  getCourseById,
  deleteCourse,
  enrollCourse,
  checkEnrollmentStatus,
  getUserCourseStats,
  getUserOverallStats,
};