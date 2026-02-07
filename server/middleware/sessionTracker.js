// server/middleware/sessionTracker.js
const prisma = require("../config/prisma");
const NodeCache = require("node-cache");
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
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.user_sessions.update({
            where: { session_id: update.sessionId },
            data: {
              session_end: new Date(),
              session_duration: update.duration,
              page_views: update.pageViews,
            },
          })
        )
      );
    }
  } catch (err) {
    console.error("[SessionTracker] Batch update error:", err);
  }
}

/**
 * Middleware to track user sessions for analytics (user_sessions table)
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

    setTimeout(() => {
      warmSubscriptionCache(userId).catch(() => {
        // Silently fail - don't block request
      });
    }, 100);

    const sessionCacheKey = SESSION_CACHE_KEY_PREFIX + userId;
    let session = sessionCache.get(sessionCacheKey);

    if (!session) {
      session = await prisma.user_sessions.findFirst({
        where: { user_id: userId, session_end: null },
        orderBy: { session_start: "desc" },
        select: {
          session_id: true,
          user_id: true,
          session_start: true,
          session_end: true,
          session_duration: true,
          page_views: true,
        },
      });

      if (session) {
        sessionCache.set(sessionCacheKey, session);
      }
    }

    const MAX_ACTIVE_GAP = 5 * 60 * 1000;

    if (!session) {
      const created = await prisma.user_sessions.create({
        data: {
          user_id: userId,
          session_start: now,
          ip_address: ip,
          device_type: deviceType,
          page_views: 1,
        },
        select: {
          session_id: true,
          session_start: true,
          page_views: true,
        },
      });

      session = {
        session_id: created.session_id,
        session_start: created.session_start,
        page_views: 1,
        session_duration: 0,
        session_end: null,
      };
      sessionCache.set(sessionCacheKey, session);
    } else {
      const sessionId = session.session_id;
      const newPageViews = (session.page_views || 0) + 1;
      const sessionStart = new Date(session.session_start);
      const lastActivity = session.session_end
        ? new Date(session.session_end)
        : sessionStart;
      const gap = now - lastActivity;

      let duration = session.session_duration || 0;
      if (gap > 0 && gap <= MAX_ACTIVE_GAP) {
        duration += Math.floor(gap / 1000);

        updateBuffer.set(sessionId, {
          sessionId,
          duration,
          pageViews: newPageViews,
        });

        session.session_end = now;
        session.session_duration = duration;
        session.page_views = newPageViews;
        sessionCache.set(sessionCacheKey, session);

        if (updateBuffer.size >= BATCH_SIZE_LIMIT) {
          flushSessionUpdates().catch(() => {});
        }
      } else if (gap > MAX_ACTIVE_GAP) {
        await prisma.user_sessions.update({
          where: { session_id: sessionId },
          data: {
            session_end: now,
            session_duration: duration,
          },
        });

        const created = await prisma.user_sessions.create({
          data: {
            user_id: userId,
            session_start: now,
            ip_address: ip,
            device_type: deviceType,
            page_views: 1,
          },
          select: {
            session_id: true,
            session_start: true,
            page_views: true,
          },
        });

        session = {
          session_id: created.session_id,
          session_start: created.session_start,
          page_views: 1,
          session_duration: 0,
          session_end: null,
        };
        sessionCache.set(sessionCacheKey, session);
      } else {
        updateBuffer.set(sessionId, {
          sessionId,
          duration,
          pageViews: newPageViews,
        });

        session.page_views = newPageViews;
        sessionCache.set(sessionCacheKey, session);

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
