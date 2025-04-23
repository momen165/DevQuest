// Level calculation constants
const BASE_XP = 100; // Base XP required for level 1
const SCALING_FACTOR = 1.5; // How much more XP each level requires

// Calculate level based on XP
const calculateLevel = (xp) => {
  if (!xp || xp < BASE_XP) return 1;

  // Formula: level = floor(log(xp/BASE_XP)/log(SCALING_FACTOR)) + 1
  const level =
    Math.floor(Math.log(xp / BASE_XP) / Math.log(SCALING_FACTOR)) + 1;

  return Math.max(1, level); // Ensure minimum level is 1
};

// Calculate XP progress towards next level
const calculateLevelProgress = (xp) => {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = BASE_XP * Math.pow(SCALING_FACTOR, currentLevel - 1);
  const nextLevelXP = BASE_XP * Math.pow(SCALING_FACTOR, currentLevel);
  const progress =
    ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(100, Math.max(0, progress)); // Ensure progress is between 0 and 100
};

// Calculate XP needed for next level
const calculateXPToNextLevel = (xp) => {
  const currentLevel = calculateLevel(xp);
  const nextLevelXP = BASE_XP * Math.pow(SCALING_FACTOR, currentLevel);
  return Math.max(0, nextLevelXP - xp);
};

module.exports = {
  calculateLevel,
  calculateLevelProgress,
  calculateXPToNextLevel,
  BASE_XP,
  SCALING_FACTOR,
};
