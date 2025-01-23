const db = require('../config/database');

const logActivity = async (actionType, actionDescription, userId = null) => {
  try {
    const query = `
      INSERT INTO recent_activity (action_type, action_description, user_id, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')
    `;
    await db.query(query, [actionType, actionDescription, userId]);
  } catch (err) {
    console.error('Error logging activity:', err.message || err);
  }
};

module.exports = logActivity;
