/**
 * Utility functions for badge metadata and formatting
 */

/**
 * Gets the display name for a badge type
 * @param {string} badgeType - The badge type identifier
 * @returns {string} The display name
 */
export const getBadgeName = (badgeType) => {
  const badgeNames = {
    'code_novice': 'Code Novice',
    'lesson_smasher': 'Lesson Smasher',
    'language_explorer': 'Language Explorer',
    'streak_master': 'Streak Master',
    'xp_achiever': '100 XP Achieved'
  };
  return badgeNames[badgeType] || 'Achievement';
};

/**
 * Gets the description for a badge type
 * @param {string} badgeType - The badge type identifier
 * @returns {string} The description
 */
export const getBadgeDescription = (badgeType) => {
  const badgeDescriptions = {
    'code_novice': 'Unlocked after submitting your first code',
    'lesson_smasher': 'Unlocked after completing 10 lessons successfully',
    'language_explorer': 'Unlocked after using 3 different programming languages',
    'streak_master': 'Unlocked after maintaining a 7-day learning streak',
    'xp_achiever': 'Unlocked after reaching 100 XP'
  };
  return badgeDescriptions[badgeType] || 'You achieved something special!';
};

/**
 * Gets the CDN image path for a badge type
 * @param {string} badgeType - The badge type identifier
 * @returns {string} The full URL to the badge image
 */
export const getBadgeImagePath = (badgeType) => {
  return `https://cdn.dev-quest.me/badges/${badgeType}.png`;
};

/**
 * Formats a badge object with metadata if it's missing
 * @param {Object} badge - The badge object from the backend
 * @returns {Object} The formatted badge object
 */
export const formatBadge = (badge) => {
  if (!badge) return null;
  
  return {
    ...badge,
    name: badge.name || getBadgeName(badge.badge_type),
    description: badge.description || getBadgeDescription(badge.badge_type),
    image_path: badge.image_path || getBadgeImagePath(badge.badge_type)
  };
};
