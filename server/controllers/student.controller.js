const prisma = require("../config/prisma");
const {
  calculateLevel,
  calculateXPToNextLevel,
} = require("../utils/xpCalculator");
const badgeController = require("../controllers/badge.controller");
const { canAccessUser, toIntId } = require("../utils/authz.utils");
const { logger } = require("../utils/logger");

const toNumber = (value) =>
  value === null || value === undefined ? 0 : Number(value);

// Fetch all students (with pagination support)
const getAllStudents = async (req, res) => {
  try {
    if (!req.user.admin) {
      console.error(`Access denied for user: ${req.user.userId}`);
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Pagination params (defaults: page=1, limit=50)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const adminUsers = await prisma.admins.findMany({
      select: { admin_id: true },
    });
    const adminIds = adminUsers.map((row) => row.admin_id);

    const whereFilter = { user_id: { notIn: adminIds } };

    // Get total count and paginated students in parallel
    const [totalCount, students] = await Promise.all([
      prisma.users.count({ where: whereFilter }),
      prisma.users.findMany({
        where: whereFilter,
        select: {
          user_id: true,
          name: true,
          email: true,
          created_at: true,
          is_verified: true,
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);

    const studentIds = students.map((s) => s.user_id);

    const [subscriptions, enrollments, progressRows] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          user_id: { in: studentIds },
        },
        select: {
          user_id: true,
          subscription_type: true,
          subscription_end_date: true,
          status: true,
          subscription_start_date: true,
        },
        orderBy: [{ user_id: "asc" }, { subscription_start_date: "desc" }],
      }),
      prisma.enrollment.findMany({
        where: {
          user_id: { in: studentIds },
        },
        select: {
          user_id: true,
          course_id: true,
          progress: true,
        },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: { in: studentIds },
          completed: true,
        },
        select: {
          user_id: true,
          lesson_id: true,
          lesson: { select: { xp: true } },
        },
      }),
    ]);

    const latestSubscriptionByUser = new Map();
    for (const sub of subscriptions) {
      if (!sub.user_id) continue;
      if (!latestSubscriptionByUser.has(sub.user_id)) {
        latestSubscriptionByUser.set(sub.user_id, sub);
      }
    }

    const enrollmentByUser = new Map();
    for (const enrollment of enrollments) {
      if (!enrollmentByUser.has(enrollment.user_id)) {
        enrollmentByUser.set(enrollment.user_id, []);
      }
      enrollmentByUser.get(enrollment.user_id).push(enrollment);
    }

    const completedLessonSetByUser = new Map();
    const totalXpByUser = new Map();
    for (const row of progressRows) {
      if (!completedLessonSetByUser.has(row.user_id)) {
        completedLessonSetByUser.set(row.user_id, new Set());
      }
      completedLessonSetByUser.get(row.user_id).add(row.lesson_id);
      totalXpByUser.set(
        row.user_id,
        (totalXpByUser.get(row.user_id) || 0) + toNumber(row.lesson?.xp),
      );
    }

    const now = new Date();

    const formatted = students.map((student) => {
      const studentEnrollments = enrollmentByUser.get(student.user_id) || [];
      const avgProgress =
        studentEnrollments.length > 0
          ? studentEnrollments.reduce(
              (sum, item) => sum + toNumber(item.progress),
              0,
            ) / studentEnrollments.length
          : 0;

      const completedCourses = studentEnrollments.filter(
        (item) => toNumber(item.progress) >= 100,
      ).length;

      const latestSub = latestSubscriptionByUser.get(student.user_id);
      const hasActiveSubscription = Boolean(
        latestSub && latestSub.status && latestSub.subscription_end_date > now,
      );

      return {
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        created_at: student.created_at,
        is_verified: student.is_verified,
        subscription_type: latestSub?.subscription_type || null,
        subscription_end_date: latestSub?.subscription_end_date || null,
        subscription_status: latestSub?.status || false,
        has_active_subscription: hasActiveSubscription,
        total_enrollments: studentEnrollments.length,
        avg_progress: Math.round(avgProgress * 10) / 10,
        completed_courses: completedCourses,
        total_xp: totalXpByUser.get(student.user_id) || 0,
        exercises_completed:
          completedLessonSetByUser.get(student.user_id)?.size || 0,
      };
    });

    const response = {
      students: formatted,
      count: formatted.length,
      metadata: {
        totalStudents: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        verifiedStudents: formatted.filter((s) => s.is_verified).length,
        activeSubscriptions: formatted.filter((s) => s.has_active_subscription)
          .length,
        averageProgress:
          formatted.length > 0
            ? Math.round(
                (formatted.reduce(
                  (sum, s) => sum + (parseFloat(s.avg_progress) || 0),
                  0,
                ) /
                  formatted.length) *
                  10,
              ) / 10
            : 0,
      },
      optimized: true,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching students:", err.message || err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching students data." });
  }
};

