const logActivity = require("../utils/logger");
const { decode: decodeEntities } = require("entities");
const { AppError, asyncHandler } = require("../utils/error.utils");
const { setCacheHeaders } = require("../utils/cache.utils");
const lessonQueries = require("../models/lesson.model");
const prisma = require("../config/prisma");
const {
  buildCourseLessonsCacheKey,
  buildSectionLessonsCacheKey,
  getLessonCache,
  setLessonCache,
  clearLessonCacheForCourse,
  clearLessonCacheForSection,
  clearAllLessonCache,
} = require("../utils/lesson-cache.utils");
const {
  clearSectionCache,
  clearAllSectionCache,
} = require("./section.controller");


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
  clearLessonCacheForCourse(courseId);
  clearLessonCacheForSection(section_id);
  clearSectionCache(courseId);

  setCacheHeaders(res, { noStore: true });
  res.status(201).json(result.rows[0]);
});

// Fix existing lesson orders - optimized to use batch updates
const fixLessonOrders = asyncHandler(async (req, res) => {
  const sections = await prisma.section.findMany({
    orderBy: { section_order: "asc" },
    include: {
      lesson: {
        select: {
          lesson_id: true,
          section_id: true,
          lesson_order: true,
        },
        orderBy: [{ lesson_order: "asc" }, { lesson_id: "asc" }],
      },
    },
  });

  const lessonsToUpdate = [];
  for (const section of sections) {
    section.lesson.forEach((lesson, index) => {
      if (lesson.lesson_order !== index) {
        lessonsToUpdate.push({
          lesson_id: lesson.lesson_id,
          section_id: lesson.section_id,
          new_order: index,
        });
      }
    });
  }

  if (lessonsToUpdate.length === 0) {
    return res.status(200).json({
      message: "All lesson orders are already correct",
      fixedCount: 0,
      sectionsProcessed: 0,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const lesson of lessonsToUpdate) {
      await tx.lesson.update({
        where: { lesson_id: lesson.lesson_id },
        data: { lesson_order: lesson.new_order },
      });
    }
  });

  const sectionsProcessed = new Set(lessonsToUpdate.map((l) => l.section_id))
    .size;
  clearAllLessonCache();
  clearAllSectionCache();

  res.status(200).json({
    message: "Lesson orders fixed successfully",
    fixedCount: lessonsToUpdate.length,
    sectionsProcessed,
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

  // Admin lesson management should always read fresh data.
  setCacheHeaders(res, { noStore: true });

  res.status(200).json(result.rows);
});

const getLessons = asyncHandler(async (req, res) => {
  const { course_id, section_id } = req.query;
  const userId = req.user?.user_id; // Optional, as lessons can be public

  let cacheKey;
  let lessons;

  if (course_id) {
    cacheKey = buildCourseLessonsCacheKey(course_id);
  } else if (section_id) {
    cacheKey = buildSectionLessonsCacheKey(section_id);
  } else {
    throw new AppError("Either course_id or section_id is required.", 400);
  }

  // Try to get from cache first
  lessons = getLessonCache(cacheKey);

  if (!lessons) {
    // If not in cache, fetch from DB
    if (course_id) {
      lessons = await lessonQueries.getLessons(null, course_id);
    } else {
      lessons = await lessonQueries.getLessonsBySection(userId, section_id);
    }
    lessons = lessons.rows;

    // Store in cache
    setLessonCache(cacheKey, lessons);
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

  // Fetch lesson once, check existence
  const lessonResult = await lessonQueries.getLessonById(lessonId);
  if (lessonResult.rows.length === 0) {
    // Don't cache 404 responses
    setCacheHeaders(res, { noStore: true });
    return res
      .status(404)
      .json({ status: "not_found", message: "Lesson not found" });
  }
  const originalLesson = lessonResult.rows[0];

  try {
    const [completedLessonsCount, activeSubscription, progressResult, sectionLessons] =
      await Promise.all([
        prisma.lesson_progress.count({
          where: {
            user_id: Number(userId),
            completed: true,
          },
        }),
        prisma.subscription.findFirst({
          where: {
            user_id: Number(userId),
            status: true,
            subscription_end_date: { gt: new Date() },
          },
          select: { subscription_id: true },
          orderBy: { subscription_start_date: "desc" },
        }),
        lessonQueries.getLessonProgress(userId, lessonId),
        prisma.lesson.findMany({
          where: { section_id: originalLesson.section_id },
          orderBy: { lesson_order: "asc" },
          select: {
            lesson_id: true,
            lesson_order: true,
            lesson_progress: {
              where: { user_id: Number(userId) },
              select: { completed: true },
              take: 1,
            },
          },
        }),
      ]);

    // Check subscription limits
    const completedLessons = completedLessonsCount || 0;
    const hasActiveSubscription = Boolean(activeSubscription?.subscription_id);
    if (!hasActiveSubscription && completedLessons >= FREE_LESSON_LIMIT) {
      // Don't cache subscription-required responses - user can subscribe anytime
      setCacheHeaders(res, { noStore: true });
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
    const sectionLessonRows = sectionLessons.map((lesson) => ({
      lesson_id: lesson.lesson_id,
      lesson_order: lesson.lesson_order,
      completed: Boolean(lesson.lesson_progress[0]?.completed),
    }));
    
    // First lesson is always accessible
    if (
      sectionLessonRows.length > 0 &&
      sectionLessonRows[0].lesson_id === parseInt(lessonId, 10)
    ) {
      // This is the first lesson in the section - always allowed
    } else {
      // Not the first lesson, check if previous lesson is completed
      let currentLessonIndex = -1;
      let previousLessonCompleted = false;

      for (let i = 0; i < sectionLessonRows.length; i++) {
        if (sectionLessonRows[i].lesson_id === parseInt(lessonId, 10)) {
          currentLessonIndex = i;
          break;
        }
      }

      if (currentLessonIndex > 0) {
        previousLessonCompleted = Boolean(
          sectionLessonRows[currentLessonIndex - 1].completed
        );

        // If the previous lesson is not completed, check if this is the first section
        if (!previousLessonCompleted) {
          const sectionsResult = await prisma.section.findMany({
            where: { course_id: lessonData.course_id },
            orderBy: { section_order: "asc" },
            select: {
              section_id: true,
              section_order: true,
            },
          });

          // If not the first section, check if all lessons in the previous section are completed
          if (
            sectionsResult.length > 0 &&
            sectionsResult[0].section_id !== lessonData.section_id
          ) {
            // Get all lessons from previous section
            let prevSectionIndex = -1;
            for (let i = 0; i < sectionsResult.length; i++) {
              if (sectionsResult[i].section_id === lessonData.section_id) {
                prevSectionIndex = i - 1;
                break;
              }
            }

            if (prevSectionIndex >= 0) {
              const prevSectionId = sectionsResult[prevSectionIndex].section_id;

              // Check if all lessons in the previous section are completed using the new function
              const prevSectionCompletion =
                await lessonQueries.checkSectionCompletion(
                  userId,
                  prevSectionId
                );

              if (!prevSectionCompletion.allCompleted) {
                // Don't cache locked responses - user can complete lessons anytime
                setCacheHeaders(res, { noStore: true });
                return res.status(403).json({
                  status: "locked",
                  message:
                    "You need to complete all lessons in the previous section first.",
                });
              }
            }
          }

          // If the previous lesson in this section is not completed
          // Don't cache locked responses - user can complete lessons anytime
          setCacheHeaders(res, { noStore: true });
          return res.status(403).json({
            status: "locked",
            message: "You need to complete the previous lesson first.",
          });
        }
      }
    }

    // Hint/solution reveal responses must never be cached to avoid stale unlock state.
    if (req.query.showHint === "true" || req.query.showSolution === "true") {
      setCacheHeaders(res, { noStore: true });
    } else {
      // Cache regular lesson responses - shorter TTL since lesson access can change.
      setCacheHeaders(res, {
        public: false, // Since this contains user-specific progress
        maxAge: 300, // 5 minutes instead of 1 day
        staleWhileRevalidate: 60,
      });
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
      template_code ? decodeEntities(template_code) : "",
      hint,
      solution,
      Array.isArray(test_cases) && test_cases.length > 0
        ? Boolean(test_cases[0]?.auto_detect)
        : Boolean(auto_detect)
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
    clearLessonCacheForCourse(courseId);
    clearLessonCacheForSection(section_id);
    clearSectionCache(courseId);

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
  clearLessonCacheForCourse(courseId);
  clearLessonCacheForSection(lessonResult.rows[0].section_id);
  clearSectionCache(courseId);

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

  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        lessons.map(({ lesson_id, order }) =>
          lessonQueries.updateLessonOrder(lesson_id, order, tx)
        )
      );
    });

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
      clearLessonCacheForCourse(courseIdToInvalidate);
      clearSectionCache(courseIdToInvalidate);
    }
    if (section_id) {
      clearLessonCacheForSection(section_id);
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
    throw err;
  }
});

const updateLessonProgress = asyncHandler(async (req, res) => {
  const { user_id: userIdFromBody, lesson_id, completed, submitted_code } =
    req.body;
  const userId = parseInt(req.user.user_id, 10);

  if (!lesson_id || completed === undefined) {
    throw new AppError("Missing required fields.", 400);
  }

  if (
    userIdFromBody !== undefined &&
    parseInt(userIdFromBody, 10) !== userId
  ) {
    throw new AppError("Access denied.", 403);
  }

  const courseResult = await lessonQueries.getCourseIdForLesson(lesson_id);
  if (courseResult.rows.length === 0) {
    throw new AppError("Lesson not found or not linked to a course.", 404);
  }

  const courseId = courseResult.rows[0].course_id;
  const checkResult = await lessonQueries.checkLessonProgress(
    userId,
    lesson_id
  );
  const sanitizedCode = decodeEntities(submitted_code);
  const completedAt = completed ? new Date() : null;

  if (checkResult.rows.length > 0) {
    const updateResult = await lessonQueries.updateLessonProgress(
      userId,
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
      userId,
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
    userId,
    courseId
  );
  const completedLessons = parseInt(
    completedLessonsResult.rows[0].completed_lessons,
    10
  );

  const progress = (completedLessons / totalLessons) * 100;
  const updateEnrollmentResult = await lessonQueries.updateEnrollmentProgress(
    progress,
    userId,
    courseId
  );

  if (updateEnrollmentResult.rows.length === 0) {
    throw new AppError("Enrollment not found.", 404);
  }

  // Check and award XP badge if eligible
  try {
    const completedRows = await prisma.lesson_progress.findMany({
      where: {
        user_id: Number(userId),
        completed: true,
      },
      select: {
        lesson: {
          select: {
            xp: true,
          },
        },
      },
    });
    const xp = completedRows.reduce(
      (sum, row) => sum + Number(row.lesson?.xp || 0),
      0
    );
    if (xp >= 100) {
      await require("../controllers/badge.controller").checkAndAwardBadges(
        userId,
        "xp_update",
        { totalXp: xp }
      );
    }
  } catch (badgeErr) {
    console.error("[XP Badge] Error checking/awarding XP badge:", badgeErr);
  }

  // --- BADGE LOGIC: Perfectionist ---
  try {
    // Check if user completed all lessons in the course (Perfectionist)
    if (completed && completedLessons === totalLessons && totalLessons > 0) {
      await require("../controllers/badge.controller").checkAndAwardBadges(
        userId,
        "perfectionist",
        { courseCompleted: true }
      );
    }
    // --- BADGE LOGIC: Daily Learner & Marathoner ---
    if (completed) {
      // Daily Learner: check for 3 consecutive days
      const streakRows = await prisma.lesson_progress.findMany({
        where: {
          user_id: Number(userId),
          completed: true,
          completed_at: { not: null },
        },
        orderBy: { completed_at: "desc" },
        take: 10,
        select: { completed_at: true },
      });
      const days = streakRows.map(
        (r) =>
          r.completed_at && new Date(r.completed_at).toISOString().slice(0, 10)
      );
      let consecutive = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        if ((prev - curr) / (1000 * 60 * 60 * 24) === 1) consecutive++;
        else if (prev.getTime() !== curr.getTime()) break;
      }
      if (consecutive >= 3) {
        await require("../controllers/badge.controller").checkAndAwardBadges(
          userId,
          "daily_learner",
          { consecutiveDays: consecutive }
        );
      }
      // Marathoner: check for 5 lessons in a single day
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = days.filter((d) => d === today).length;
      if (todayCount >= 5) {
        await require("../controllers/badge.controller").checkAndAwardBadges(
          userId,
          "marathoner",
          { lessonsToday: todayCount }
        );
      }
    }
  } catch (badgeErr) {
    console.error(
      "[Extra Badges] Error checking/awarding extra badges:",
      badgeErr
    );
  }

  // No caching for mutation endpoints
  setCacheHeaders(res, { noStore: true });
  res.status(200).json({
    message: "Lesson progress and enrollment updated.",
    data: updateEnrollmentResult.rows[0],
  });
});

const getLessonProgress = asyncHandler(async (req, res) => {
  const { user_id: userIdFromQuery, lesson_id } = req.query;
  const userId = parseInt(req.user.user_id, 10);

  if (!lesson_id) {
    throw new AppError("lesson_id is required.", 400);
  }

  if (
    userIdFromQuery !== undefined &&
    parseInt(userIdFromQuery, 10) !== userId
  ) {
    throw new AppError("Access denied.", 403);
  }

  const result = await lessonQueries.getLessonProgress(userId, lesson_id);

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
    const sections = await prisma.section.findMany({
      where: { course_id: Number(course_id) },
      orderBy: { section_order: "asc" },
      include: {
        lesson: {
          select: {
            lesson_id: true,
            name: true,
            lesson_order: true,
          },
          orderBy: { lesson_order: "asc" },
        },
      },
    });

    const result = {
      course_id: parseInt(course_id),
      sections_count: sections.length,
      sections: [],
      issues_found: 0,
    };

    // Check each section
    for (const section of sections) {
      const sectionResult = {
        section_id: section.section_id,
        name: section.name,
        lessons_count: section.lesson.length,
        issues: [],
      };

      // Check for gaps or duplicates in lesson_order
      const orderValues = section.lesson.map((l) => l.lesson_order);

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
