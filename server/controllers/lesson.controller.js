const logActivity = require("../utils/logger");
const { decode: decodeEntities } = require("entities");
const { AppError, asyncHandler } = require("../utils/error.utils");
const { setCacheHeaders } = require("../utils/cache.utils");
const lessonQueries = require("../models/lesson.model");
const db = require("../config/database");
const NodeCache = require("node-cache"); // Import NodeCache

// Initialize cache for lessons with a short TTL (e.g., 60 seconds)
const lessonsCache = new NodeCache({ stdTTL: 60 });
const LESSONS_CACHE_KEY_PREFIX = "lessons_course_";

// Unlock hint for a lesson (POST /lesson/:lessonId/unlock-hint)
const unlockHint = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.user_id;
  await lessonQueries.unlockHint(userId, lessonId);
  // No caching for mutation endpoints
  setCacheHeaders(res, { noStore: true });
  res.status(200).json({ success: true });
});

// Unlock solution for a lesson (POST /lesson/:lessonId/unlock-solution)
const unlockSolution = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.user_id;
  await lessonQueries.unlockSolution(userId, lessonId);
  // No caching for mutation endpoints
  setCacheHeaders(res, { noStore: true });
  res.status(200).json({ success: true });
});

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
    template_code ? decodeEntities(template_code) : "",
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

  // Invalidate relevant caches after adding a lesson
  lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `course_${courseId}`);
  lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `section_${section_id}`);

  setCacheHeaders(res, { noStore: true });
  res.status(201).json(result.rows[0]);
});

// Fix existing lesson orders
const fixLessonOrders = asyncHandler(async (req, res) => {
  const sections = await lessonQueries.getAllSections();
  let fixedCount = 0;

  // Get all sections ordered by section_order
  const orderedSectionsQuery = `
    SELECT section_id, name
    FROM section
    ORDER BY section_order ASC
  `;
  const orderedSections = await db.query(orderedSectionsQuery);

  for (const section of orderedSections.rows) {
    const lessons = await lessonQueries.getLessonsBySectionForOrdering(
      section.section_id
    );

    for (let i = 0; i < lessons.rows.length; i++) {
      await lessonQueries.updateLessonOrder(lessons.rows[i].lesson_id, i);
      fixedCount++;
    }
  }

  // Invalidate all lesson caches after fixing orders
  lessonsCache.flushAll();

  res.status(200).json({
    message: "Lesson orders fixed successfully",
    fixedCount: fixedCount,
    sectionsProcessed: orderedSections.rows.length,
  });
});

// Get all lessons for a specific section
const getLessonsBySection = asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const userId = req.user.user_id;

  const result = await lessonQueries.getLessonsBySection(userId, sectionId);

  // Cache lessons by section for 1 hour with stale-while-revalidate
  setCacheHeaders(res, {
    public: false, // Since this is user-specific
    maxAge: 3600,
    staleWhileRevalidate: 600,
  });

  res.json(result.rows);
});

// Admin-specific route to get all lesson fields for a section
const getAdminLessonsForSection = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const { section_id } = req.query;

  if (!section_id) {
    throw new AppError("section_id is required.", 400);
  }

  // Use getLessons which returns all lesson fields
  const result = await lessonQueries.getLessons(section_id, null);

  // Cache admin lessons for 1 hour
  setCacheHeaders(res, {
    public: false,
    maxAge: 3600,
    staleWhileRevalidate: 600,
  });

  res.status(200).json(result.rows);
});

const getLessons = asyncHandler(async (req, res) => {
  const { course_id, section_id } = req.query;
  const userId = req.user?.user_id; // Optional, as lessons can be public

  let cacheKey;
  let lessons;

  if (course_id) {
    cacheKey = LESSONS_CACHE_KEY_PREFIX + `course_${course_id}`;
  } else if (section_id) {
    cacheKey = LESSONS_CACHE_KEY_PREFIX + `section_${section_id}`;
  } else {
    throw new AppError("Either course_id or section_id is required.", 400);
  }

  // Try to get from cache first
  lessons = lessonsCache.get(cacheKey);

  if (!lessons) {
    // If not in cache, fetch from DB
    if (course_id) {
      lessons = await lessonQueries.getLessons(null, course_id);
    } else {
      lessons = await lessonQueries.getLessonsBySection(userId, section_id);
    }
    lessons = lessons.rows;

    // Store in cache
    lessonsCache.set(cacheKey, lessons);
  }

  // Add HTTP cache headers for better performance
  setCacheHeaders(res, {
    public: !userId, // Public if no user context, private if user-specific
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 600, // 10 minutes
  });

  res.status(200).json(lessons);
});

