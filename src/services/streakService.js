/**
 * Streak Service
 *
 * Computes current streak, longest-ever streak, and earned milestone badges
 * from meal compliance data stored in localStorage.
 *
 * A "streak day" = at least one meal marked as 'eaten' on that calendar day.
 */
import { getStorageKey as getComplianceKey } from './complianceService';
import { readSynced, writeSynced } from './syncedStorage';

// ── Milestone badge definitions ───────────────────────────────────────────────
export const STREAK_MILESTONES = [
  { days: 3,   emoji: '🌱', label: '3-Day Start',    description: 'You started a healthy habit!' },
  { days: 7,   emoji: '🔥', label: 'Week Warrior',   description: '7 days strong!' },
  { days: 14,  emoji: '⚡', label: 'Two Weeks',       description: '14 days of dedication!' },
  { days: 21,  emoji: '💪', label: '21-Day Habit',   description: 'Science says this is a habit now!' },
  { days: 30,  emoji: '🏅', label: 'Month Master',   description: '30 days — incredible commitment!' },
  { days: 60,  emoji: '🏆', label: '60-Day Legend',  description: '2 months of consistency!' },
  { days: 90,  emoji: '👑', label: '90-Day Champion', description: '90 days — you are unstoppable!' },
  { days: 180, emoji: '🚀', label: 'Half Year Hero',  description: '180 days — legendary!' },
  { days: 365, emoji: '🌟', label: 'Year of Health',  description: 'A full year! You are a NutriPlan legend!' },
];

/**
 * Returns the local YYYY-MM-DD date string for a Date object.
 */
const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns true if at least one meal was eaten on the given date string.
 */
const hasActivityOnDate = (complianceData, dateKey) => {
  const day = complianceData[dateKey];
  if (!day?.meals) return false;
  return Object.values(day.meals).some(s => s === 'eaten');
};

/**
 * Computes current streak (consecutive days going backwards from today).
 * Today is included if it already has activity; if today has no activity yet,
 * we start checking from yesterday so the streak doesn't reset mid-day.
 */
export const calculateCurrentStreak = () => {
  const complianceData = JSON.parse(localStorage.getItem(getComplianceKey()) || '{}');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  // If today has no activity yet, start from yesterday
  if (!hasActivityOnDate(complianceData, toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  // Walk backwards until a gap
  for (let i = 0; i < 365; i++) {
    if (hasActivityOnDate(complianceData, toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Computes the longest streak ever recorded in compliance data.
 */
export const calculateLongestStreak = () => {
  const complianceData = JSON.parse(localStorage.getItem(getComplianceKey()) || '{}');
  const dates = Object.keys(complianceData).sort();
  if (dates.length === 0) return 0;

  let longest = 0;
  let current = 0;
  let prevDate = null;

  dates.forEach(dateKey => {
    if (!hasActivityOnDate(complianceData, dateKey)) {
      current = 0;
      prevDate = null;
      return;
    }

    if (prevDate) {
      // Check if this date is exactly 1 day after the previous
      const prev = new Date(prevDate);
      prev.setDate(prev.getDate() + 1);
      if (toDateKey(prev) === dateKey) {
        current++;
      } else {
        current = 1;
      }
    } else {
      current = 1;
    }

    if (current > longest) longest = current;
    prevDate = dateKey;
  });

  return longest;
};

/**
 * Returns an array of milestone objects the user has earned (streakDays >= milestone.days).
 */
export const getEarnedMilestones = (streakDays) =>
  STREAK_MILESTONES.filter(m => streakDays >= m.days);

/**
 * Returns the next upcoming milestone the user hasn't reached yet, or null if all earned.
 */
export const getNextMilestone = (streakDays) =>
  STREAK_MILESTONES.find(m => streakDays < m.days) ?? null;

/**
 * Returns streak metadata object: { currentStreak, longestStreak, earnedMilestones, nextMilestone }
 */
export const getStreakData = () => {
  const currentStreak = calculateCurrentStreak();
  const longestStreak = calculateLongestStreak();
  const earnedMilestones = getEarnedMilestones(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);

  // Persist longest streak so it survives resets
  try {
    const meta = readSynced('streakMeta', {}) || {};
    const savedLongest = meta.longestStreak || 0;
    const trueLongest = Math.max(longestStreak, savedLongest);
    writeSynced('streakMeta', { longestStreak: trueLongest });
    return { currentStreak, longestStreak: trueLongest, earnedMilestones, nextMilestone };
  } catch {
    return { currentStreak, longestStreak, earnedMilestones, nextMilestone };
  }
};
