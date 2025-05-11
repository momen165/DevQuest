// Grant free subscription to a user (admin only)
const grantFreeSubscription = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { userId } = req.body;
    // Check if user exists
    const userCheck = await db.query(
      "SELECT email, name FROM users WHERE user_id = $1",
      [userId]
    );
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userEmail = userCheck.rows[0].email;
    const userName = userCheck.rows[0].name;

    // Insert a new free subscription (or reuse if already exists and active)
    // We'll use a far-future end date for unlimited access
    const freeEndDate = "2099-12-31";
    const subscriptionType = "Free";
    const amountPaid = 0;
    const status = "active";

    // Insert into subscription table
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

    // Link user to subscription
    await db.query(
      `INSERT INTO user_subscription (user_id, subscription_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, subscriptionId]
    );

    // Log admin activity
    const requesterInfo = await db.query(
      "SELECT name FROM users WHERE user_id = $1",
      [req.user.userId]
    );
    const requesterName = requesterInfo.rows[0]?.name || "Unknown";
    await logAdminActivity(
      req.user.userId,
      "Subscription",
      `Admin ${requesterName} (ID: ${req.user.userId}) granted free subscription to user ${userName} (ID: ${userId})`
    );

    res.status(200).json({ message: "Free subscription granted" });
  } catch (error) {
    console.error("Error granting free subscription:", error);
    res.status(500).json({ error: "Failed to grant free subscription" });
  }
};
// Enhanced admin controller with expanded analytics
const db = require("../config/database");
const { logAdminActivity } = require("../models/activity");
// We need these imports for the generateTestData script, even though they're not used directly in this controller
// eslint-disable-next-line no-unused-vars
const { format, subDays } = require("date-fns");

const checkAdminAccess = async (userId) => {
  try {
    const query = "SELECT 1 FROM admins WHERE admin_id = $1";
    const result = await db.query(query, [userId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
};

// Original functions from admin.controller.js
const getAdminActivities = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

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
    const { rows } = await db.query(query, [req.user.userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

const getSystemMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

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

    res.status(200).json(Object.assign({}, ...results));
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM lesson_progress WHERE completed = true) as completed_lessons,
        (SELECT COUNT(DISTINCT user_id) FROM user_activity 
         WHERE created_at > NOW() - INTERVAL '7 days') as active_users,
        (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::integer 
         FROM lesson_progress WHERE completed = true) as avg_completion_time
    `;

    const { rows } = await db.query(query);
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
};

const addAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    // Check if requester is admin
    const isAdmin = await checkAdminAccess(req.user.userId);

    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if user exists
    const userCheck = await db.query("SELECT 1 FROM users WHERE user_id = $1", [
      userId,
    ]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already an admin
    const adminCheck = await db.query(
      "SELECT 1 FROM admins WHERE admin_id = $1",
      [userId]
    );
    if (adminCheck.rowCount > 0) {
      // Get names for both admins
      const [requesterInfo, targetInfo] = await Promise.all([
        db.query("SELECT name FROM users WHERE user_id = $1", [
          req.user.userId,
        ]),
        db.query("SELECT name FROM users WHERE user_id = $1", [userId]),
      ]);

      const requesterName = requesterInfo.rows[0]?.name || "Unknown";
      const targetName = targetInfo.rows[0]?.name || "Unknown";

      // Log the attempt with detailed information
      await logAdminActivity(
        req.user.userId,
        "Admin",
        `Admin ${requesterName} (ID: ${req.user.userId}) attempted to add user ${targetName} (ID: ${userId}) as admin but they are already an admin`
      );
      return res.status(400).json({ error: "User is already an admin" });
    }

    // Add user as admin
    await db.query("INSERT INTO admins (admin_id) VALUES ($1)", [userId]);

    // Get names for both users involved
    const [requesterInfo, targetInfo] = await Promise.all([
      db.query("SELECT name FROM users WHERE user_id = $1", [req.user.userId]),
      db.query("SELECT name FROM users WHERE user_id = $1", [userId]),
    ]);

    const requesterName = requesterInfo.rows[0]?.name || "Unknown";
    const targetName = targetInfo.rows[0]?.name || "Unknown";

    // Log successful addition
    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) added user ${targetName} (ID: ${userId}) as admin`
    );

    res.status(200).json({ message: "Admin added successfully" });
  } catch (error) {
    console.error("Detailed error:", error); // Debug error
    res.status(500).json({ error: "Failed to add admin" });
  }
};

const removeAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prevent removing self
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: "Cannot remove yourself as admin" });
    }

    // Check if user exists and is an admin
    const adminCheck = await db.query(
      "SELECT 1 FROM admins WHERE admin_id = $1",
      [userId]
    );
    if (adminCheck.rowCount === 0) {
      return res.status(404).json({ error: "User is not an admin" });
    }

    // Remove admin
    await db.query("DELETE FROM admins WHERE admin_id = $1", [userId]);

    // Get names for both users involved
    const [requesterInfo, targetInfo] = await Promise.all([
      db.query("SELECT name FROM users WHERE user_id = $1", [req.user.userId]),
      db.query("SELECT name FROM users WHERE user_id = $1", [userId]),
    ]);

    const requesterName = requesterInfo.rows[0]?.name || "Unknown";
    const targetName = targetInfo.rows[0]?.name || "Unknown";

    // Log activity
    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) removed user ${targetName} (ID: ${userId}) from admin role`
    );

    res.status(200).json({ message: "Admin removed successfully" });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ error: "Failed to remove admin" });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { enabled } = req.body;

    // Update maintenance mode using your schema
    const query = `
      INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
      VALUES (1, $1, CURRENT_TIMESTAMP, $2)
      ON CONFLICT (setting_id) DO UPDATE 
      SET maintenance_mode = $1, 
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
      RETURNING maintenance_mode`;

    const { rows } = await db.query(query, [enabled, req.user.userId]);

    await logAdminActivity(
      req.user.userId,
      "System",
      `Maintenance mode ${enabled ? "enabled" : "disabled"}`
    );

    res.status(200).json({
      maintenanceMode: rows[0].maintenance_mode,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json({ error: "Failed to toggle maintenance mode" });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get settings using your schema
    const query = `
      INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
      VALUES (1, false, CURRENT_TIMESTAMP, $1)
      ON CONFLICT (setting_id) DO UPDATE 
      SET setting_id = system_settings.setting_id
      RETURNING maintenance_mode, updated_at, updated_by`;

    const { rows } = await db.query(query, [req.user.userId]);

    res.status(200).json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      updatedAt: rows[0]?.updated_at,
      updatedBy: rows[0]?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
};

const checkAdminStatus = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    res.status(200).json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
};

const getMaintenanceStatus = async (req, res) => {
  try {
    // This is a public endpoint, so we don't need to check for admin access
    const query = `
      SELECT maintenance_mode, updated_at, updated_by 
      FROM system_settings 
      WHERE setting_id = 1`;

    const { rows } = await db.query(query);

    // Add Cache-Control headers to prevent browsers from caching the response
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    res.status(200).json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      updatedAt: rows[0]?.updated_at,
      updatedBy: rows[0]?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    res.status(500).json({ error: "Failed to fetch maintenance status" });
  }
};

