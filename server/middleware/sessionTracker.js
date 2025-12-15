// server/middleware/sessionTracker.js
const db = require("../config/database");
const NodeCache = require("node-cache"); // Import NodeCache
const {
  warmSubscriptionCache,
} = require("../controllers/subscription.controller");

// Initialize cache for recent sessions with a short TTL (e.g., 5 minutes)
const sessionCache = new NodeCache({ stdTTL: 300 });
const SESSION_CACHE_KEY_PREFIX = "session_";

// Batch update buffer - reduces DB writes by batching updates
const updateBuffer = new Map();
const BATCH_INTERVAL = 10000; // 10 seconds
const BATCH_SIZE_LIMIT = 50; // Flush when reaching this size

// Periodically flush buffered updates
setInterval(() => {
  if (updateBuffer.size > 0) {
    flushSessionUpdates().catch((err) => {
      console.error("[SessionTracker] Flush error:", err);
    });
  }
}, BATCH_INTERVAL);

/**
 * Flush buffered session updates to database
 */
async function flushSessionUpdates() {
  if (updateBuffer.size === 0) return;

  const updates = Array.from(updateBuffer.values());
  updateBuffer.clear();

  try {
    // Batch update using parameterized query with UNNEST for safety
    if (updates.length > 0) {
      const sessionIds = updates.map(u => u.sessionId);
      const durations = updates.map(u => u.duration);
      const pageViews = updates.map(u => u.pageViews);
      
      const updateQuery = `
        UPDATE user_sessions AS us SET
          session_end = NOW(),
          session_duration = v.session_duration,
          page_views = v.page_views
        FROM (
          SELECT 
            UNNEST($1::int[]) AS session_id,
            UNNEST($2::int[]) AS session_duration,
            UNNEST($3::int[]) AS page_views
        ) AS v
        WHERE us.session_id = v.session_id
      `;
      await db.query(updateQuery, [sessionIds, durations, pageViews]);
    }
  } catch (err) {
    console.error("[SessionTracker] Batch update error:", err);
  }
}

/**
 * Middleware to track user sessions for analytics (user_sessions table)
 * - Creates a new session on first request or after timeout
 * - Buffers updates to reduce DB calls
 * - Increments page_views in memory
 * - Warms subscription cache in background
 */
module.exports = async function sessionTracker(req, res, next) {
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

    // Start subscription cache warming in background (non-blocking)
    // Use setTimeout with small delay to avoid execution during high-traffic periods
    setTimeout(() => {
      warmSubscriptionCache(userId).catch(() => {
        // Silently fail - don't block request
      });
    }, 100);

    const sessionCacheKey = SESSION_CACHE_KEY_PREFIX + userId;
    let session = sessionCache.get(sessionCacheKey);

    if (!session) {
      // Find the most recent session - use specific columns instead of SELECT *
      const { rows } = await db.query(
          `SELECT session_id, user_id, session_start, session_end, session_duration, page_views 
           FROM active_user_sessions
           WHERE user_id = $1
           ORDER BY session_start DESC
           LIMIT 1`,
          [userId]
      );
      session = rows[0];
      if (session) {
        sessionCache.set(sessionCacheKey, session); // Cache the session
      }
    }

    // Define the max gap (in ms) between requests to consider as "active" (e.g., 5 min)
    const MAX_ACTIVE_GAP = 5 * 60 * 1000;

    if (!session) {
      // No active session: create new (immediate write for new sessions)
      const result = await db.query(
        `INSERT INTO user_sessions (user_id, session_start, ip_address, device_type, page_views) 
         VALUES ($1, NOW(), $2, $3, 1) RETURNING session_id, session_start, page_views`,
        [userId, ip, deviceType]
      );
      // Cache the new session
      session = {
        session_id: result.rows[0].session_id,
        session_start: result.rows[0].session_start,
        page_views: 1,
        session_duration: 0,
        session_end: null
      };
      sessionCache.set(sessionCacheKey, session);
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

        // Buffer the update instead of immediate DB write
        updateBuffer.set(sessionId, {
          sessionId,
          duration,
          pageViews: newPageViews
        });

        // Update cache immediately for subsequent requests
        session.session_end = now;
        session.session_duration = duration;
        session.page_views = newPageViews;
        sessionCache.set(sessionCacheKey, session);

        // Flush immediately if buffer is full for backpressure control
        if (updateBuffer.size >= BATCH_SIZE_LIMIT) {
          flushSessionUpdates().catch(() => {});
        }
      } else if (gap > MAX_ACTIVE_GAP) {
        // Gap too long: close previous session and start a new one (immediate write)
        await db.query(
          `UPDATE user_sessions SET session_end = NOW(), session_duration = $1 WHERE session_id = $2`,
          [duration, sessionId]
        );
        const result = await db.query(
          `INSERT INTO user_sessions (user_id, session_start, ip_address, device_type, page_views) 
           VALUES ($1, NOW(), $2, $3, 1) RETURNING session_id, session_start, page_views`,
          [userId, ip, deviceType]
        );
        // Update cache with new session
        session = {
          session_id: result.rows[0].session_id,
          session_start: result.rows[0].session_start,
          page_views: 1,
          session_duration: 0,
          session_end: null
        };
        sessionCache.set(sessionCacheKey, session);
      } else {
        // If gap is 0 (multiple requests in the same ms), buffer the update
        updateBuffer.set(sessionId, {
          sessionId,
          duration,
          pageViews: newPageViews
        });

        // Update cache
        session.page_views = newPageViews;
        sessionCache.set(sessionCacheKey, session);

        // Flush immediately if buffer is full for backpressure control
        if (updateBuffer.size >= BATCH_SIZE_LIMIT) {
          flushSessionUpdates().catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("[SessionTracker] Error:", err);
    // Don't fail the request due to tracking errors
  }
  next();
};