// Get a specific lesson by ID
const getLessonById = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const userId = req.user.user_id;

  // Fetch lesson once, check existence and set ETag
  const lessonResult = await lessonQueries.getLessonById(lessonId);
  if (lessonResult.rows.length === 0) {
    return res
      .status(404)
      .json({ status: "not_found", message: "Lesson not found" });
  }
  const originalLesson = lessonResult.rows[0];
  const etagData = { ...originalLesson };
  delete etagData.solution;
  delete etagData.hint;
  const isNotModified = setCacheHeaders(res, {
    public: false,
    maxAge: 86400,
    staleWhileRevalidate: 3600,
    data: etagData,
  });
  if (isNotModified) return;

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

  const sectionLessonsQuery = `
    SELECT 
      l.lesson_id, 
      l.lesson_order,
      COALESCE(lp.completed, false) as completed
    FROM lesson l
    LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = $1
    WHERE l.section_id = $2
    ORDER BY l.lesson_order ASC
  `;

  try {
    // Run subscription, progress, and section-fetch in parallel
    const [subscriptionResult, progressResult, sectionLessonsResult] =
      await Promise.all([
        db.query(subscriptionQuery, [userId]),
        lessonQueries.getLessonProgress(userId, lessonId),
        db.query(sectionLessonsQuery, [userId, originalLesson.section_id]),
      ]);

    // Check subscription limits
    const completedLessons =
      parseInt(subscriptionResult.rows[0]?.lesson_count) || 0;
    const hasActiveSubscription = Boolean(
      subscriptionResult.rows[0]?.subscription_id
    );
    if (!hasActiveSubscription && completedLessons >= FREE_LESSON_LIMIT) {
      return res.status(403).json({
        status: "subscription_required",
        message:
          "You have reached the free lesson limit. Please subscribe to continue learning.",
      });
    }

    // Build response object
    const lessonData = { ...originalLesson };
    delete lessonData.solution;
    delete lessonData.hint;
    const hintUnlocked = progressResult.rows[0]?.hint_unlocked;
    const solutionUnlocked = progressResult.rows[0]?.solution_unlocked;
    if (hintUnlocked || req.query.showHint === "true") {
      lessonData.hint = originalLesson.hint;
    }
    if (solutionUnlocked || req.query.showSolution === "true") {
      lessonData.solution = originalLesson.solution;
    }
    let sectionLessons = sectionLessonsResult;
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
          // Add debugging information
          console.log(
            `Lesson ${lessonId} access denied: Previous lesson (ID: ${
              sectionLessons.rows[currentLessonIndex - 1].lesson_id
            }) not completed`
          );

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

              // Check if all lessons in the previous section are completed using the new function
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

              // Check if all lessons in the previous section are completed using the new function
              const prevSectionCompletion =
                await lessonQueries.checkSectionCompletion(
                  userId,
                  prevSectionId
                );

              if (!prevSectionCompletion.allCompleted) {
                console.log(
                  `Lesson ${lessonId} access denied: Not all lessons in previous section (ID: ${prevSectionId}) are completed. Completed: ${prevSectionCompletion.completed}/${prevSectionCompletion.total}`
                );
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

    // Cache individual lessons for 1 day with stale-while-revalidate
    setCacheHeaders(res, {
      public: false, // Since this contains user-specific progress
      maxAge: 86400,
      staleWhileRevalidate: 3600,
    });

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
      template_code ? decodeEntities(template_code) : "",
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

    // Invalidate relevant caches after updating a lesson
    lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `course_${courseId}`);
    lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `section_${section_id}`);

    setCacheHeaders(res, { noStore: true });
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

  // Invalidate relevant caches after deleting a lesson
  lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `course_${courseId}`);
  lessonsCache.del(
    LESSONS_CACHE_KEY_PREFIX + `section_${lessonResult.rows[0].section_id}`
  );

  setCacheHeaders(res, { noStore: true });
  res.status(200).json({ message: "Lesson deleted successfully." });
});

