const prisma = require("../config/prisma");
const { sendFeedbackReplyEmail } = require("./auth.controller");
const NodeCache = require("node-cache");
const { cacheManager } = require("../utils/cache.utils");
const { AppError } = require("../utils/error.utils");
const {
  isAdminUser,
  toIntId,
  getRequesterUserId,
} = require("../utils/authz.utils");

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Cache keys for courses data
const COURSES_CACHE_KEY = "courses_with_ratings";
const OPTIMIZED_COURSES_CACHE_PREFIX = "optimized_courses_";
const OPTIMIZED_COURSE_SECTION_CACHE_PREFIX = "optimized_course_section_";

const toNumber = (value) =>
  value === null || value === undefined ? 0 : Number(value);

// Function to clear courses cache
const clearCoursesCache = (courseId = null) => {
  const keysToDelete = new Set([COURSES_CACHE_KEY]);

  for (const key of cache.keys()) {
    if (key.startsWith(OPTIMIZED_COURSES_CACHE_PREFIX)) {
      keysToDelete.add(key);
      continue;
    }

    if (
      key.startsWith(OPTIMIZED_COURSE_SECTION_CACHE_PREFIX) &&
      (!courseId ||
        key.startsWith(`${OPTIMIZED_COURSE_SECTION_CACHE_PREFIX}${courseId}_`))
    ) {
      keysToDelete.add(key);
    }
  }

  cache.del([...keysToDelete]);
  // Keep route-level /courses cache in sync with feedback/course mutations.
  cacheManager.clear("courses");
  // Feedback/admin views depend on these aggregates as well.
  cacheManager.clear("feedback");
  cacheManager.clear("analytics");
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
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const courseId = req.query.course_id ? parseInt(req.query.course_id, 10) : null;

  const rows = await prisma.feedback.findMany({
    where: courseId ? { course_id: courseId } : undefined,
    orderBy: { feedback_id: "desc" },
    include: {
      users: {
        select: {
          name: true,
        },
      },
      course: {
        select: {
          name: true,
        },
      },
    },
  });

  res.status(200).json(
    rows.map((row) => ({
      feedback_id: row.feedback_id,
      student_name: row.users?.name || null,
      course_name: row.course?.name || null,
      feedback: row.comment,
      rating: row.rating,
      status: row.status,
      reply: row.reply,
    }))
  );
});

// Get public feedback
const getPublicFeedback = handleAsync(async (req, res) => {
  const rows = await prisma.feedback.findMany({
    where: {
      rating: { gte: 4 },
      comment: {
        not: null,
      },
    },
    include: {
      users: {
        select: {
          name: true,
          profileimage: true,
          country: true,
        },
      },
      course: {
        select: {
          name: true,
          difficulty: true,
        },
      },
    },
    take: 40,
  });

  const filtered = rows.filter(
    (row) => row.comment && String(row.comment).trim().length > 0
  );

  const shuffled = filtered
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, 5)
    .map(({ value }) => value);

  res.status(200).json(
    shuffled.map((row) => ({
      feedback_id: row.feedback_id,
      rating: row.rating,
      comment: row.comment,
      name: row.users?.name,
      profileimage: row.users?.profileimage,
      country: row.users?.country,
      course_name: row.course?.name,
      difficulty: row.course?.difficulty,
    }))
  );
});

// Get courses with ratings and user counts
const getCoursesWithRatings = handleAsync(async (req, res) => {
  const cachedData = cache.get(COURSES_CACHE_KEY);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  const [courses, enrollmentCounts] = await Promise.all([
    prisma.course.findMany({
      where: { status: "Published" },
      select: {
        course_id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        difficulty: true,
        created_at: true,
        rating: true,
      },
      orderBy: { course_id: "asc" },
    }),
    prisma.enrollment.groupBy({
      by: ["course_id"],
      _count: {
        user_id: true,
      },
    }),
  ]);

  const userscountMap = Object.fromEntries(
    enrollmentCounts
      .filter((row) => row.course_id !== null)
      .map((row) => [row.course_id, String(row._count.user_id)])
  );

  const responseData = {
    courses,
    userscount: userscountMap,
  };

  cache.set(COURSES_CACHE_KEY, responseData);

  res.status(200).json(responseData);
});