const getSiteAnalytics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get range parameter from query, default to 30 days
    const range = req.query.range || "30days";
    // Convert range to days
    let days = 30;

    switch (range) {
      case "7days":
        days = 7;
        break;
      case "90days":
        days = 90;
        break;
      default:
        days = 30;
    }

    // Basic Stats - Total visits site-wide
    const totalVisitsQuery = `
      SELECT COUNT(*) as total_visits
      FROM site_visits
    `;

    // Basic Stats - Daily visits for last 7 days regardless of selected range
    const dailyVisitsLast7DaysQuery = `
      SELECT 
        TO_CHAR(visit_date, 'YYYY-MM-DD') as date,
        COUNT(visit_id) as count
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Basic Stats - Unique visitors
    const uniqueVisitorsQuery = `
      SELECT 
        COUNT(DISTINCT COALESCE(user_id::text, ip_address)) as unique_visitors
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
    `;

    // Basic Stats - Visits per page/route
    const topPagesQuery = `
      SELECT 
        page_visited,
        COUNT(*) as visits
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
        AND page_visited IS NOT NULL
        AND page_visited NOT LIKE '/admin/analytics%'
        AND page_visited NOT LIKE '/getCoursesWithRatings%'
        AND page_visited NOT LIKE '/api%'
      GROUP BY page_visited
      ORDER BY visits DESC
      LIMIT 10
    `;

    // Filtered Page Views (to match topPages filters)
    const filteredPageViewsQuery = `
      SELECT COUNT(*) as page_views
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
        AND page_visited IS NOT NULL
        AND page_visited NOT LIKE '/admin/analytics%'
        AND page_visited NOT LIKE '/getCoursesWithRatings%'
        AND page_visited NOT LIKE '/api%'
    `;

    // Query to get daily visits for the selected date range
    const dailyVisitsQuery = `
      SELECT 
        TO_CHAR(visit_date, 'YYYY-MM-DD') as date,
        COUNT(visit_id) as count
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Query to get monthly visits - adapt based on the selected range
    const monthsToGet = Math.max(1, Math.ceil(days / 30));
    const monthlyVisitsQuery = `
      SELECT 
        TO_CHAR(visit_date, 'YYYY-MM') as month,
        COUNT(visit_id) as count
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${monthsToGet} months'
      GROUP BY TO_CHAR(visit_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    // Query to get user statistics - adjust active and new users based on range
    const activeUserDays = Math.min(days, 30); // Cap at 30 for active users definition
    const userStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '${activeUserDays} days') as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '${days} days') as new_users
    `;

    // User Engagement - New users daily
    const newUsersDailyQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(user_id) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // User Engagement - Active users last 24h
    const activeUsers24hQuery = `
      SELECT COUNT(DISTINCT user_id) as active_users_24h
      FROM user_activity
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    // User Engagement - Quizzes taken
    const quizzesTakenQuery = `
      SELECT COUNT(*) as total_quizzes_taken
      FROM quiz_attempts
      WHERE attempted_at >= NOW() - INTERVAL '${days} days'
    `; // User Engagement - Most attempted lessons
    const mostAttemptedLessonsQuery = `
      SELECT 
        l.name as lesson_title,
        COUNT(lp.lesson_id) as attempts
      FROM lesson_progress lp
      JOIN lesson l ON lp.lesson_id = l.lesson_id
      WHERE lp.completed_at >= NOW() - INTERVAL '${days} days' OR lp.completed_at IS NULL
      GROUP BY l.lesson_id, l.name
      ORDER BY attempts DESC
      LIMIT 5
    `;

    // Query to get course statistics
    const courseStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM course) as total_courses,
        (SELECT COUNT(*) FROM enrollment) as total_enrollments,
        (SELECT 
          ROUND(AVG(progress) * 100) / 100
         FROM enrollment) as completion_rate
    `; // Query to get engagement statistics based on selected range
    const engagementStatsQuery = `
      SELECT 
        (SELECT COALESCE(AVG(session_duration), 0) FROM user_sessions 
         WHERE created_at >= NOW() - INTERVAL '${days} days' 
         AND session_duration > 0) as avg_session_time,
        (SELECT COALESCE(
          (SUM(CASE WHEN page_views = 1 THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(session_id), 0), 0)
         FROM user_sessions 
         WHERE created_at >= NOW() - INTERVAL '${days} days') as bounce_rate,
        (SELECT COALESCE(SUM(page_views), 0) FROM user_sessions 
         WHERE created_at >= NOW() - INTERVAL '${days} days') as page_views
    `;

    // Environment Info - Top countries
    const topCountriesQuery = `
      SELECT 
        country,
        COUNT(*) as visits
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY visits DESC
      LIMIT 5
    `;

    // Environment Info - Browser stats
    const browserStatsQuery = `
      SELECT 
        browser,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days') as percentage
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 5
    `;

    // Query to get device breakdown
    const deviceBreakdownQuery = `
      SELECT 
        device_type as device,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM site_visits WHERE visit_date >= NOW() - INTERVAL '${days} days') as percentage
      FROM site_visits
      WHERE visit_date >= NOW() - INTERVAL '${days} days'
      GROUP BY device_type
      ORDER BY percentage DESC
    `;

    // Execute all queries in parallel for better performance
    const [
      dailyVisits,
      monthlyVisits,
      userStats,
      courseStats,
      engagementStats,
      deviceBreakdown,
      totalVisits,
      dailyVisitsLast7Days,
      uniqueVisitors,
      topPages,
      newUsersDaily,
      activeUsers24h,
      quizzesTaken,
      mostAttemptedLessons,
      topCountries,
      browserStats,
      filteredPageViewsResult,
    ] = await Promise.all([
      db.query(dailyVisitsQuery),
      db.query(monthlyVisitsQuery),
      db.query(userStatsQuery),
      db.query(courseStatsQuery),
      db.query(engagementStatsQuery),
      db.query(deviceBreakdownQuery),
      db.query(totalVisitsQuery),
      db.query(dailyVisitsLast7DaysQuery),
      db.query(uniqueVisitorsQuery),
      db.query(topPagesQuery),
      db.query(newUsersDailyQuery),
      db.query(activeUsers24hQuery),
      db.query(quizzesTakenQuery),
      db.query(mostAttemptedLessonsQuery),
      db.query(topCountriesQuery),
      db.query(browserStatsQuery),
      db.query(filteredPageViewsQuery),
    ]);

    // Map userStats keys to camelCase for frontend compatibility
    const userStatsRaw = userStats.rows[0] || {};
    const userStatsCamel = {
      totalUsers: userStatsRaw.total_users || 0,
      activeUsers: userStatsRaw.active_users || 0,
      newUsers: userStatsRaw.new_users || 0,
    };

    // Map courseStats keys to camelCase
    const courseStatsRaw = courseStats.rows[0] || {};
    const courseStatsCamel = {
      totalCourses: courseStatsRaw.total_courses || 0,
      totalEnrollments: courseStatsRaw.total_enrollments || 0,
      completionRate: courseStatsRaw.completion_rate || 0,
    };

    // Map engagementStats keys to camelCase
    const engagementStatsRaw = engagementStats.rows[0] || {};
    const engagementStatsCamel = {
      averageSessionTime: engagementStatsRaw.avg_session_time || 0,
      bounceRate: engagementStatsRaw.bounce_rate || 0,
      // Use filtered page views to match topPages
      pageViews: parseInt(filteredPageViewsResult.rows[0]?.page_views || 0),
    };

    // Construct the response object
    const analyticsData = {
      visits: {
        daily: dailyVisits.rows,
        monthly: monthlyVisits.rows,
        last7Days: dailyVisitsLast7Days.rows,
        total: parseInt(totalVisits.rows[0]?.total_visits || 0),
        unique: parseInt(uniqueVisitors.rows[0]?.unique_visitors || 0),
      },
      userStats: userStatsCamel,
      courseStats: courseStatsCamel,
      engagementStats: engagementStatsCamel,
      deviceBreakdown: deviceBreakdown.rows,
      topPages: topPages.rows || [],
      userEngagement: {
        newUsersDaily: newUsersDaily.rows || [],
        activeUsers24h: parseInt(activeUsers24h.rows[0]?.active_users_24h || 0),
        quizzesTaken: parseInt(quizzesTaken.rows[0]?.total_quizzes_taken || 0),
        mostAttemptedLessons: mostAttemptedLessons.rows || [],
      },
      environmentInfo: {
        topCountries: topCountries.rows || [],
        browserStats: browserStats.rows || [],
      },
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

module.exports = {
  // Include all existing exports
  getAdminActivities,
  getSystemMetrics,
  getPerformanceMetrics,
  addAdmin,
  removeAdmin,
  toggleMaintenanceMode,
  getSystemSettings,
  checkAdminStatus,
  getMaintenanceStatus,
  getSiteAnalytics,
  grantFreeSubscription,
};