// Fetch details of a specific student
const getStudentById = async (req, res) => {
  const { studentId } = req.params;
  const normalizedStudentId = toIntId(studentId);

  if (!normalizedStudentId) {
    return res.status(400).json({ error: "Invalid student ID." });
  }

  if (!canAccessUser(req, normalizedStudentId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: normalizedStudentId },
      select: {
        user_id: true,
        name: true,
        email: true,
        bio: true,
        streak: true,
        skills: true,
        profileimage: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Student not found" });
    }

    const [enrollments, progressRows] = await Promise.all([
      prisma.enrollment.findMany({
        where: { user_id: normalizedStudentId },
        include: {
          course: {
            select: { name: true },
          },
        },
      }),
      prisma.lesson_progress.findMany({
        where: {
          user_id: normalizedStudentId,
          completed: true,
        },
        select: {
          lesson_id: true,
          completed_at: true,
          lesson: {
            select: {
              xp: true,
              name: true,
              section: {
                select: {
                  name: true,
                  course_id: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalXP = progressRows.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0,
    );

    const latestByCourse = new Map();
    for (const row of progressRows) {
      const courseId = row.lesson?.section?.course_id;
      if (!courseId) continue;

      const current = latestByCourse.get(courseId);
      if (
        !current ||
        (row.completed_at && row.completed_at > current.completed_at)
      ) {
        latestByCourse.set(courseId, {
          lesson_id: row.lesson_id,
          name: row.lesson?.name,
          section_name: row.lesson?.section?.name,
          completed_at: row.completed_at,
        });
      }
    }

    const courses = enrollments.map((enrollment) => ({
      course_id: enrollment.course_id,
      course_name: enrollment.course?.name,
      progress: toNumber(enrollment.progress),
      last_lesson: latestByCourse.get(enrollment.course_id) || null,
    }));

    const response = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      streak: user.streak,
      skills: user.skills || [],
      profileimage: user.profileimage,
      courses,
      exercisesCompleted: new Set(progressRows.map((row) => row.lesson_id))
        .size,
      courseXP: totalXP,
      level: calculateLevel(totalXP),
      xpToNextLevel: calculateXPToNextLevel(totalXP),
      completedCourses: courses.filter((c) => (c.progress || 0) >= 100).length,
      optimized: true,
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching student data:", err);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
};

// Fetch courses for a specific student
const getCoursesByStudentId = async (req, res) => {
  const { studentId } = req.params;
  if (!req.user.admin) {
    console.error(`Access denied for user: ${req.user.userId}`);
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ error: "Invalid student ID." });
  }

  try {
    const rows = await prisma.enrollment.findMany({
      where: { user_id: Number(studentId) },
      include: {
        course: {
          select: {
            name: true,
          },
        },
      },
    });

    res.status(200).json(
      rows.map((row) => ({
        course_name: row.course?.name,
        progress: row.progress,
      })),
    );
  } catch (err) {
    console.error("Error fetching courses for student:", err.message || err);
    res.status(500).json({ error: "Failed to fetch courses for the student." });
  }
};

// Fetch all enrollments for a specific user
const getEnrollmentsByUserId = async (req, res) => {
  const { userId } = req.params;
  const normalizedUserId = toIntId(userId);

  if (!normalizedUserId) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  if (!canAccessUser(req, normalizedUserId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const rows = await prisma.enrollment.findMany({
      where: { user_id: normalizedUserId },
      select: { course_id: true },
    });

    const enrollments = rows.reduce((acc, row) => {
      acc[row.course_id] = true;
      return acc;
    }, {});

    res.status(200).json(enrollments);
  } catch (err) {
    console.error("Error fetching enrollments:", err.message || err);
    res.status(500).json({ error: "Failed to fetch enrollments." });
  }
};

// Fetch progress for a specific user
const getProgressByUserId = async (req, res) => {
  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  try {
    const rows = await prisma.enrollment.findMany({
      where: { user_id: Number(userId) },
      select: { course_id: true, progress: true },
    });

    const progress = rows.reduce((acc, row) => {
      acc[row.course_id] = row.progress;
      return acc;
    }, {});

    res.status(200).json(progress);
  } catch (err) {
    console.error("Error fetching progress:", err.message || err);
    res.status(500).json({ error: "Failed to fetch progress." });
  }
};

// Check for XP badges when student stats are retrieved
const checkXPBadges = async (userId, totalXP) => {
  try {
    if (totalXP >= 100) {
      const badgeAwarded = await badgeController.checkAndAwardBadges(
        userId,
        "xp_update",
        { totalXp: totalXP },
      );
      return badgeAwarded;
    }
    return null;
  } catch (error) {
    console.error("Error checking XP badges:", error);
    return null;
  }
};

// Get student stats with badge checks
const getStudentStats = async (req, res) => {
  const requestedUserId = toIntId(req.params.userId);

  if (!requestedUserId) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  if (!canAccessUser(req, requestedUserId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const rows = await prisma.lesson_progress.findMany({
      where: {
        user_id: requestedUserId,
        completed: true,
      },
      select: {
        lesson_id: true,
        course_id: true,
        completed_at: true,
        lesson: { select: { xp: true } },
      },
    });

    const totalXP = rows.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0,
    );
    const level = calculateLevel(totalXP);
    const xpToNextLevel = calculateXPToNextLevel(totalXP);

    let badgeAwarded = null;
    if (totalXP >= 100) {
      badgeAwarded = await checkXPBadges(requestedUserId, totalXP);
    }

    const completedExercises = new Set(rows.map((row) => row.lesson_id)).size;
    const coursesInteracted = new Set(rows.map((row) => row.course_id)).size;
    const lastActivity = rows
      .map((row) => row.completed_at)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    res.status(200).json({
      totalXP,
      level,
      xpToNextLevel,
      completedExercises,
      coursesInteracted,
      lastActivity,
      badgeAwarded,
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    res.status(500).json({ error: "Failed to retrieve student statistics" });
  }
};

const getCourseStats = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.user_id;

  try {
    const [progressRows, user] = await Promise.all([
      prisma.lesson_progress.findMany({
        where: {
          user_id: Number(userId),
          completed: true,
          lesson: {
            section: {
              course_id: Number(courseId),
            },
          },
        },
        select: {
          lesson_id: true,
          lesson: { select: { xp: true } },
        },
      }),
      prisma.users.findUnique({
        where: { user_id: Number(userId) },
        select: { streak: true },
      }),
    ]);

    const courseXP = progressRows.reduce(
      (sum, row) => sum + toNumber(row.lesson?.xp),
      0,
    );

    res.json({
      courseXP,
      exercisesCompleted: new Set(progressRows.map((row) => row.lesson_id))
        .size,
      streak: Number(user?.streak || 0),
      level: calculateLevel(courseXP),
      xpToNextLevel: calculateXPToNextLevel(courseXP),
    });
  } catch (err) {
    console.error("Error fetching course stats:", err);
    res.status(500).json({ error: "Failed to fetch course statistics" });
  }
};

const deleteStudentAccount = async (req, res) => {
  const userId = Number(req.user.user_id);

  try {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { email: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.recent_activity.deleteMany({ where: { user_id: userId } });
      await tx.lesson_progress.deleteMany({ where: { user_id: userId } });
      await tx.enrollment.deleteMany({ where: { user_id: userId } });
      await tx.feedback.deleteMany({ where: { user_id: userId } });
      await tx.admin_activity.deleteMany({ where: { admin_id: userId } });
      await tx.payment.deleteMany({ where: { user_id: userId } });
      await tx.refresh_tokens.deleteMany({ where: { user_id: userId } });
      await tx.site_visits.deleteMany({ where: { user_id: userId } });
      await tx.user_activity.deleteMany({ where: { user_id: userId } });
      await tx.user_sessions.deleteMany({ where: { user_id: userId } });
      await tx.user_subscription.deleteMany({ where: { user_id: userId } });
      await tx.subscription.deleteMany({ where: { user_id: userId } });
      await tx.comments.deleteMany({ where: { user_id: userId } });
      await tx.admins.deleteMany({ where: { admin_id: userId } });
      await tx.system_settings.updateMany({
        where: { updated_by: userId },
        data: { updated_by: null },
      });

      if (user?.email) {
        await tx.support.deleteMany({ where: { user_email: user.email } });
      }

      await tx.users.delete({ where: { user_id: userId } });
    });

    logger.info(`Account deletion successful for user ${userId}`);

    res.status(200).json({
      success: true,
      message: "Account successfully deleted",
    });
  } catch (error) {
    console.error("Error in deleteStudentAccount:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: error.message,
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getCoursesByStudentId,
  getEnrollmentsByUserId,
  getProgressByUserId,
  getStudentStats,
  getCourseStats,
  deleteStudentAccount,
};
