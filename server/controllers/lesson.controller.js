const logActivity = require("../utils/logger");
const he = require("he");
const { AppError, asyncHandler } = require("../utils/error.utils");
const lessonQueries = require("../models/lesson.model");
const db = require("../config/database");

const FREE_LESSON_LIMIT = 5;

// Add a new lesson
const addLesson = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const {
    section_id,
    name,
    content,
    xp,
    test_cases,
    template_code,
    hint,
    solution,
  } = req.body;

  if (!section_id || !name || !content) {
    throw new AppError("section_id, name, and content are required.", 400);
  }

  const nextOrder = await lessonQueries.getNextOrder(section_id);
  const result = await lessonQueries.insertLesson(
    section_id,
    name,
    content,
    xp,
    test_cases,
    nextOrder,
    template_code ? he.decode(template_code) : "",
    hint,
    solution
  );

  // Get course_id from section
  const courseResult = await lessonQueries.getCourseIdFromSection(section_id);
  const courseId = courseResult.rows[0].course_id;
  const courseName = courseResult.rows[0].course_name;
  const sectionName = courseResult.rows[0].section_name;

  // Log lesson creation
  await logActivity(
    "lesson_created",
    `Admin (ID: ${req.user.user_id}) created lesson "${name}" in section "${sectionName}" (ID: ${section_id}) of course "${courseName}" (ID: ${courseId}).`,
    parseInt(req.user.user_id)
  );

  // Recalculate progress for all enrolled users
  await lessonQueries.recalculateProgressForCourse(courseId);

  res.status(201).json(result.rows[0]);
});

// Fix existing lesson orders
const fixLessonOrders = asyncHandler(async (req, res) => {
  const sections = await lessonQueries.getAllSections();

  for (const section of sections.rows) {
    const lessons = await lessonQueries.getLessonsBySectionForOrdering(
      section.section_id
    );

    for (let i = 0; i < lessons.rows.length; i++) {
      await lessonQueries.updateLessonOrder(lessons.rows[i].lesson_id, i);
    }
  }

  res.status(200).json({ message: "Lesson orders fixed successfully" });
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
    const completedLessons =
      parseInt(subscriptionResult.rows[0]?.lesson_count) || 0;
    const hasActiveSubscription = Boolean(
      subscriptionResult.rows[0]?.subscription_id
    );

    // If user has no active subscription and has completed the free lesson limit
    if (!hasActiveSubscription && completedLessons >= FREE_LESSON_LIMIT) {
      return res.status(403).json({
        status: "subscription_required",
        message:
          "You have reached the free lesson limit. Please subscribe to continue learning.",
      });
    }

    const result = await lessonQueries.getLessonById(lessonId);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "not_found",
        message: "Lesson not found",
      });
    }

    const lessonData = result.rows[0]; // Check if this is the first lesson in the section
    const sectionLessonsQuery = `
      SELECT l.lesson_id, l.lesson_order, lp.completed
      FROM lesson l
      LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $1
      WHERE l.section_id = $2
      ORDER BY l.lesson_order ASC
    `;

    const sectionLessons = await db.query(sectionLessonsQuery, [
      userId,
      lessonData.section_id,
    ]);

    // First lesson is always accessible
    if (
      sectionLessons.rows.length > 0 &&
      sectionLessons.rows[0].lesson_id === parseInt(lessonId)
    ) {
      // This is the first lesson in the section - always allowed
    } else {
      // Not the first lesson, check if previous lesson is completed
      let currentLessonIndex = -1;
      let previousLessonCompleted = false;

      for (let i = 0; i < sectionLessons.rows.length; i++) {
        if (sectionLessons.rows[i].lesson_id === parseInt(lessonId)) {
          currentLessonIndex = i;
          break;
        }
      }

      if (currentLessonIndex > 0) {
        previousLessonCompleted = Boolean(
          sectionLessons.rows[currentLessonIndex - 1].completed
        );

        // If the previous lesson is not completed, check if this is the first section
        if (!previousLessonCompleted) {
          const sectionsQuery = `
            SELECT s.section_id, s.section_order 
            FROM section s
            WHERE s.course_id = (
              SELECT course_id FROM section WHERE section_id = $1
            )
            ORDER BY s.section_order ASC
          `;

          const sectionsResult = await db.query(sectionsQuery, [
            lessonData.section_id,
          ]);

          // If not the first section, check if all lessons in the previous section are completed
          if (
            sectionsResult.rows.length > 0 &&
            sectionsResult.rows[0].section_id !== lessonData.section_id
          ) {
            // Get all lessons from previous section
            let prevSectionIndex = -1;
            for (let i = 0; i < sectionsResult.rows.length; i++) {
              if (sectionsResult.rows[i].section_id === lessonData.section_id) {
                prevSectionIndex = i - 1;
                break;
              }
            }

            if (prevSectionIndex >= 0) {
              const prevSectionId =
                sectionsResult.rows[prevSectionIndex].section_id;

              // Check if all lessons in the previous section are completed
              const prevSectionLessonsQuery = `
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) as completed
                FROM lesson l
                LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $1
                WHERE l.section_id = $2
              `;

              const prevSectionResult = await db.query(
                prevSectionLessonsQuery,
                [userId, prevSectionId]
              );

              const totalLessons = parseInt(prevSectionResult.rows[0].total);
              const completedLessons = parseInt(
                prevSectionResult.rows[0].completed || 0
              );

              if (totalLessons > 0 && completedLessons < totalLessons) {
                return res.status(403).json({
                  status: "locked",
                  message:
                    "You need to complete all lessons in the previous section first.",
                });
              }
            }
          }

          // If the previous lesson in this section is not completed
          return res.status(403).json({
            status: "locked",
            message: "You need to complete the previous lesson first.",
          });
        }
      }
    }

    res.json(lessonData);
  } catch (err) {
    throw new AppError(err.message, 500);
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
    auto_detect,
  } = req.body;

  console.log("Updating lesson with data:", {
    lesson_id,
    name,
    xp,
    test_cases,
    section_id,
    auto_detect,
  });

  try {
    // Instead, use the test cases directly
    const result = await lessonQueries.updateLesson(
      lesson_id,
      name,
      content,
      xp,
      test_cases, // Use original test cases
      section_id,
      template_code ? he.decode(template_code) : "",
      hint,
      solution,
      test_cases[0]?.auto_detect || false // Use first test case's auto_detect value
    );

    if (result.rows.length === 0) {
      throw new AppError("Lesson not found", 404);
    }

    // Get course and section info before logging
    const courseInfo = await lessonQueries.getCourseIdFromSection(section_id);
    const {
      course_id: courseId,
      course_name: courseName,
      section_name: sectionName,
    } = courseInfo.rows[0];

    // Log lesson update
    await logActivity(
      "lesson_updated",
      `Admin (ID: ${req.user.user_id}) updated lesson "${name}" (ID: ${lesson_id}) in section "${sectionName}" (ID: ${section_id}) of course "${courseName}" (ID: ${courseId}). `,
      parseInt(req.user.user_id)
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating lesson:", error);
    throw new AppError(error.message, 500);
  }
});

