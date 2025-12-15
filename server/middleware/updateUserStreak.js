const db = require("../config/database");
const badgeController = require("../controllers/badge.controller");

// Cache to track users already updated today - reduces unnecessary DB checks
const NodeCache = require("node-cache");
const streakUpdateCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

const updateUserStreak = async (req, res, next) => {
  // console.log("[Streak Debug] updateUserStreak middleware called");
  if (!req.user) {
    // console.log("[Streak Debug] No req.user, skipping streak update");
    return next();
  }

  const userId = req.user.user_id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
  const cacheKey = `streak_${userId}_${today}`;

  // Check cache first to avoid DB transaction if already updated today
  if (streakUpdateCache.get(cacheKey)) {
    return next();
  }

  try {
    const client = await db.connect();
    let didUpdate = false;
    let newStreak = null;
    try {
      await client.query("BEGIN");
      // Fetch user streak and last update info with row lock
      const checkQuery = `
        SELECT user_id, streak, last_streak_update AT TIME ZONE 'UTC' AS last_streak_update_utc, last_visit AT TIME ZONE 'UTC' AS last_visit_utc
        FROM users
        WHERE user_id = $1
        FOR UPDATE;
      `;
      const { rows } = await client.query(checkQuery, [userId]);
      if (!rows.length) {
        // console.log(`[Streak Debug] No user found for id ${userId}`);
        await client.query("ROLLBACK");
        client.release();
        return next();
      }
      const user = rows[0];
      const now = new Date();
      const nowUTC = new Date(now.toISOString().slice(0, 10)); // midnight UTC today
      const lastUpdate = user.last_streak_update_utc
        ? new Date(user.last_streak_update_utc.toISOString().slice(0, 10))
        : null;
      const lastVisit = user.last_visit_utc
        ? new Date(user.last_visit_utc.toISOString().slice(0, 10))
        : null;
      // console.log(
      //   `[Streak Debug] nowUTC: ${nowUTC}, lastUpdate: ${lastUpdate}, lastVisit: ${lastVisit}`
      // );
      // If already updated today (UTC), skip and cache the result
      if (lastUpdate && nowUTC.getTime() === lastUpdate.getTime()) {
        // console.log(`[Streak Debug] Already updated today for user ${userId}`);
        streakUpdateCache.set(cacheKey, true);
        await client.query("ROLLBACK");
        client.release();
        return next();
      }
      // If last visit was yesterday (UTC), increment streak
      let yesterdayUTC = new Date(nowUTC);
      yesterdayUTC.setUTCDate(nowUTC.getUTCDate() - 1);
      if (lastVisit && lastVisit.getTime() === yesterdayUTC.getTime()) {
        newStreak = (user.streak || 0) + 1;
        // console.log(
        //   `[Streak Debug] Incrementing streak for user ${userId} to ${newStreak}`
        // );
      } else {
        newStreak = 1;
        if (lastVisit) {
          // console.log(
          //   `[Streak Debug] Resetting streak for user ${userId} to 1 (last visit: ${lastVisit})`
          // );
        } else {
          console.log(`[Streak Debug] First streak for user ${userId}`);
        }
      }
      // Update user record
      const updateQuery = `
        UPDATE users
        SET last_visit = (NOW() AT TIME ZONE 'UTC'),
            last_streak_update = (NOW() AT TIME ZONE 'UTC'),
            streak = $1
        WHERE user_id = $2
        RETURNING streak, last_visit, last_streak_update;
      `;
      const updateResult = await client.query(updateQuery, [newStreak, userId]);
      didUpdate = true;
      if (process.env.NODE_ENV === "development") {
        console.log(updateResult.rows[0]);
      }
      // Cache that this user was updated today
      streakUpdateCache.set(cacheKey, true);
      await client.query("COMMIT");
      client.release();
    } catch (txnErr) {
      await client.query("ROLLBACK");
      client.release();
      throw txnErr;
    }
    // Only award badge if streak was updated
    if (didUpdate && newStreak >= 7) {
      try {
        const badgeAwarded = await badgeController.checkAndAwardBadges(
          userId,
          "streak_update",
          { streakDays: newStreak }
        );
        if (badgeAwarded?.awarded) {
          console.log(
            `[Badge] User ${userId} earned the Streak Master badge for ${newStreak} day streak`
          );
        }
      } catch (badgeError) {
        console.error(
          "[Badge Error] Error while checking streak badge:",
          badgeError
        );
      }
    }
    return next();
  } catch (err) {
    console.error("[Streak Error]", err);
    next(err);
  }
};

module.exports = updateUserStreak;
