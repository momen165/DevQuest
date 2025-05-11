const BASE_XP = 100;
const SCALING_FACTOR = 1.5;

// Calculate the minimum XP required for a given level
export const getXPForLevel = (level) => {
  if (level === 1) return 0;
  return BASE_XP * Math.pow(SCALING_FACTOR, level - 2);
};

// Calculate level based on XP
export const calculateLevel = (xp) => {
  if (!xp || xp < BASE_XP) return 1;
  return Math.floor(Math.log(xp / BASE_XP) / Math.log(SCALING_FACTOR)) + 2;
};

// Calculate progress within the current level
export const calculateLevelProgress = (xp) => {
  const level = calculateLevel(xp);
  const prevLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);

  // Add debugging
  console.log('Progress Calculation:', {
    xp,
    level,
    prevLevelXP,
    nextLevelXP,
    difference: nextLevelXP - prevLevelXP,
    progress: Math.round(((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100),
  });

  const progress = ((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
  return Math.min(100, Math.max(0, progress));
};

// Calculate XP needed for next level
export const calculateXPToNextLevel = (xp) => {
  const level = calculateLevel(xp);
  const nextLevelXP = getXPForLevel(level + 1);
  return Math.max(0, Math.round(nextLevelXP - xp));
};

export const XP_CONSTANTS = {
  BASE_XP,
  SCALING_FACTOR,
};
