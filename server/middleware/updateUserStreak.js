const prisma = require("../config/prisma");
const badgeController = require("../controllers/badge.controller");

// Cache to track users already updated today - reduces unnecessary DB checks
const NodeCache = require("node-cache");
const streakUpdateCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

const dayStartUtc = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const updateUserStreak = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userId = req.user.user_id;
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `streak_${userId}_${today}`;

  if (streakUpdateCache.get(cacheKey)) {
    return next();
  }

  try {
    let didUpdate = false;
    let newStreak = null;

    await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          streak: true,
          last_streak_update: true,
          last_visit: true,
        },
      });

      if (!user) {
        return;
      }

      const now = new Date();
      const nowUTC = dayStartUtc(now);
      const lastUpdate = user.last_streak_update
        ? dayStartUtc(user.last_streak_update)
        : null;
      const lastVisit = user.last_visit ? dayStartUtc(user.last_visit) : null;

      if (lastUpdate && nowUTC.getTime() === lastUpdate.getTime()) {
        streakUpdateCache.set(cacheKey, true);
        return;
      }

      const yesterdayUTC = new Date(nowUTC);
      yesterdayUTC.setUTCDate(nowUTC.getUTCDate() - 1);

      if (lastVisit && lastVisit.getTime() === yesterdayUTC.getTime()) {
        newStreak = (user.streak || 0) + 1;
      } else {
        newStreak = 1;
      }

      await tx.users.update({
        where: { user_id: userId },
        data: {
          last_visit: now,
          last_streak_update: now,
          streak: newStreak,
        },
      });

      didUpdate = true;
      streakUpdateCache.set(cacheKey, true);
    });

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