// Reorder lessons
const reorderLessons = asyncHandler(async (req, res) => {
  const { lessons, section_id, course_id } = req.body; // Add section_id and course_id to body

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

    // Get course_id if not provided but section_id is
    let courseIdToInvalidate = course_id;
    if (!courseIdToInvalidate && section_id) {
      const courseResult = await lessonQueries.getCourseIdFromSection(
        section_id
      );
      if (courseResult.rows.length > 0) {
        courseIdToInvalidate = courseResult.rows[0].course_id;
      }
    }

    // Invalidate relevant caches after reordering lessons
    if (courseIdToInvalidate) {
      lessonsCache.del(
        LESSONS_CACHE_KEY_PREFIX + `course_${courseIdToInvalidate}`
      );
    }
    if (section_id) {
      lessonsCache.del(LESSONS_CACHE_KEY_PREFIX + `section_${section_id}`);
    }

    // Log the reordering action
    await logActivity(
      "lessons_reordered",
      `Admin (ID: ${req.user.user_id}) reordered ${lessons.length} lessons in section ID ${section_id}`,
      parseInt(req.user.user_id)
    );

    setCacheHeaders(res, { noStore: true });
    res.json({ success: true, lessons_updated: lessons.length });
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
  const sanitizedCode = decodeEntities(submitted_code);
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

  // No caching for mutation endpoints
  setCacheHeaders(res, { noStore: true });
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

  // Cache progress for 5 minutes with stale-while-revalidate
  setCacheHeaders(res, {
    public: false,
    maxAge: 300,
    staleWhileRevalidate: 60,
  });

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

// Check lesson ordering integrity
const checkLessonOrderIntegrity = asyncHandler(async (req, res) => {
  if (!req.user.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const { course_id } = req.query;

  if (!course_id) {
    throw new AppError("course_id is required.", 400);
  }

  try {
    // Get all sections for the course
    const sectionsQuery = `
      SELECT section_id, name, section_order
      FROM section
      WHERE course_id = $1
      ORDER BY section_order ASC
    `;
    const sections = await db.query(sectionsQuery, [course_id]);

    const result = {
      course_id: parseInt(course_id),
      sections_count: sections.rows.length,
      sections: [],
      issues_found: 0,
    };

    // Check each section
    for (const section of sections.rows) {
      const lessonsQuery = `
        SELECT lesson_id, name, lesson_order
        FROM lesson
        WHERE section_id = $1
        ORDER BY lesson_order ASC
      `;
      const lessons = await db.query(lessonsQuery, [section.section_id]);

      const sectionResult = {
        section_id: section.section_id,
        name: section.name,
        lessons_count: lessons.rows.length,
        issues: [],
      };

      // Check for gaps or duplicates in lesson_order
      const orderValues = lessons.rows.map((l) => l.lesson_order);

      if (orderValues.length > 0) {
        const min = Math.min(...orderValues);
        const max = Math.max(...orderValues);

        // Check for duplicates
        const duplicates = orderValues.filter(
          (value, index, self) => self.indexOf(value) !== index
        );

        // Check for gaps
        const gaps = [];
        for (let i = min; i < max; i++) {
          if (!orderValues.includes(i)) {
            gaps.push(i);
          }
        }

        if (duplicates.length > 0) {
          sectionResult.issues.push({
            type: "duplicate_orders",
            values: duplicates,
          });
          result.issues_found += duplicates.length;
        }

        if (gaps.length > 0) {
          sectionResult.issues.push({
            type: "order_gaps",
            values: gaps,
          });
          result.issues_found += gaps.length;
        }
      }

      result.sections.push(sectionResult);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error checking lesson order integrity:", error);
    throw new AppError(
      `Failed to check lesson order integrity: ${error.message}`,
      500
    );
  }
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
  unlockHint,
  unlockSolution,
  getAdminLessonsForSection,
  checkLessonOrderIntegrity,
};