// Delete a lesson
const deleteLesson = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const { lesson_id } = req.params;

  // Get lesson name before deletion for logging
  const lessonResult = await lessonQueries.getLessonById(lesson_id);
  if (lessonResult.rows.length === 0) {
    throw new AppError("Lesson not found.", 404);
  }
  const lessonName = lessonResult.rows[0].name;

  await lessonQueries.deleteLessonProgress(lesson_id);
  const result = await lessonQueries.deleteLesson(lesson_id);

  if (result.rows.length === 0) {
    throw new AppError("Lesson not found.", 404);
  }

  // Get course and section info before deletion logging
  const courseInfo = await lessonQueries.getCourseIdFromSection(
    lessonResult.rows[0].section_id
  );
  const {
    course_id: courseId,
    course_name: courseName,
    section_name: sectionName,
  } = courseInfo.rows[0];

  // Log lesson deletion
  await logActivity(
    "lesson_deleted",
    `Admin (ID: ${req.user.user_id}) deleted lesson "${lessonName}" (ID: ${lesson_id}) from section "${sectionName}" (ID: ${lessonResult.rows[0].section_id}) of course "${courseName}" (ID: ${courseId})`,
    parseInt(req.user.user_id)
  );

  res.status(200).json({ message: "Lesson deleted successfully." });
});

// Reorder lessons
const reorderLessons = asyncHandler(async (req, res) => {
  const { lessons } = req.body;

  if (!Array.isArray(lessons)) {
    throw new AppError(
      "Invalid request format. Expected an array of lessons.",
      400
    );
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await Promise.all(
      lessons.map(({ lesson_id, order }) =>
        lessonQueries.updateLessonOrder(lesson_id, order, client)
      )
    );
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

const updateLessonProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id, completed, submitted_code } = req.body;

  if (!user_id || !lesson_id || completed === undefined) {
    throw new AppError("Missing required fields.", 400);
  }

  const courseResult = await lessonQueries.getCourseIdForLesson(lesson_id);
  if (courseResult.rows.length === 0) {
    throw new AppError("Lesson not found or not linked to a course.", 404);
  }

  const courseId = courseResult.rows[0].course_id;
  const checkResult = await lessonQueries.checkLessonProgress(
    user_id,
    lesson_id
  );
  const sanitizedCode = he.decode(submitted_code);
  const completedAt = completed ? new Date() : null;

  if (checkResult.rows.length > 0) {
    const updateResult = await lessonQueries.updateLessonProgress(
      user_id,
      lesson_id,
      completed,
      completedAt,
      sanitizedCode
    );

    if (updateResult.rows.length === 0) {
      throw new AppError("Error updating progress.", 404);
    }
  } else {
    await lessonQueries.insertLessonProgress(
      user_id,
      lesson_id,
      completed,
      completedAt,
      courseId,
      sanitizedCode
    );
  }

  const totalLessonsResult = await lessonQueries.getTotalLessonsCount(courseId);
  const totalLessons = parseInt(totalLessonsResult.rows[0].total_lessons, 10);

  const completedLessonsResult = await lessonQueries.getCompletedLessonsCount(
    user_id,
    courseId
  );
  const completedLessons = parseInt(
    completedLessonsResult.rows[0].completed_lessons,
    10
  );

  const progress = (completedLessons / totalLessons) * 100;
  const updateEnrollmentResult = await lessonQueries.updateEnrollmentProgress(
    progress,
    user_id,
    courseId
  );

  if (updateEnrollmentResult.rows.length === 0) {
    throw new AppError("Enrollment not found.", 404);
  }

  res.status(200).json({
    message: "Lesson progress and enrollment updated.",
    data: updateEnrollmentResult.rows[0],
  });
});

const getLessonProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id } = req.query;

  if (!user_id || !lesson_id) {
    throw new AppError("user_id and lesson_id are required.", 400);
  }

  const result = await lessonQueries.getLessonProgress(user_id, lesson_id);

  if (result.rows.length === 0) {
    return res
      .status(200)
      .json({ completed: false, completed_at: null, submitted_code: "" });
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
    throw new AppError("Either section_id or course_id must be provided.", 400);
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
  fixLessonOrders,
};
