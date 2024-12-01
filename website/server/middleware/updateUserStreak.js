const db = require('../config/database');

const updateUserStreak = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    const userId = req.user.user_id;

    // Get today's date in UTC and format it as YYYY-MM-DD
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const formattedToday = today.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const query = `
            SELECT last_visit, streak
            FROM users
            WHERE user_id = $1;
        `;
        const { rows } = await db.query(query, [userId]);

        if (rows.length > 0) {
            const { last_visit, streak } = rows[0];

            // Parse last_visit as a date (it will already be in YYYY-MM-DD format if it's a DATE column)
            const lastVisitDate = new Date(last_visit);

            let newStreak = streak;

            // Compare dates for streak logic
            if (lastVisitDate.getTime() === today.getTime()) {
                // Last visit is today; no need to update streak
                return next();
            } else if (lastVisitDate.getTime() === today.getTime() - 86400000) {
                // Last visit was yesterday; increment streak
                newStreak += 1;
            } else {
                // Last visit was before yesterday; reset streak
                newStreak = 1;
            }

            // Update the last visit date and streak
            const updateQuery = `
                UPDATE users
                SET last_visit = $1, streak = $2
                WHERE user_id = $3;
            `;
            await db.query(updateQuery, [formattedToday, newStreak, userId]);
        } else {
            return res.status(404).json({ error: 'User not found.' });
        }

        next();
    } catch (err) {
        console.error('Error updating user streak:', err);
        res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
};

module.exports = updateUserStreak;
