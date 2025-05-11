// server/middleware/sessionTracker.js
const db = require("../config/database");

/**
 * Middleware to track user sessions for analytics (user_sessions table)
 * - Creates a new session on first request or after timeout
 * - Updates session_end and session_duration on each request
 * - Increments page_views
 */
module.exports = async function sessionTracker(req, res, next) {
  // Set a timestamp as soon as the function is called for accurate timing
  const now = new Date();

  try {
    if (!req.user || !req.user.user_id) return next();
    const userId = req.user.user_id;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection.remoteAddress ||
      "0.0.0.0";
    let deviceType = req.headers["user-agent"] || "Unknown";
    if (deviceType.length > 50) deviceType = deviceType.slice(0, 50);

    // Find the most recent session (not ended, or ended within timeout)
    const { rows } = await db.query(
      `SELECT * FROM user_sessions WHERE user_id = $1 AND (session_end IS NULL OR session_end >= NOW() - INTERVAL '30 minutes') ORDER BY session_start DESC LIMIT 1`,
      [userId]
    );
    let session = rows[0];

    // Define the max gap (in ms) between requests to consider as "active" (e.g., 5 min)
    const MAX_ACTIVE_GAP = 5 * 60 * 1000;

    if (!session) {
      // No active session: create new
      await db.query(
        `INSERT INTO user_sessions (user_id, session_start, ip_address, device_type, page_views) VALUES ($1, NOW(), $2, $3, 1)`,
        [userId, ip, deviceType]
      );
    } else {
      // Use session_end as last activity if present, else session_start
      const sessionId = session.session_id;
      const newPageViews = (session.page_views || 0) + 1;
      const sessionStart = new Date(session.session_start);
      const lastActivity = session.session_end
        ? new Date(session.session_end)
        : sessionStart;
      const gap = now - lastActivity;

      let duration = session.session_duration || 0;
      if (gap > 0 && gap <= MAX_ACTIVE_GAP) {
        // Only add the gap if it's a positive, reasonable interval
        duration += Math.floor(gap / 1000); // seconds

        await db.query(
          `UPDATE user_sessions SET session_end = NOW(), session_duration = $1, page_views = $2 WHERE session_id = $3`,
          [duration, newPageViews, sessionId]
        );
      } else if (gap > MAX_ACTIVE_GAP) {
        // Gap too long: close previous session and start a new one

        await db.query(
          `UPDATE user_sessions SET session_end = NOW(), session_duration = $1 WHERE session_id = $2`,
          [duration, sessionId]
        );
        await db.query(
          `INSERT INTO user_sessions (user_id, session_start, ip_address, device_type, page_views) VALUES ($1, NOW(), $2, $3, 1)`,
          [userId, ip, deviceType]
        );
      } else {
        // If gap is 0 (multiple requests in the same ms), just update page_views

        await db.query(
          `UPDATE user_sessions SET page_views = $1 WHERE session_id = $2`,
          [newPageViews, sessionId]
        );
      }
    }
  } catch (err) {
    console.error("[SessionTracker] Error:", err);
    // Don't block request
  }
  next();
};
