const BadgeModel = require("../models/badge.model");

// Get all badges for the authenticated user
const getUserBadges = async (req, res) => {
  try {
    const userId = req.user.userId;
    const badges = await BadgeModel.getUserBadges(userId);

    return res.status(200).json({
      success: true,
      badges,
    });
  } catch (error) {
    console.error("Error getting user badges:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve badges",
    });
  }
};

// Get all available badges
const getAllBadges = async (req, res) => {
  try {
    const badges = await BadgeModel.getAllBadges();

    return res.status(200).json({
      success: true,
      badges,
    });
  } catch (error) {
    console.error("Error getting all badges:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve available badges",
    });
  }
};

// Check for badge eligibility and award appropriate badges
const checkAndAwardBadges = async (userId, eventType, eventData = {}) => {
  try {
    let badgeAwarded = null;

    switch (eventType) {
      case "code_submission":
        // Check for Code Novice badge (first code submission)
        const hasCodeNoviceBadge = await BadgeModel.userHasBadge(
          userId,
          BadgeModel.BadgeType.CODE_NOVICE
        );
        if (!hasCodeNoviceBadge) {
          badgeAwarded = await BadgeModel.awardBadge(
            userId,
            BadgeModel.BadgeType.CODE_NOVICE
          );
        }
        break;

      case "lesson_completed":
        // Check for Lesson Smasher badge (10 completed lessons)
        if (eventData.completedLessonsCount >= 10) {
          const hasLessonSmasherBadge = await BadgeModel.userHasBadge(
            userId,
            BadgeModel.BadgeType.LESSON_SMASHER
          );
          if (!hasLessonSmasherBadge) {
            badgeAwarded = await BadgeModel.awardBadge(
              userId,
              BadgeModel.BadgeType.LESSON_SMASHER
            );
          }
        }
        break;

      case "language_used":
        // Check for Language Explorer badge (3 different languages)
        if (eventData.uniqueLanguagesCount >= 3) {
          const hasLanguageExplorerBadge = await BadgeModel.userHasBadge(
            userId,
            BadgeModel.BadgeType.LANGUAGE_EXPLORER
          );
          if (!hasLanguageExplorerBadge) {
            badgeAwarded = await BadgeModel.awardBadge(
              userId,
              BadgeModel.BadgeType.LANGUAGE_EXPLORER
            );
          }
        }
        break;

      case "streak_update":
        // Check for Streak Master badge (7-day streak)
        if (eventData.streakDays >= 7) {
          const hasStreakMasterBadge = await BadgeModel.userHasBadge(
            userId,
            BadgeModel.BadgeType.STREAK_MASTER
          );
          if (!hasStreakMasterBadge) {
            badgeAwarded = await BadgeModel.awardBadge(
              userId,
              BadgeModel.BadgeType.STREAK_MASTER
            );
          }
        }
        break;

      case "xp_update":
        // Check for XP Achiever badge (100 XP)
        console.log("[XP BADGE DEBUG]", {
          userId,
          totalXp: eventData.totalXp,
          hasXpAchieverBadge: await BadgeModel.userHasBadge(
            userId,
            BadgeModel.BadgeType.XP_ACHIEVER
          ),
        });
        if (eventData.totalXp >= 100) {
          const hasXpAchieverBadge = await BadgeModel.userHasBadge(
            userId,
            BadgeModel.BadgeType.XP_ACHIEVER
          );
          if (!hasXpAchieverBadge) {
            badgeAwarded = await BadgeModel.awardBadge(
              userId,
              BadgeModel.BadgeType.XP_ACHIEVER
            );
          }
        }
        break;

      default:
        break;
    }

    return badgeAwarded;
  } catch (error) {
    console.error(
      `Error checking and awarding badges for ${eventType}:`,
      error
    );
    return null;
  }
};

// Manually award a badge to a user (admin only)
const awardBadgeToUser = async (req, res) => {
  try {
    // Check if the requester is an admin
    if (!req.user.admin) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to award badges",
      });
    }

    const { userId, badgeType } = req.body;

    if (!userId || !badgeType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Validate badge type
    const validBadgeType = Object.values(BadgeModel.BadgeType).includes(
      badgeType
    );
    if (!validBadgeType) {
      return res.status(400).json({
        success: false,
        error: "Invalid badge type",
      });
    }

    const result = await BadgeModel.awardBadge(userId, badgeType);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error awarding badge to user:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to award badge",
    });
  }
};

module.exports = {
  getUserBadges,
  getAllBadges,
  checkAndAwardBadges,
  awardBadgeToUser,
};