// Optimized endpoint that combines all course data in a single request
const getOptimizedCoursesData = handleAsync(async (req, res) => {
  const { trackCacheHit, trackCacheMiss } = require("../utils/performance.utils");
  const userId = req.user?.userId;
  const cacheKey = userId
    ? `${OPTIMIZED_COURSES_CACHE_PREFIX}${userId}`
    : "optimized_courses_guest";

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    trackCacheHit("optimized-courses", cacheKey);
    return res.status(200).json({ ...cachedData, cached: true });
  }

  trackCacheMiss("optimized-courses", cacheKey);

  try {
    const courses = await prisma.course.findMany({
      where: { status: "Published" },
      include: {
        _count: {
          select: {
            enrollment: true,
          },
        },
        section: {
          include: {
            lesson: {
              select: {
                lesson_id: true,
              },
            },
          },
        },
      },
      orderBy: { course_id: "asc" },
    });

    let enrollmentMap = new Map();
    let completedByCourseMap = new Map();

    if (userId) {
      const [userEnrollments, completedProgress] = await Promise.all([
        prisma.enrollment.findMany({
          where: { user_id: Number(userId) },
          select: {
            course_id: true,
          },
        }),
        prisma.lesson_progress.findMany({
          where: {
            user_id: Number(userId),
            completed: true,
          },
          select: {
            lesson_id: true,
            lesson: {
              select: {
                section: {
                  select: {
                    course_id: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      enrollmentMap = new Map(userEnrollments.map((row) => [row.course_id, true]));

      for (const row of completedProgress) {
        const courseId = row.lesson?.section?.course_id;
        if (!courseId) continue;

        const current = completedByCourseMap.get(courseId) || new Set();
        current.add(row.lesson_id);
        completedByCourseMap.set(courseId, current);
      }
    }

    const formattedCourses = courses.map((course) => {
      const allLessonIds = course.section.flatMap((section) =>
        section.lesson.map((lesson) => lesson.lesson_id)
      );
      const totalLessons = allLessonIds.length;

      const completedCount = userId
        ? completedByCourseMap.get(course.course_id)?.size || 0
        : 0;

      const progress = totalLessons > 0 ? Math.round((completedCount * 100) / totalLessons) : 0;

      return {
        ...course,
        userscount: String(course._count.enrollment),
        is_enrolled: userId ? Boolean(enrollmentMap.get(course.course_id)) : false,
        progress,
      };
    });

    const responseData = {
      courses: formattedCourses,
      optimized: true,
      cached: false,
    };

    cache.set(cacheKey, responseData, 300);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching optimized courses data:", error);
    res.status(500).json({ error: "Failed to fetch optimized courses data" });
  }
});

// Optimized endpoint for CourseSection.jsx that combines multiple API calls
const getOptimizedCourseSectionData = handleAsync(async (req, res) => {
  const { trackCacheHit, trackCacheMiss } = require("../utils/performance.utils");

  const { courseId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const normalizedCourseId = Number(courseId);
  const normalizedUserId = Number(userId);
  const cacheKey = `${OPTIMIZED_COURSE_SECTION_CACHE_PREFIX}${normalizedCourseId}_${normalizedUserId}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    trackCacheHit("optimized-course-section", cacheKey);
    return res.status(200).json({ ...cachedData, cached: true });
  }

  trackCacheMiss("optimized-course-section", cacheKey);

  try {
    const [
      course,
      activeSubscription,
      completedLessonsTotal,
      profile,
      sections,
      completedInCourse,
      completedAll,
    ] = await Promise.all([
      prisma.course.findFirst({
        where: {
          course_id: normalizedCourseId,
          status: "Published",
        },
        select: {
          course_id: true,
          name: true,
          description: true,
          status: true,
        },
      }),
      prisma.subscription.findFirst({
        where: {
          user_id: normalizedUserId,
          status: true,
          subscription_end_date: { gt: new Date() },
        },
        select: {
          subscription_id: true,
        },
        orderBy: { subscription_start_date: "desc" },
      }),
      prisma.lesson_progress.count({
        where: {
          user_id: normalizedUserId,
          completed: true,
        },
      }),
      prisma.users.findUnique({
        where: { user_id: normalizedUserId },
        select: {
          name: true,
          profileimage: true,
          streak: true,
        },
      }),
      prisma.section.findMany({
        where: { course_id: normalizedCourseId },
        orderBy: { section_order: "asc" },
        include: {
          lesson: {
            orderBy: { lesson_order: "asc" },
            include: {
              lesson_progress: {
                where: { user_id: normalizedUserId },
                select: { completed: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: normalizedUserId,
          completed: true,
          lesson: {
            section: {
              course_id: normalizedCourseId,
            },
          },
        },
        select: {
          lesson_id: true,
          lesson: {
            select: {
              xp: true,
            },
          },
        },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: normalizedUserId,
          completed: true,
        },
        select: {
          lesson_id: true,
          lesson: {
            select: {
              xp: true,
            },
          },
        },
      }),
    ]);

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or not available" });
    }

    const courseXP = completedInCourse.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0
    );
    const totalXP = completedAll.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0
    );

    const sectionsPayload = sections.map((section) => ({
      section_id: section.section_id,
      name: section.name,
      description: section.description,
      section_order: section.section_order,
      lessons: section.lesson.map((lesson) => ({
        lesson_id: lesson.lesson_id,
        name: lesson.name,
        lesson_order: lesson.lesson_order,
        completed: Boolean(lesson.lesson_progress[0]?.completed),
      })),
    }));

    const calculateLevel = (xp) => Math.floor(xp / 100) + 1;
    const calculateXPToNextLevel = (xp) => {
      const currentLevel = calculateLevel(xp);
      return currentLevel * 100 - xp;
    };

    const level = calculateLevel(totalXP);
    const xpToNextLevel = calculateXPToNextLevel(totalXP);

    const responseData = {
      course: {
        course_id: course.course_id,
        title: course.name,
        description: course.description,
        status: course.status,
      },
      subscription: {
        hasActiveSubscription: Boolean(activeSubscription),
        completedLessonsCount: completedLessonsTotal,
      },
      profile: {
        name: profile?.name || "",
        profileimage: profile?.profileimage || null,
        streak: profile?.streak || 0,
        exercisesCompleted: completedLessonsTotal,
      },
      sections: sectionsPayload,
      stats: {
        courseXP,
        exercisesCompleted: completedInCourse.length,
        streak: profile?.streak || 0,
        name: profile?.name || "",
        profileImage: profile?.profileimage || null,
        totalXP,
        level,
        xpToNextLevel,
      },
      optimized: true,
      cached: false,
    };

    cache.set(cacheKey, responseData, 180);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching optimized course section data:", error);
    res.status(500).json({ error: "Failed to fetch course section data" });
  }
});

const checkFeedbackEligibility = async (userId, courseId) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      user_id_course_id: {
        user_id: Number(userId),
        course_id: Number(courseId),
      },
    },
    select: { progress: true },
  });

  if (!enrollment) {
    throw new AppError("User is not enrolled in this course", 400);
  }

  const existingFeedback = await prisma.feedback.findFirst({
    where: {
      user_id: Number(userId),
      course_id: Number(courseId),
    },
    select: { feedback_id: true },
  });

  const progress = parseFloat(enrollment.progress || 0);

  return {
    canSubmitFeedback:
      progress >= 30 || (existingFeedback?.feedback_id && progress === 100),
    hasExistingFeedback: Boolean(existingFeedback?.feedback_id),
    progress,
  };
};

const submitFeedback = handleAsync(async (req, res) => {
  const { course_id, rating, comment } = req.body;
  const requesterId = getRequesterUserId(req);
  const normalizedCourseId = toIntId(course_id);
  const normalizedRating = toIntId(rating);

  if (
    !normalizedCourseId ||
    !normalizedRating ||
    normalizedRating < 1 ||
    normalizedRating > 5
  ) {
    return res.status(400).json({
      error:
        "Invalid input. Provide a valid course ID and a rating between 1 and 5.",
    });
  }

  if (!requesterId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const eligibility = await checkFeedbackEligibility(
    requesterId,
    normalizedCourseId
  );

  if (!eligibility.canSubmitFeedback) {
    return res.status(403).json({
      error:
        "You need to complete at least 30% of the course to submit feedback",
      progress: eligibility.progress,
    });
  }

  if (eligibility.hasExistingFeedback && eligibility.progress < 100) {
    return res.status(403).json({
      error:
        "You need to complete the entire course to submit additional feedback",
      progress: eligibility.progress,
    });
  }

  const courseExists = await prisma.course.findUnique({
    where: { course_id: normalizedCourseId },
    select: { course_id: true },
  });
  if (!courseExists) {
    return res.status(404).json({ error: "Course not found." });
  }

  const createdFeedback = await prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: {
        user_id: requesterId,
        course_id: normalizedCourseId,
        rating: normalizedRating,
        comment: comment || null,
      },
    });

    const ratingAggregate = await tx.feedback.aggregate({
      where: { course_id: normalizedCourseId },
      _avg: { rating: true },
    });

    const avgRating = Number(ratingAggregate._avg.rating || 0);
    await tx.course.update({
      where: { course_id: normalizedCourseId },
      data: {
        rating: avgRating.toFixed(2),
      },
    });

    return feedback;
  });

  clearCoursesCache(normalizedCourseId);
  res.status(201).json({
    message: "Feedback submitted successfully!",
    feedback: createdFeedback,
  });
});

// Reply to feedback
const replyToFeedback = handleAsync(async (req, res) => {
  const { feedback_id, reply } = req.body;
  const feedbackId = toIntId(feedback_id);

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  if (!feedbackId || !reply || !reply.trim()) {
    return res
      .status(400)
      .json({ error: "Feedback ID and reply message are required." });
  }

  try {
    const feedbackDetails = await prisma.feedback.findUnique({
      where: { feedback_id: feedbackId },
      select: {
        feedback_id: true,
        comment: true,
        rating: true,
        users: {
          select: {
            email: true,
            name: true,
          },
        },
        course: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!feedbackDetails) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { feedback_id: feedbackId },
      data: {
        status: "closed",
        reply: reply.trim(),
      },
    });
    cacheManager.clear("feedback");
    cacheManager.clear("analytics");

    const email = feedbackDetails.users?.email;
    const name = feedbackDetails.users?.name;
    const commentValue = feedbackDetails.comment;
    const ratingValue = feedbackDetails.rating;
    const courseName = feedbackDetails.course?.name;

    try {
      if (email && name && courseName) {
        await sendFeedbackReplyEmail({
          email,
          name,
          comment: commentValue,
          rating: ratingValue,
          courseName,
          reply: reply.trim(),
        });
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Keep feedback status update even if email fails.
    }

    res.status(200).json({
      message: "Reply sent successfully and feedback closed.",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Error in replyToFeedback:", error);
    res.status(500).json({
      error: "Failed to process feedback reply",
      details: error.message,
    });
  }
});

// Get recent feedback
const getRecentFeedback = handleAsync(async (req, res) => {
  if (!isAdminUser(req)) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await prisma.feedback.findMany({
    where: {
      created_at: { gte: since },
    },
    include: {
      users: {
        select: { name: true },
      },
      course: {
        select: { name: true },
      },
    },
    orderBy: { created_at: "desc" },
    take: 5,
  });

  res.status(200).json(
    rows.map((row) => ({
      feedback_id: row.feedback_id,
      student_name: row.users?.name || null,
      course_name: row.course?.name || null,
      comment: row.comment,
      created_at: row.created_at,
    }))
  );
});

const reopenFeedback = handleAsync(async (req, res) => {
  const { feedback_id } = req.body;
  const feedbackId = toIntId(feedback_id);

  if (!isAdminUser(req)) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  if (!feedbackId) {
    return res.status(400).json({ error: "Feedback ID is required." });
  }

  const feedbackRecord = await prisma.feedback.findUnique({
    where: { feedback_id: feedbackId },
    select: { feedback_id: true },
  });

  if (!feedbackRecord) {
    return res.status(404).json({ error: "Feedback not found" });
  }

  const reopenedFeedback = await prisma.feedback.update({
    where: { feedback_id: feedbackId },
    data: { status: "open" },
  });
  cacheManager.clear("feedback");
  cacheManager.clear("analytics");

  res.status(200).json({
    message: "Feedback reopened successfully",
    feedback: reopenedFeedback,
  });
});

module.exports = {
  getFeedback,
  submitFeedback,
  getCoursesWithRatings,
  getOptimizedCoursesData,
  replyToFeedback,
  getPublicFeedback,
  checkFeedbackEligibility,
  getRecentFeedback,
  reopenFeedback,
  clearCoursesCache,
  getOptimizedCourseSectionData,
};
