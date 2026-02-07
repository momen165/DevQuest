const logActivity = require("../utils/logger");
const { uploadImageToS3 } = require("../utils/s3.utils");
const {
  validateCourseFields,
  validateAdmin,
  validateCourseId,
  validateEnrollmentFields,
} = require("../utils/validation.utils");
const courseQueries = require("../models/course.model");
const { AppError, asyncHandler } = require("../utils/error.utils");
const { clearCoursesCache } = require("./feedback.controller");
const {
  canAccessUser,
  getRequesterUserId,
  toIntId,
} = require("../utils/authz.utils");

/**
 * Creates a new course in the system
 *
 * This function validates admin permissions, processes course data,
 * handles image uploads if provided, and saves the course to the database.
 * After successful creation, it clears the courses cache and logs the activity.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - The course data
 * @param {string} req.body.title - Course title
 * @param {string} req.body.description - Course description
 * @param {string} req.body.status - Course status (Draft/Published)
 * @param {string} req.body.difficulty - Course difficulty level
 * @param {number} req.body.language_id - ID of the programming language
 * @param {Object} req.file - Optional image file
 * @param {Object} req.user - Authenticated user information
 *
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with the newly created course data
 * @throws {AppError} If validation fails or course insertion fails
 */
const addCourse = asyncHandler(async (req, res) => {
  // Validate user permissions and request data
  validateAdmin(req.user);
  validateCourseFields(req.body);

  const { title, description, status, difficulty, language_id } = req.body;
  let imageUrl = null;

  // Handle image upload if provided
  try {
    if (req.file) {
      imageUrl = await uploadImageToS3(req.file, title); // Pass title for consistent naming
    }
  } catch (error) {
    throw new AppError(`Image upload failed: ${error.message}`, 400);
  }

  // Insert course into database
  const result = await courseQueries.insertCourse(
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl
  );

  if (result.rowCount === 0) {
    throw new AppError("Failed to add course", 400);
  }

  const createdCourse = result.rows[0];

  // Clear courses cache after adding new course
  clearCoursesCache(createdCourse.course_id);

  // Log activity
  await logActivity(
    "Course",
    `New course added: ${title} by user ID ${req.user.userId}`,
    req.user.userId
  );

  res.status(201).json(createdCourse);
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
    course_id,
    title,
    description,
    status,
    difficulty,
    language_id,
    imageUrl
  );

  if (result.rowCount === 0) {
    throw new AppError("Course not found", 404);
  }

  const updatedCourse = result.rows[0];

  // Clear courses cache after editing course
  clearCoursesCache(course_id);

  await logActivity(
    "Course",
    `Course updated: ${title} by user ID ${req.user.userId}`,
    req.user.userId
  );
  res.status(200).json(updatedCourse);
});

const deleteCourse = asyncHandler(async (req, res) => {
  validateAdmin(req.user);
  const { course_id } = req.params;
  validateCourseId(course_id);

  await courseQueries.deleteCourseData(course_id);

  // Clear courses cache after deleting course
  clearCoursesCache(course_id);

  await logActivity(
    "Course",
    `Course deleted by user ID ${req.user.userId}`,
    req.user.userId
  );
  res
    .status(200)
    .json({ message: "Course and related data deleted successfully." });
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
    throw new AppError(
      "The course you are looking for does not exist or has been removed",
      404
    );
  }

  const course = result.rows[0];

  // Only allow access to published courses unless user is admin
  if (course.status !== "Published" && (!req.user || !req.user.admin)) {
    throw new AppError("This course is currently not available", 403);
  }

  res.status(200).json(course);
});

const getUserCourseStats = asyncHandler(async (req, res) => {
  const { course_id, user_id } = req.params;
  const normalizedCourseId = toIntId(course_id);
  const normalizedUserId = toIntId(user_id);

  validateCourseId(normalizedCourseId);

  if (!normalizedUserId) {
    throw new AppError("Invalid user ID", 400);
  }

  if (!canAccessUser(req, normalizedUserId)) {
    throw new AppError("Access denied", 403);
  }

  const result = await courseQueries.getUserCourseStats(
    normalizedUserId,
    normalizedCourseId
  );

  const stats = {
    name: result.rows[0]?.name || "",
    profileImage: result.rows[0]?.profileimage || "",
    courseXP: parseInt(result.rows[0]?.total_xp) || 0,
    exercisesCompleted: parseInt(result.rows[0]?.completed_exercises) || 0,
    streak: result.rows[0]?.streak || 0,
  };

  res.status(200).json(stats);
});

const enrollCourse = asyncHandler(async (req, res) => {
  validateEnrollmentFields(req.body);
  const requesterId = getRequesterUserId(req);
  const normalizedCourseId = toIntId(req.body.course_id);

  if (!requesterId) {
    throw new AppError("Authentication required", 401);
  }

  validateCourseId(normalizedCourseId);

  try {
    const result = await courseQueries.enrollUser(requesterId, normalizedCourseId);
    res
      .status(200)
      .json({ message: "Enrollment successful", result: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(200).json({
        message: "Already enrolled",
        result: null,
      });
    }
    throw error;
  }
});

const checkEnrollmentStatus = asyncHandler(async (req, res) => {
  const { user_id, course_id } = req.params;
  const normalizedCourseId = toIntId(course_id);
  const normalizedUserId = toIntId(user_id);

  validateCourseId(normalizedCourseId);

  if (!normalizedUserId) {
    throw new AppError("Invalid user ID", 400);
  }

  if (!canAccessUser(req, normalizedUserId)) {
    throw new AppError("Access denied", 403);
  }

  const result = await courseQueries.checkEnrollment(
    normalizedUserId,
    normalizedCourseId
  );
  res.status(200).json({ isEnrolled: result.rowCount > 0 });
});

const getUserOverallStats = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const normalizedUserId = toIntId(user_id);

  if (!normalizedUserId) {
    throw new AppError("Invalid user ID", 400);
  }

  if (!canAccessUser(req, normalizedUserId)) {
    throw new AppError("Access denied", 403);
  }

  const result = await courseQueries.getUserOverallStats(normalizedUserId);

  const stats = {
    name: result.rows[0]?.name || "",
    profileImage: result.rows[0]?.profileimage || "",
    completedCourses: parseInt(result.rows[0]?.completed_courses) || 0,
    exercisesCompleted:
      parseInt(result.rows[0]?.total_exercises_completed) || 0,
    totalXP: parseInt(result.rows[0]?.total_xp) || 0,
    level: parseInt(result.rows[0]?.level) || 0,
    streak: result.rows[0]?.streak || 0,
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
