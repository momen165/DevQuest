const db = require("../config/database");

/**
 * Logs an activity to the database
 * @param {string} actionType - Type of action (e.g., 'Course', 'Section', 'Lesson').
 * @param {string} actionDescription - Detailed description of the action.
 * @param {number|null} userId - ID of the user performing the action (nullable).
 */
const logActivity = async (actionType, actionDescription, userId = null) => {
  try {
    const query = `
      INSERT INTO recent_activity (action_type, action_description, user_id, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;
    await db.query(query, [actionType, actionDescription, userId]);
    console.log(`Activity logged: ${actionType} - ${actionDescription}`);
  } catch (err) {
    console.error("Error logging activity:", err.message || err);
  }
};

/**
 * Logs an admin activity to the database
 * @param {number} adminId - ID of the admin performing the action.
 * @param {string} actionType - Type of action (e.g., 'Course', 'Section', 'Lesson').
 * @param {string} actionDescription - Detailed description of the action.
 */
const logAdminActivity = async (adminId, actionType, actionDescription) => {
  try {
    const query = `
      INSERT INTO admin_activity (admin_id, action_type, action_description, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;
    await db.query(query, [adminId, actionType, actionDescription]);
    console.log(`Admin activity logged: ${actionType} - ${actionDescription}`);
  } catch (err) {
    console.error("Error logging admin activity:", err.message || err);
  }
};

/**
 * Fetches recent activities from the database.
 * @param {number} limit - Number of recent activities to fetch (default: 10).
 * @returns {Promise<Array>} - List of recent activities.
 */
const getRecentActivities = async (limit = 30) => {
  try {
    const query = `
      SELECT activity_id, action_type, action_description, user_id, created_at
      FROM recent_activity
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const { rows } = await db.query(query, [limit]);
    return rows;
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
