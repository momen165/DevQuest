const db = require("../config/database");
const NodeCache = require("node-cache"); // Import NodeCache

// Initialize cache for admin access with a short TTL (e.g., 60 seconds)
const adminAccessCache = new NodeCache({ stdTTL: 60 });
const ADMIN_ACCESS_CACHE_KEY_PREFIX = "admin_access_";

// Check if a user has admin access
const checkAdminAccess = async (userId) => {
  const cacheKey = ADMIN_ACCESS_CACHE_KEY_PREFIX + userId;
  let isAdmin = adminAccessCache.get(cacheKey);

  if (isAdmin !== undefined) {
    return isAdmin; // Return from cache if available
  }

  try {
    const query = "SELECT 1 FROM admin_lookup WHERE admin_id = $1";
    const result = await db.query(query, [userId]);
    isAdmin = result.rowCount > 0;
    adminAccessCache.set(cacheKey, isAdmin); // Store in cache
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
  status
) => {
  const userCheck = await db.query(
    "SELECT email, name FROM users WHERE user_id = $1",
    [userId]
  );

  if (userCheck.rowCount === 0) {
    throw new Error("User not found");
  }

  const userEmail = userCheck.rows[0].email;
  const userName = userCheck.rows[0].name;

  const insertSubQuery = `
    INSERT INTO subscription (subscription_start_date, subscription_end_date, subscription_type, amount_paid, status, user_email, user_id)
    VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
    RETURNING subscription_id;
  `;

  const { rows: subRows } = await db.query(insertSubQuery, [
    freeEndDate,
    subscriptionType,
    amountPaid,
    status,
    userEmail,
    userId,
  ]);

  const subscriptionId = subRows[0].subscription_id;

  await db.query(
    `INSERT INTO user_subscription (user_id, subscription_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, subscriptionId]
  );

  return { userName, userEmail }; // Returns target user's name and email
};

// Get admin activities
const getAdminActivitiesDB = async (adminId) => {
  const query = `
    SELECT 
      activity_id,
      action_type as type,
      action_description as description,
      created_at
    FROM admin_activity
    WHERE admin_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const { rows } = await db.query(query, [adminId]);
  return rows;
};

// Get system metrics
const getSystemMetricsDB = async () => {
  const queries = {
    totalUsers: "SELECT COUNT(*) FROM users",
    activeCourses: "SELECT COUNT(*) FROM course WHERE is_active = true",
    totalEnrollments: "SELECT COUNT(*) FROM enrollment",
  };

  const results = await Promise.all(
    Object.entries(queries).map(async ([key, query]) => {
      const { rows } = await db.query(query);
      return { [key]: parseInt(rows[0].count) };
    })
  );

  return Object.assign({}, ...results);
};

// Get performance metrics
const getPerformanceMetricsDB = async () => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM lesson_progress WHERE completed = true) as completed_lessons,
      (SELECT COUNT(DISTINCT user_id) FROM user_activity 
       WHERE created_at > NOW() - INTERVAL '7 days') as active_users,
      (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::integer 
       FROM lesson_progress WHERE completed = true) as avg_completion_time
  `;

  const { rows } = await db.query(query);
  return rows[0];
};

// Add admin
const addAdminDB = async (userId, requesterId) => {
  const userCheck = await db.query("SELECT 1 FROM users WHERE user_id = $1", [
    userId,
  ]);
  if (userCheck.rowCount === 0) {
    throw new Error("User not found");
  }

  const adminCheck = await db.query(
    "SELECT 1 FROM admin_lookup WHERE admin_id = $1",
    [userId]
  );
  if (adminCheck.rowCount > 0) {
    throw new Error("User is already an admin");
  }

  await db.query("INSERT INTO admins (admin_id) VALUES ($1)", [userId]);

  // Invalidate cache for the added admin
  adminAccessCache.del(ADMIN_ACCESS_CACHE_KEY_PREFIX + userId);

  const [requesterInfo, targetInfo] = await Promise.all([
    db.query("SELECT name FROM users WHERE user_id = $1", [requesterId]),
    db.query("SELECT name FROM users WHERE user_id = $1", [userId]),
  ]);

  return {
    targetName: targetInfo.rows[0]?.name || "Unknown",
    requesterName: requesterInfo.rows[0]?.name || "Unknown",
  };
};

// Remove admin
const removeAdminDB = async (userIdToRemove, requesterId) => {
  const adminCheck = await db.query(
    "SELECT 1 FROM admin_lookup WHERE admin_id = $1",
    [userIdToRemove]
  );
  if (adminCheck.rowCount === 0) {
    throw new Error("User is not an admin");
  }

  await db.query("DELETE FROM admins WHERE admin_id = $1", [userIdToRemove]);

  // Invalidate cache for the removed admin
  adminAccessCache.del(ADMIN_ACCESS_CACHE_KEY_PREFIX + userIdToRemove);

  const [requesterInfo, targetInfo] = await Promise.all([
    db.query("SELECT name FROM users WHERE user_id = $1", [requesterId]),
    db.query("SELECT name FROM users WHERE user_id = $1", [userIdToRemove]),
  ]);

  return {
    targetName: targetInfo.rows[0]?.name || "Unknown",
    requesterName: requesterInfo.rows[0]?.name || "Unknown",
  };
};

// Get user name by ID
const getUserNameByIdDB = async (userId) => {
  const userInfo = await db.query("SELECT name FROM users WHERE user_id = $1", [
    userId,
  ]);
  return userInfo.rows[0]?.name || "Unknown";
};

// Toggle maintenance mode
const toggleMaintenanceModeDB = async (enabled, updatedByAdminId) => {
  const query = `
    INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
    VALUES (1, $1, CURRENT_TIMESTAMP, $2)
    ON CONFLICT (setting_id) DO UPDATE 
    SET maintenance_mode = $1, 
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $2
    RETURNING maintenance_mode`;
  const { rows } = await db.query(query, [enabled, updatedByAdminId]);
  return rows[0];
};

// Get system settings
const getSystemSettingsDB = async (adminId) => {
  const query = `
    INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
    VALUES (1, false, CURRENT_TIMESTAMP, $1) 
    ON CONFLICT (setting_id) DO UPDATE 
    SET setting_id = system_settings.setting_id 
    RETURNING maintenance_mode, updated_at, updated_by`;
  const { rows } = await db.query(query, [adminId]);
  return rows[0];
};

// Get maintenance status (public)
const getMaintenanceStatusDB = async () => {
  const query = `
    SELECT maintenance_mode, updated_at, updated_by 
    FROM system_settings 
    WHERE setting_id = 1`;
  const { rows } = await db.query(query);
  return rows[0];
};

// Get site analytics data
const getSiteAnalyticsDB = async (days) => {
  const activeUserDays = Math.min(days, 30);
  const monthsToGet = Math.max(1, Math.ceil(days / 30));

  const queries = {
    totalVisits: `SELECT COUNT(*) as total_visits FROM site_visits`,
    dailyVisitsLast7Days: `
      SELECT TO_CHAR(visit_date, 'YYYY-MM-DD') as date, COUNT(visit_id) as count
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM-DD') ORDER BY date ASC`,
    uniqueVisitors: `
      SELECT COUNT(DISTINCT COALESCE(user_id::text, ip_address)) as unique_visitors
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days'`,
    topPages: `
      SELECT page_visited, COUNT(*) as visits FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
        AND page_visited IS NOT NULL AND page_visited NOT LIKE '/admin/analytics%'
        AND page_visited NOT LIKE '/getCoursesWithRatings%' AND page_visited NOT LIKE '/api%'
      GROUP BY page_visited ORDER BY visits DESC LIMIT 10`,
    filteredPageViews: `
      SELECT COUNT(*) as page_views FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
        AND page_visited IS NOT NULL AND page_visited NOT LIKE '/admin/analytics%'
        AND page_visited NOT LIKE '/getCoursesWithRatings%' AND page_visited NOT LIKE '/api%'`,
    dailyVisits: `
      SELECT TO_CHAR(visit_date, 'YYYY-MM-DD') as date, COUNT(visit_id) as count
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM-DD') ORDER BY date ASC`,
    monthlyVisits: `
      SELECT TO_CHAR(visit_date, 'YYYY-MM') as month, COUNT(visit_id) as count
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${monthsToGet} months'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM') ORDER BY month ASC`,
    userStats: `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '${activeUserDays} days') as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '${days} days') as new_users`,
    newUsersDaily: `
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(user_id) as count
      FROM users WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC`,
    activeUsers24h: `
      SELECT COUNT(DISTINCT user_id) as active_users_24h
      FROM user_activity WHERE created_at >= NOW() - INTERVAL '24 hours'`,
    quizzesTaken: `
      SELECT COUNT(*) as total_quizzes_taken
      FROM quiz_attempts WHERE attempted_at >= NOW() - INTERVAL '${days} days'`,
    mostAttemptedLessons: `
      SELECT l.name as lesson_title, COUNT(lp.lesson_id) as attempts
      FROM lesson_progress lp JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.completed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY l.lesson_id, l.name ORDER BY attempts DESC LIMIT 5`,
    courseStats: `
      SELECT 
        (SELECT COUNT(*) FROM course) as total_courses,
        (SELECT COUNT(*) FROM enrollment) as total_enrollments,
        (SELECT ROUND(COALESCE(AVG(progress),0) * 100) / 100 FROM enrollment) as completion_rate`,
    engagementStats: `
      SELECT 
        (SELECT COALESCE(AVG(session_duration), 0) FROM user_sessions 
         WHERE created_at >= NOW() - INTERVAL '${days} days' AND session_duration > 0) as avg_session_time,
        (SELECT COALESCE((SUM(CASE WHEN page_views = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(session_id), 0), 0)
         FROM user_sessions WHERE created_at >= NOW() - INTERVAL '${days} days') as bounce_rate`,
    topCountries: `
      SELECT country, COUNT(*) as visits FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days' AND country IS NOT NULL
      GROUP BY country ORDER BY visits DESC LIMIT 5`,
    browserStats: `
      SELECT browser, COUNT(*) as count,
        COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days'), 0) as percentage
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days' AND browser IS NOT NULL
      GROUP BY browser ORDER BY count DESC LIMIT 5`,
    deviceBreakdown: `
      SELECT device_type as device,
        COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days'),0) as percentage
      FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days' AND device_type IS NOT NULL
      GROUP BY device_type ORDER BY percentage DESC`,
  };

  const results = {};
  const promises = Object.entries(queries).map(async ([key, queryStr]) => {
    try {
      const { rows } = await db.query(queryStr);
      // Simplify result structure for single-row results
      if (
        rows.length === 1 &&
        (key === "totalVisits" ||
          key === "uniqueVisitors" ||
          key === "userStats" ||
          key === "courseStats" ||
          key === "engagementStats" ||
          key === "activeUsers24h" ||
          key === "quizzesTaken" ||
          key === "filteredPageViews")
      ) {
        results[key] = rows[0];
      } else {
        results[key] = rows;
      }
    } catch (error) {
      console.error(`Error executing query for ${key}:`, error);
      results[key] =
        key === "userStats" ||
        key === "courseStats" ||
        key === "engagementStats"
          ? {}
          : []; // Default to empty object or array on error
    }
  });

  await Promise.all(promises);
  return results;
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
