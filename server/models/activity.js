const prisma = require("../config/prisma");

/**
 * Logs an activity to the database
 */
const logActivity = async (actionType, actionDescription, userId = null) => {
  try {
    await prisma.recent_activity.create({
      data: {
        action_type: actionType,
        action_description: actionDescription,
        user_id: userId,
      },
    });
    console.log(`Activity logged: ${actionType} - ${actionDescription}`);
  } catch (err) {
    console.error("Error logging activity:", err.message || err);
  }
};

/**
 * Logs an admin activity to the database
 */
const logAdminActivity = async (adminId, actionType, actionDescription) => {
  try {
    await prisma.admin_activity.create({
      data: {
        admin_id: adminId,
        action_type: actionType,
        action_description: actionDescription,
      },
    });
    console.log(`Admin activity logged: ${actionType} - ${actionDescription}`);
  } catch (err) {
    console.error("Error logging admin activity:", err.message || err);
  }
};

/**
 * Fetches recent activities from the database.
 */
const getRecentActivities = async (limit = 10) => {
  try {
    return prisma.recent_activity.findMany({
      take: Number(limit) || 10,
      orderBy: { created_at: "desc" },
      select: {
        activity_id: true,
        action_type: true,
        action_description: true,
        user_id: true,
        created_at: true,
      },
    });
  } catch (err) {
    console.error("Error fetching recent activities:", err.message || err);
    throw new Error("Failed to fetch recent activities");
  }
};

module.exports = {
  logActivity,
  getRecentActivities,
  logAdminActivity,
};
