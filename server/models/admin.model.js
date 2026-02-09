const prisma = require("../config/prisma");
const NodeCache = require("node-cache");
const { invalidateUserCache } = require("../utils/cache.utils");

// Initialize cache for admin access with a short TTL (e.g., 60 seconds)
const adminAccessCache = new NodeCache({ stdTTL: 60, maxKeys: 500, useClones: false });
const ADMIN_ACCESS_CACHE_KEY_PREFIX = "admin_access_";

const toInt = (value) => Number.parseInt(value, 10);

const getNow = () => new Date();

// Check if a user has admin access
const checkAdminAccess = async (userId) => {
  const normalizedUserId = toInt(userId);
  const cacheKey = ADMIN_ACCESS_CACHE_KEY_PREFIX + normalizedUserId;
  const cached = adminAccessCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  try {
    const admin = await prisma.admins.findUnique({
      where: { admin_id: normalizedUserId },
      select: { admin_id: true },
    });

    const isAdmin = Boolean(admin);
    adminAccessCache.set(cacheKey, isAdmin);
    return isAdmin;
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
};

// Grant free subscription to user
const grantFreeSubscriptionDB = async (
  userId,
  freeEndDate,
  subscriptionType,
  amountPaid,
  status,
) => {
  const normalizedUserId = toInt(userId);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.users.findUnique({
      where: { user_id: normalizedUserId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const subscription = await tx.subscription.create({
      data: {
        subscription_start_date: new Date(),
        subscription_end_date: new Date(freeEndDate),
        subscription_type: subscriptionType,
        amount_paid: Number(amountPaid),
        status: Boolean(status),
        user_email: user.email,
        user_id: normalizedUserId,
      },
      select: { subscription_id: true },
    });

    await tx.user_subscription.upsert({
      where: {
        user_id_subscription_id: {
          user_id: normalizedUserId,
          subscription_id: subscription.subscription_id,
        },
      },
      create: {
        user_id: normalizedUserId,
        subscription_id: subscription.subscription_id,
      },
      update: {},
    });

    return { userName: user.name, userEmail: user.email };
  });

  invalidateUserCache(normalizedUserId);

  return result;
};

// Get admin activities
const getAdminActivitiesDB = async (adminId) => {
  const rows = await prisma.admin_activity.findMany({
    where: { admin_id: toInt(adminId) },
    orderBy: { created_at: "desc" },
    take: 10,
    select: {
      activity_id: true,
      action_type: true,
      action_description: true,
      created_at: true,
    },
  });

  return rows.map((row) => ({
    activity_id: row.activity_id,
    type: row.action_type,
    description: row.action_description,
    created_at: row.created_at,
  }));
};

// Get system metrics
const getSystemMetricsDB = async () => {
  const [totalUsers, activeCourses, totalEnrollments] = await Promise.all([
    prisma.users.count(),
    prisma.course.count({ where: { is_active: true } }),
    prisma.enrollment.count(),
  ]);

  return {
    totalUsers,
    activeCourses,
    totalEnrollments,
  };
};

// Get performance metrics
const getPerformanceMetricsDB = async () => {
  const sevenDaysAgo = new Date(getNow().getTime() - 7 * 24 * 60 * 60 * 1000);

  const [completedLessons, activeUsersRows, avgSession] = await Promise.all([
    prisma.lesson_progress.count({ where: { completed: true } }),
    prisma.user_activity.findMany({
      where: {
        created_at: {
          gt: sevenDaysAgo,
        },
      },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
    prisma.user_sessions.aggregate({
      where: {
        created_at: { gte: sevenDaysAgo },
        session_duration: { not: null },
      },
      _avg: {
        session_duration: true,
      },
    }),
  ]);

  return {
    completed_lessons: String(completedLessons),
    active_users: String(activeUsersRows.length),
    avg_completion_time: Math.round(avgSession._avg.session_duration || 0),
  };
};

// Add admin
const addAdminDB = async (userId, requesterId) => {
  const normalizedUserId = toInt(userId);
  const normalizedRequesterId = toInt(requesterId);

  const [userExists, adminExists] = await Promise.all([
    prisma.users.findUnique({
      where: { user_id: normalizedUserId },
      select: { user_id: true },
    }),
    prisma.admins.findUnique({
      where: { admin_id: normalizedUserId },
      select: { admin_id: true },
    }),
  ]);

  if (!userExists) {
    throw new Error("User not found");
  }

  if (adminExists) {
    throw new Error("User is already an admin");
  }

  await prisma.admins.create({
    data: { admin_id: normalizedUserId },
  });

  adminAccessCache.del(ADMIN_ACCESS_CACHE_KEY_PREFIX + normalizedUserId);

  const [requesterInfo, targetInfo] = await Promise.all([
    prisma.users.findUnique({
      where: { user_id: normalizedRequesterId },
      select: { name: true },
    }),
    prisma.users.findUnique({
      where: { user_id: normalizedUserId },
      select: { name: true },
    }),
  ]);

  return {
    targetName: targetInfo?.name || "Unknown",
    requesterName: requesterInfo?.name || "Unknown",
  };
};

// Remove admin
const removeAdminDB = async (userIdToRemove, requesterId) => {
  const normalizedUserId = toInt(userIdToRemove);
  const normalizedRequesterId = toInt(requesterId);

  const adminExists = await prisma.admins.findUnique({
    where: { admin_id: normalizedUserId },
    select: { admin_id: true },
  });

  if (!adminExists) {
    throw new Error("User is not an admin");
  }

  await prisma.admins.delete({
    where: { admin_id: normalizedUserId },
  });

  adminAccessCache.del(ADMIN_ACCESS_CACHE_KEY_PREFIX + normalizedUserId);

  const [requesterInfo, targetInfo] = await Promise.all([
    prisma.users.findUnique({
      where: { user_id: normalizedRequesterId },
      select: { name: true },
    }),
    prisma.users.findUnique({
      where: { user_id: normalizedUserId },
      select: { name: true },
    }),
  ]);

  return {
    targetName: targetInfo?.name || "Unknown",
    requesterName: requesterInfo?.name || "Unknown",
  };
};

// Get user name by ID
const getUserNameByIdDB = async (userId) => {
  const userInfo = await prisma.users.findUnique({
    where: { user_id: toInt(userId) },
    select: { name: true },
  });

  return userInfo?.name || "Unknown";
};

// Toggle maintenance mode
const toggleMaintenanceModeDB = async (enabled, updatedByAdminId) => {
  return prisma.system_settings.upsert({
    where: { setting_id: 1 },
    create: {
      setting_id: 1,
      maintenance_mode: Boolean(enabled),
      updated_by: toInt(updatedByAdminId),
      updated_at: new Date(),
    },
    update: {
      maintenance_mode: Boolean(enabled),
      updated_by: toInt(updatedByAdminId),
      updated_at: new Date(),
    },
    select: { maintenance_mode: true },
  });
};

// Get system settings
const getSystemSettingsDB = async (adminId) => {
  return prisma.system_settings.upsert({
    where: { setting_id: 1 },
    create: {
      setting_id: 1,
      maintenance_mode: false,
      updated_by: toInt(adminId),
      updated_at: new Date(),
    },
    update: {},
    select: {
      maintenance_mode: true,
      updated_at: true,
      updated_by: true,
    },
  });
};

// Get maintenance status (public)
const getMaintenanceStatusDB = async () => {
  return prisma.system_settings.findUnique({
    where: { setting_id: 1 },
    select: {
      maintenance_mode: true,
      updated_at: true,
      updated_by: true,
    },
  });
};

// Helper: group rows by a date key and count occurrences
const aggregateByDate = (rows, dateField, formatFn) => {
  const map = new Map();
  for (const row of rows) {
    const val = row[dateField];
    if (!val) continue;
    const key = formatFn(val);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([key, count]) => ({ [dateField === "visit_date" ? "date" : dateField]: key, count: String(count) }));
};

const formatDateKey = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
};

const formatMonthKey = (date) => {
  const d = new Date(date);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}`;
};

// Get site analytics data
const getSiteAnalyticsDB = async (days) => {
  const now = getNow();
  const dayRangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const last7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeUserDays = Math.min(days, 30);
  const activeUserStart = new Date(
    now.getTime() - activeUserDays * 24 * 60 * 60 * 1000,
  );

  const pageFilter = {
    NOT: [
      { page_visited: { startsWith: "/admin/analytics" } },
      { page_visited: { startsWith: "/getCoursesWithRatings" } },
      { page_visited: { startsWith: "/api" } },
    ],
  };

  const [
    totalVisits,
    visitsInRangeCount,
    filteredPageViews,
    totalUsers,
    activeUsers,
    newUsers,
    totalCourses,
    totalEnrollments,
    completionRate,
    sessionsWithDuration,
    // For date-based aggregation (in-memory grouping)
    visitsInRange,
    visitsInLast7,
    monthlyVisitRows,
    newUsersRows,
    // groupBy queries
    topPagesRaw,
    topCountriesRaw,
    browserStatsRaw,
    deviceStatsRaw,
    // Small result sets
    activeUsers24Rows,
    uniqueVisitorRows,
    lessonProgressRows,
    sessionsInRange,
  ] = await Promise.all([
    // --- Scalar counts ---
    prisma.site_visits.count(),
    prisma.site_visits.count({ where: { visit_date: { gte: dayRangeStart } } }),
    prisma.site_visits.count({
      where: { visit_date: { gte: dayRangeStart }, ...pageFilter },
    }),
    prisma.users.count(),
    prisma.users.count({ where: { last_login: { gte: activeUserStart } } }),
    prisma.users.count({ where: { created_at: { gte: dayRangeStart } } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.enrollment.aggregate({ _avg: { progress: true } }),
    prisma.user_sessions.aggregate({
      where: {
        created_at: { gte: dayRangeStart },
        session_duration: { gt: 0 },
      },
      _avg: { session_duration: true },
    }),

    // --- Date rows for in-memory aggregation ---
    prisma.site_visits.findMany({
      where: { visit_date: { gte: dayRangeStart } },
      select: { visit_date: true },
    }),
    prisma.site_visits.findMany({
      where: { visit_date: { gte: last7Start } },
      select: { visit_date: true },
    }),
    prisma.site_visits.findMany({
      where: { visit_date: { gte: dayRangeStart } },
      select: { visit_date: true },
    }),
    prisma.users.findMany({
      where: { created_at: { gte: dayRangeStart } },
      select: { created_at: true },
    }),

    // --- groupBy queries (Prisma) ---
    prisma.site_visits.groupBy({
      by: ["page_visited"],
      where: { visit_date: { gte: dayRangeStart }, ...pageFilter },
      _count: { page_visited: true },
      orderBy: { _count: { page_visited: "desc" } },
      take: 10,
    }),
    prisma.site_visits.groupBy({
      by: ["country"],
      where: {
        visit_date: { gte: dayRangeStart },
        country: { not: null },
      },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 5,
    }),
    prisma.site_visits.groupBy({
      by: ["browser"],
      where: {
        visit_date: { gte: dayRangeStart },
        browser: { not: null },
      },
      _count: { browser: true },
      orderBy: { _count: { browser: "desc" } },
      take: 5,
    }),
    prisma.site_visits.groupBy({
      by: ["device_type"],
      where: {
        visit_date: { gte: dayRangeStart },
        device_type: { not: null },
      },
      _count: { device_type: true },
      orderBy: { _count: { device_type: "desc" } },
    }),

    // --- Small result sets ---
    prisma.user_activity.findMany({
      where: {
        created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
    prisma.site_visits.findMany({
      where: { visit_date: { gte: dayRangeStart } },
      select: { user_id: true, ip_address: true },
    }),
    prisma.lesson_progress.findMany({
      where: { completed_at: { gte: dayRangeStart } },
      select: {
        lesson_id: true,
        lesson: { select: { name: true } },
      },
    }),
    prisma.user_sessions.findMany({
      where: { created_at: { gte: dayRangeStart } },
      select: { page_views: true, session_id: true },
    }),
  ]);

  // Aggregate date-based series in memory
  const dailyVisits = aggregateByDate(visitsInRange, "visit_date", formatDateKey);
  const dailyVisitsLast7 = aggregateByDate(visitsInLast7, "visit_date", formatDateKey);

  const monthlyVisits = (() => {
    const map = new Map();
    for (const row of monthlyVisitRows) {
      if (!row.visit_date) continue;
      const key = formatMonthKey(row.visit_date);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, count]) => ({ month, count: String(count) }));
  })();

  const newUsersDaily = (() => {
    const map = new Map();
    for (const row of newUsersRows) {
      if (!row.created_at) continue;
      const key = formatDateKey(row.created_at);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, count]) => ({ date, count: String(count) }));
  })();

  // Unique visitors via in-memory Set
  const uniqueVisitors = new Set(
    uniqueVisitorRows.map((row) =>
      row.user_id ? `user-${row.user_id}` : `ip-${row.ip_address || "unknown"}`,
    ),
  ).size;

  // Most attempted lessons via in-memory aggregation
  const lessonAttemptsMap = new Map();
  for (const row of lessonProgressRows) {
    if (!row.lesson_id) continue;
    const current = lessonAttemptsMap.get(row.lesson_id) || {
      lesson_title: row.lesson?.name || "Untitled Lesson",
      attempts: 0,
    };
    current.attempts += 1;
    lessonAttemptsMap.set(row.lesson_id, current);
  }
  const mostAttemptedLessons = Array.from(lessonAttemptsMap.values())
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5)
    .map((row) => ({
      lesson_title: row.lesson_title,
      attempts: String(row.attempts),
    }));

  const bounceCount = sessionsInRange.filter(
    (s) => (s.page_views || 0) === 1,
  ).length;
  const bounceRate =
    sessionsInRange.length > 0
      ? (bounceCount * 100) / sessionsInRange.length
      : 0;

  return {
    totalVisits: { total_visits: String(totalVisits) },
    dailyVisitsLast7Days: dailyVisitsLast7,
    uniqueVisitors: { unique_visitors: String(uniqueVisitors) },
    topPages: topPagesRaw.map((row) => ({
      page_visited: row.page_visited,
      visits: String(row._count.page_visited),
    })),
    filteredPageViews: { page_views: String(filteredPageViews) },
    dailyVisits,
    monthlyVisits,
    userStats: {
      total_users: String(totalUsers),
      active_users: String(activeUsers),
      new_users: String(newUsers),
    },
    newUsersDaily,
    activeUsers24h: { active_users_24h: String(activeUsers24Rows.length) },
    quizzesTaken: { total_quizzes_taken: "0" },
    mostAttemptedLessons,
    courseStats: {
      total_courses: String(totalCourses),
      total_enrollments: String(totalEnrollments),
      completion_rate: Number(completionRate._avg.progress || 0),
    },
    engagementStats: {
      avg_session_time: Number(sessionsWithDuration._avg.session_duration || 0),
      bounce_rate: bounceRate,
    },
    topCountries: topCountriesRaw.map((row) => ({
      country: row.country,
      visits: String(row._count.country),
    })),
    browserStats: browserStatsRaw.map((row) => ({
      browser: row.browser,
      count: String(row._count.browser),
      percentage:
        visitsInRangeCount > 0
          ? (row._count.browser * 100.0) / visitsInRangeCount
          : 0,
    })),
    deviceBreakdown: deviceStatsRaw.map((row) => ({
      device: row.device_type,
      percentage:
        visitsInRangeCount > 0
          ? (row._count.device_type * 100.0) / visitsInRangeCount
          : 0,
    })),
  };
};

module.exports = {
  checkAdminAccess,
  grantFreeSubscriptionDB,
  getAdminActivitiesDB,
  getSystemMetricsDB,
  getPerformanceMetricsDB,
  addAdminDB,
  removeAdminDB,
  getUserNameByIdDB,
  toggleMaintenanceModeDB,
  getSystemSettingsDB,
  getMaintenanceStatusDB,
  getSiteAnalyticsDB,
};
