const prisma = require("../config/prisma");

// Badge types enum
const BadgeType = {
  CODE_NOVICE: "code_novice",
  LESSON_SMASHER: "lesson_smasher",
  LANGUAGE_EXPLORER: "language_explorer",
  STREAK_MASTER: "streak_master",
  XP_ACHIEVER: "xp_achiever",
  PERFECTIONIST: "perfectionist",
  DAILY_LEARNER: "daily_learner",
  MARATHONER: "marathoner",
  PROFILE_COMPLETE: "profile_complete",
};

const DEFAULT_BADGES = [
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
  {
    badge_type: BadgeType.PERFECTIONIST,
    name: "Perfectionist",
    description: "Unlocked after achieving 100% completion in a course",
    image_path: "/badges/perfectionist.png",
  },
  {
    badge_type: BadgeType.DAILY_LEARNER,
    name: "Daily Learner",
    description: "Unlocked after completing a lesson on 3 consecutive days",
    image_path: "/badges/daily_learner.png",
  },
  {
    badge_type: BadgeType.MARATHONER,
    name: "Marathoner",
    description: "Unlocked after completing 5 lessons in a single day",
    image_path: "/badges/marathoner.png",
  },
  {
    badge_type: BadgeType.PROFILE_COMPLETE,
    name: "Profile Complete",
    description: "Unlocked after filling out all profile fields",
    image_path: "/badges/profile_complete.png",
  },
];

// Prisma-backed no-op for schema creation and initializer for seed data
const createBadgesTable = async () => {
  await initDefaultBadges();
};

// Initialize default badges
const initDefaultBadges = async () => {
  try {
    for (const badge of DEFAULT_BADGES) {
      const existing = await prisma.badges.findFirst({
        where: { badge_type: badge.badge_type },
        select: { badge_id: true },
      });

      if (!existing) {
        await prisma.badges.create({ data: badge });
      }
    }
  } catch (error) {
    console.error("Error initializing default badges:", error);
    throw error;
  }
};

// Award a badge to a user
const awardBadge = async (userId, badgeType) => {
  try {
    const badge = await prisma.badges.findFirst({
      where: { badge_type: badgeType },
      select: { badge_id: true },
    });

    if (!badge) {
      throw new Error(`Badge type ${badgeType} not found`);
    }

    const existingBadge = await prisma.user_badges.findFirst({
      where: {
        user_id: Number(userId),
        badge_id: badge.badge_id,
      },
      select: { user_badge_id: true },
    });

    if (existingBadge) {
      return { awarded: false, message: "Badge already awarded" };
    }

    await prisma.user_badges.create({
      data: {
        user_id: Number(userId),
        badge_id: badge.badge_id,
      },
    });

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
    const result = await prisma.user_badges.findMany({
      where: { user_id: Number(userId) },
      include: {
        badges: {
          select: {
            badge_id: true,
            badge_type: true,
            name: true,
            description: true,
            image_path: true,
          },
        },
      },
      orderBy: { awarded_at: "desc" },
    });

    return result.map((row) => ({
      badge_id: row.badges.badge_id,
      badge_type: row.badges.badge_type,
      name: row.badges.name,
      description: row.badges.description,
      image_path: row.badges.image_path,
      awarded_at: row.awarded_at,
    }));
  } catch (error) {
    console.error("Error retrieving user badges:", error);
    throw error;
  }
};

// Get all available badges
const getAllBadges = async () => {
  try {
    return prisma.badges.findMany({
      select: {
        badge_id: true,
        badge_type: true,
        name: true,
        description: true,
        image_path: true,
      },
      orderBy: { badge_id: "asc" },
    });
  } catch (error) {
    console.error("Error retrieving all badges:", error);
    throw error;
  }
};

// Check if a user has a specific badge
const userHasBadge = async (userId, badgeType) => {
  try {
    const result = await prisma.user_badges.findFirst({
      where: {
        user_id: Number(userId),
        badges: {
          badge_type: badgeType,
        },
      },
      select: { user_badge_id: true },
    });

    return Boolean(result);
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
