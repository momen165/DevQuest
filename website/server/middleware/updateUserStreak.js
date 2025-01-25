const db = require('../config/database');

const updateUserStreak = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    const userId = req.user.user_id;

    try {
        // First, check if we already updated the streak today
        const checkQuery = `
            SELECT last_streak_update::date = CURRENT_DATE as updated_today,
                   last_streak_update,
                   last_visit,
                   streak
            FROM users 
            WHERE user_id = $1;
        `;
        const checkResult = await db.query(checkQuery, [userId]);
        const userData = checkResult.rows[0];
        
        console.log(`[Streak Debug] User ${userId}:`, {
            currentTime: new Date().toISOString(),
            lastStreakUpdate: userData.last_streak_update?.toISOString(),
            lastVisit: userData.last_visit?.toISOString(),
            currentStreak: userData.streak,
            updatedToday: userData.updated_today,
            endpoint: req.originalUrl
        });

        // If we already updated today, just pass to next middleware
        if (userData?.updated_today) {
            console.log(`[Streak Debug] Skipping update - already updated today for user ${userId}`);
            return next();
        }

        // Get user data
        const query = `
            SELECT last_visit::date, streak,
                   last_visit::date = CURRENT_DATE - INTERVAL '1 day' as visited_yesterday
            FROM users
            WHERE user_id = $1;
        `;
        const { rows } = await db.query(query, [userId]);

        if (rows.length > 0) {
            const { streak, visited_yesterday } = rows[0];
            let newStreak = streak || 0;
            const oldStreak = newStreak;

            // Update streak based on visit pattern
            if (visited_yesterday) {
                // If they visited yesterday, increment streak
                newStreak += 1;
                console.log(`[Streak Debug] Incrementing streak for user ${userId} from ${oldStreak} to ${newStreak} - visited yesterday`);
            } else {
                // If they didn't visit yesterday, reset streak to 1
                newStreak = 1;
                console.log(`[Streak Debug] Resetting streak for user ${userId} from ${oldStreak} to ${newStreak} - didn't visit yesterday`);
            }

            // Update user data
            const updateQuery = `
                UPDATE users
                SET last_visit = CURRENT_DATE,
                    streak = $1,
                    last_streak_update = CURRENT_DATE
                WHERE user_id = $2
                RETURNING streak, last_visit, last_streak_update;
            `;
            const updateResult = await db.query(updateQuery, [newStreak, userId]);
            
            console.log(`[Streak Debug] Update completed for user ${userId}:`, {
                newStreak: updateResult.rows[0].streak,
                newLastVisit: updateResult.rows[0].last_visit,
                newLastStreakUpdate: updateResult.rows[0].last_streak_update
            });
        }

        next();
    } catch (err) {
        console.error('[Streak Error]', err);
        next(err);
    }
};

module.exports = updateUserStreak;
