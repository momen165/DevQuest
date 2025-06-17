const db = require("../config/database");

// Badge types enum
const BadgeType = {
  CODE_NOVICE: "code_novice",
  LESSON_SMASHER: "lesson_smasher",
  LANGUAGE_EXPLORER: "language_explorer",
  STREAK_MASTER: "streak_master",
  XP_ACHIEVER: "xp_achiever",
};

// Create badges table if not exists
const createBadgesTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS badges (
        badge_id SERIAL PRIMARY KEY,
        badge_type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        user_badge_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (badge_id) REFERENCES badges(badge_id),
        UNIQUE (user_id, badge_id)
      );
    `);

    //console.log("Badges tables created successfully");

    // Insert default badges if they don't exist
    await initDefaultBadges();
  } catch (error) {
    console.error("Error creating badges tables:", error);
    throw error;
  }
};

// Initialize default badges
const initDefaultBadges = async () => {
  const defaultBadges = [
    {
      badge_type: BadgeType.CODE_NOVICE,
      name: "Code Novice",
      description: "Unlocked after submitting your first code",
      image_path: "/badges/code_novice.png",
    },
    {
      badge_type: BadgeType.LESSON_SMASHER,
      name: "Lesson Smasher",
      description: "Unlocked after completing 10 lessons successfully",
      image_path: "/badges/lesson_smasher.png",
    },
    {
      badge_type: BadgeType.LANGUAGE_EXPLORER,
      name: "Language Explorer",
      description: "Unlocked after using 3 different programming languages",
      image_path: "/badges/language_explorer.png",
    },
    {
      badge_type: BadgeType.STREAK_MASTER,
      name: "Streak Master",
      description: "Unlocked after maintaining a 7-day learning streak",
      image_path: "/badges/streak_master.png",
    },
    {
      badge_type: BadgeType.XP_ACHIEVER,
      name: "100 XP Achieved",
      description: "Unlocked after reaching 100 XP",
      image_path: "/badges/xp_achiever.png",
    },
  ];

  try {
    // Check if badges already exist
    const badgesResult = await db.query("SELECT badge_type FROM badges");
    const existingBadgeTypes = badgesResult.rows.map((row) => row.badge_type);

    // Insert only badges that don't already exist
    for (const badge of defaultBadges) {
      if (!existingBadgeTypes.includes(badge.badge_type)) {
        await db.query(
          `INSERT INTO badges (badge_type, name, description, image_path) 
           VALUES ($1, $2, $3, $4)`,
          [badge.badge_type, badge.name, badge.description, badge.image_path]
        );
      }
    }

    //console.log("Default badges initialized");
  } catch (error) {
    console.error("Error initializing default badges:", error);
    throw error;
  }
};

// Award a badge to a user
const awardBadge = async (userId, badgeType) => {
  try {
    // Get badge ID
    const badgeResult = await db.query(
      "SELECT badge_id FROM badges WHERE badge_type = $1",
      [badgeType]
    );

    if (badgeResult.rows.length === 0) {
      throw new Error(`Badge type ${badgeType} not found`);
    }

    const badgeId = badgeResult.rows[0].badge_id;

    // Check if user already has this badge
    const existingBadgeResult = await db.query(
      "SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_id = $2",
      [userId, badgeId]
    );

    if (existingBadgeResult.rows.length > 0) {
      // User already has this badge
      return { awarded: false, message: "Badge already awarded" };
    }

    // Award badge to user
    await db.query(
      "INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)",
      [userId, badgeId]
    );

    return {
      awarded: true,
      message: "Badge awarded successfully",
      badge_type: badgeType,
    };
  } catch (error) {
    console.error("Error awarding badge:", error);
    throw error;
  }
};

// Get all badges for a user
const getUserBadges = async (userId) => {
  try {
    const result = await db.query(
      `SELECT b.badge_id, b.badge_type, b.name, b.description, b.image_path, ub.awarded_at 
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.awarded_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error retrieving user badges:", error);
    throw error;
  }
};

// Get all available badges
const getAllBadges = async () => {
  try {
    const result = await db.query(
      `SELECT badge_id, badge_type, name, description, image_path FROM badges ORDER BY badge_id`
    );

    return result.rows;
  } catch (error) {
    console.error("Error retrieving all badges:", error);
    throw error;
  }
};

// Check if a user has a specific badge
const userHasBadge = async (userId, badgeType) => {
  try {
    const result = await db.query(
      `SELECT 1 FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.badge_id
       WHERE ub.user_id = $1 AND b.badge_type = $2`,
      [userId, badgeType]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking if user has badge:", error);
    throw error;
  }
};

module.exports = {
  BadgeType,
  createBadgesTable,
  awardBadge,
  getUserBadges,
  getAllBadges,
  userHasBadge,
};
