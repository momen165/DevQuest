// Grant free subscription to a user (admin only)
const AdminModel = require("../models/admin.model.js");
const { logAdminActivity } = require("../models/activity");
// We need these imports for the generateTestData script, even though they're not used directly in this controller
// eslint-disable-next-line no-unused-vars
const { format, subDays } = require("date-fns");

const grantFreeSubscription = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { userId } = req.body;
    const freeEndDate = "2099-12-31";
    const subscriptionType = "Free";
    const amountPaid = 0;
    const status = "active";

    const { userName, userEmail } = await AdminModel.grantFreeSubscriptionDB(
      userId,
      freeEndDate,
      subscriptionType,
      amountPaid,
      status
    );

    const requesterName = await AdminModel.getUserNameByIdDB(req.user.userId);
    await logAdminActivity(
      req.user.userId,
      "Subscription",
      `Admin ${requesterName} (ID: ${req.user.userId}) granted free subscription to user ${userName} (ID: ${userId})`
    );

    res.status(200).json({ message: "Free subscription granted" });
  } catch (error) {
    console.error("Error granting free subscription:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Failed to grant free subscription" });
  }
};
// Enhanced admin controller with expanded analytics

// Original functions from admin.controller.js, now refactored
const getAdminActivities = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }
    const activities = await AdminModel.getAdminActivitiesDB(req.user.userId);
    res.status(200).json(activities);
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

const getSystemMetrics = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }
    const metrics = await AdminModel.getSystemMetricsDB();
    res.status(200).json(metrics);
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }
    const metrics = await AdminModel.getPerformanceMetricsDB();
    res.status(200).json(metrics);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
};

const addAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    const isRequesterAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // addAdminDB handles user existence and current admin status checks
    const { targetName, requesterName } = await AdminModel.addAdminDB(
      userId,
      req.user.userId
    );

    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) added user ${targetName} (ID: ${userId}) as admin`
    );

    res.status(200).json({ message: "Admin added successfully" });
  } catch (error) {
    console.error("Detailed error:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }
    if (error.message === "User is already an admin") {
      // Log attempt if user is already an admin (optional, as model throws error)
      // For consistency with original, we might want to fetch names here if logging this specific case.
      // However, the current addAdminDB throws before returning names in this case.
      // The original controller logged this specific case. We can adjust addAdminDB or handle it here.
      // For now, relying on the error message.
      const targetName = await AdminModel.getUserNameByIdDB(userId);
      const requesterName = await AdminModel.getUserNameByIdDB(req.user.userId);
      await logAdminActivity(
        req.user.userId,
        "Admin",
        `Admin ${requesterName} (ID: ${req.user.userId}) attempted to add user ${targetName} (ID: ${userId}) as admin but they are already an admin`
      );
      return res.status(400).json({ error: "User is already an admin" });
    }
    res.status(500).json({ error: "Failed to add admin" });
  }
};

const removeAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    const isRequesterAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isRequesterAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: "Cannot remove yourself as admin" });
    }

    // removeAdminDB handles admin existence check
    const { targetName, requesterName } = await AdminModel.removeAdminDB(
      userId,
      req.user.userId
    );

    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) removed user ${targetName} (ID: ${userId}) from admin role`
    );

    res.status(200).json({ message: "Admin removed successfully" });
  } catch (error) {
    console.error("Error removing admin:", error);
    if (error.message === "User is not an admin") {
      return res.status(404).json({ error: "User is not an admin" });
    }
    res.status(500).json({ error: "Failed to remove admin" });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { enabled } = req.body;
    const settings = await AdminModel.toggleMaintenanceModeDB(
      enabled,
      req.user.userId
    );

    await logAdminActivity(
      req.user.userId,
      "System",
      `Maintenance mode ${enabled ? "enabled" : "disabled"}`
    );

    res.status(200).json({
      maintenanceMode: settings.maintenance_mode,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json({ error: "Failed to toggle maintenance mode" });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const settings = await AdminModel.getSystemSettingsDB(req.user.userId);

    res.status(200).json({
      maintenanceMode: settings?.maintenance_mode || false,
      updatedAt: settings?.updated_at,
      updatedBy: settings?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
};

const checkAdminStatus = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    res.status(200).json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
};

const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await AdminModel.getMaintenanceStatusDB();
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.status(200).json({
      maintenanceMode: settings?.maintenance_mode || false,
      updatedAt: settings?.updated_at,
      updatedBy: settings?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    res.status(500).json({ error: "Failed to fetch maintenance status" });
  }
};

const getSiteAnalytics = async (req, res) => {
  try {
    const isAdmin = await AdminModel.checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const range = req.query.range || "30days";
    let days = 30;
    if (range === "7days") days = 7;
    else if (range === "90days") days = 90;

    const dbResults = await AdminModel.getSiteAnalyticsDB(days);

    const userStatsRaw = dbResults.userStats || {};
    const courseStatsRaw = dbResults.courseStats || {};
    const engagementStatsRaw = dbResults.engagementStats || {};

    const analyticsData = {
      visits: {
        daily: dbResults.dailyVisits || [],
        monthly: dbResults.monthlyVisits || [],
        last7Days: dbResults.dailyVisitsLast7Days || [],
        total: parseInt(dbResults.totalVisits?.total_visits || 0),
        unique: parseInt(dbResults.uniqueVisitors?.unique_visitors || 0),
      },
      userStats: {
        totalUsers: parseInt(userStatsRaw.total_users || 0),
        activeUsers: parseInt(userStatsRaw.active_users || 0),
        newUsers: parseInt(userStatsRaw.new_users || 0),
      },
      courseStats: {
        totalCourses: parseInt(courseStatsRaw.total_courses || 0),
        totalEnrollments: parseInt(courseStatsRaw.total_enrollments || 0),
        completionRate: parseFloat(courseStatsRaw.completion_rate || 0),
      },
      engagementStats: {
        averageSessionTime: parseFloat(
          engagementStatsRaw.avg_session_time || 0
        ),
        bounceRate: parseFloat(engagementStatsRaw.bounce_rate || 0),
        pageViews: parseInt(dbResults.filteredPageViews?.page_views || 0),
      },
      deviceBreakdown: dbResults.deviceBreakdown || [],
      topPages: dbResults.topPages || [],
      userEngagement: {
        newUsersDaily: dbResults.newUsersDaily || [],
        activeUsers24h: parseInt(
          dbResults.activeUsers24h?.active_users_24h || 0
        ),
        quizzesTaken: parseInt(
          dbResults.quizzesTaken?.total_quizzes_taken || 0
        ),
        mostAttemptedLessons: dbResults.mostAttemptedLessons || [],
      },
      environmentInfo: {
        topCountries: dbResults.topCountries || [],
        browserStats: dbResults.browserStats || [],
      },
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

module.exports = {
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
