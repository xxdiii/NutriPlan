// Compliance tracking service for meal plan adherence

/**
 * Helper to get user-specific storage key
 */
const getStorageKey = () => {
  try {
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (userProfile.id) {
      return `mealCompliance_${userProfile.id}`;
    }

    // Fallback: Check 'user' key from AuthContext
    const authUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (authUser.id) {
      return `mealCompliance_${authUser.id}`;
    }

    // Fallback for legacy or guest
    // NEW: Use a guest key that doesn't share history with the dev/legacy data
    return 'mealCompliance_guest';
  } catch (e) {
    return 'mealCompliance_guest';
  }
};

/**
 * Helper to get local date string YYYY-MM-DD
 */
const getLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get compliance data for a specific date
 */
export const getComplianceForDate = (date) => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');
  const dateKey = typeof date === 'string' ? date : getLocalDateString(date);
  return complianceData[dateKey] || {
    date: dateKey,
    meals: {
      breakfast: null,
      lunch: null,
      snack: null,
      dinner: null
    },
    notes: ''
  };
};

/**
 * Mark a meal as completed or skipped
 */
export const markMealCompliance = (date, mealType, status) => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');
  const dateKey = typeof date === 'string' ? date : getLocalDateString(date);

  if (!complianceData[dateKey]) {
    complianceData[dateKey] = {
      date: dateKey,
      meals: {
        breakfast: null,
        lunch: null,
        snack: null,
        dinner: null
      },
      notes: ''
    };
  }

  complianceData[dateKey].meals[mealType] = status; // 'eaten', 'skipped', or null
  complianceData[dateKey].lastUpdated = new Date().toISOString();

  localStorage.setItem(key, JSON.stringify(complianceData));

  // Dispatch event to notify other components (like Dashboard)
  window.dispatchEvent(new CustomEvent('meal-compliance-update', {
    detail: { date: dateKey, mealType, status }
  }));

  return complianceData[dateKey];
};

/**
 * Get compliance statistics for a date range
 */
export const getComplianceStats = (startDate, endDate) => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');
  const start = new Date(startDate);
  const end = new Date(endDate);

  let totalMeals = 0;
  let eatenMeals = 0;
  let skippedMeals = 0;
  const dailyCompliance = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = getLocalDateString(d);
    const dayData = complianceData[dateKey];

    if (dayData) {
      const meals = dayData.meals;
      let dayEaten = 0;
      let daySkipped = 0;
      let dayTotal = 0;

      Object.values(meals).forEach(status => {
        if (status !== null) {
          dayTotal++;
          totalMeals++;
          if (status === 'eaten') {
            dayEaten++;
            eatenMeals++;
          } else if (status === 'skipped') {
            daySkipped++;
            skippedMeals++;
          }
        }
      });

      if (dayTotal > 0) {
        dailyCompliance.push({
          date: dateKey,
          compliance: (dayEaten / dayTotal) * 100,
          eaten: dayEaten,
          skipped: daySkipped,
          total: dayTotal
        });
      }
    }
  }

  const overallCompliance = totalMeals > 0
    ? (eatenMeals / totalMeals) * 100
    : 0;

  return {
    overallCompliance: Math.round(overallCompliance),
    totalMeals,
    eatenMeals,
    skippedMeals,
    dailyCompliance,
    period: {
      start: startDate,
      end: endDate
    }
  };
};

/**
 * Calculate streak considering both meals and hydration
 * Returns a promise since hydration data is async
 */
export const calculateCombinedStreak = async (api) => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  // limit streak check to 365 days to avoid infinite loops or excessive API calls
  for (let i = 0; i < 365; i++) {
    const dateKey = getLocalDateString(currentDate);
    const dayData = complianceData[dateKey];

    let hasActivity = false;

    // 1. Check Meals (Local Storage)
    if (dayData && dayData.meals) {
      if (Object.values(dayData.meals).some(status => status === 'eaten')) {
        hasActivity = true;
      }
    }

    // 2. Check Hydration (API) if no meal activity found yet
    if (!hasActivity) {
      try {
        const hydData = await api.getHydration(dateKey); // This might be slow for long streaks?
        // Optimization: API should probably have a 'getStreak' or 'getHistory' endpoint
        // But for now, we'll check individual days (inefficient but works for small streaks)
        // OR: User only cares about recent consecutive days.
        if (hydData && hydData.amount > 0) {
          hasActivity = true;
        }
      } catch (e) {
        console.error('Error checking hydration for streak:', e);
      }
    }

    if (hasActivity) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // If it's today and no activity yet, don't break streak from yesterday
      if (i === 0) {
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
};

/**
 * Calculate current streak (consecutive days with at least one meal eaten)
 * Legacy synchronous version
 */
export const calculateStreak = () => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  while (true) {
    const dateKey = getLocalDateString(currentDate);
    const dayData = complianceData[dateKey];

    // Check if at least one meal was eaten today
    if (dayData && dayData.meals) {
      const hasEatenMeal = Object.values(dayData.meals).some(status => status === 'eaten');
      if (hasEatenMeal) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      // If no data for today and it's today, don't break streak
      if (currentDate.getTime() === today.getTime()) {
        break;
      }
      // If no data for past days, break streak
      break;
    }
  }

  return streak;
};

/**
 * Get weekly compliance summary
 */
export const getWeeklyCompliance = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return getComplianceStats(startOfWeek, endOfWeek);
};

/**
 * Get today's compliance status
 */
export const getTodayCompliance = () => {
  const today = getLocalDateString(new Date());
  return getComplianceForDate(today);
};

/**
 * Per-meal compliance % for the current week (Sun → today).
 * Returns { breakfast, lunch, snack, dinner } as 0-100 integers.
 */
export const getWeeklyMealBreakdown = () => {
  const key = getStorageKey();
  const allData = JSON.parse(localStorage.getItem(key) || '{}');

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const counts = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 };
  const days   = { breakfast: 0, lunch: 0, snack: 0, dinner: 0 };

  for (let i = 0; i <= today.getDay(); i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateKey = getLocalDateString(d);
    const dayData = allData[dateKey];
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(m => {
      days[m]++;
      if (dayData?.meals?.[m] === 'eaten') counts[m]++;
    });
  }

  return {
    breakfast: days.breakfast > 0 ? Math.round((counts.breakfast / days.breakfast) * 100) : 0,
    lunch:     days.lunch     > 0 ? Math.round((counts.lunch     / days.lunch)     * 100) : 0,
    snack:     days.snack     > 0 ? Math.round((counts.snack     / days.snack)     * 100) : 0,
    dinner:    days.dinner    > 0 ? Math.round((counts.dinner    / days.dinner)    * 100) : 0,
  };
};

/**
 * Get daily compliance data for the heatmap calendar.
 * Returns one entry per calendar day from (months) months ago to today.
 * @param {number} months - Number of months to look back (default 3)
 * @returns {Array<{date: string, eaten: number, total: number, meals: Object, isFuture: boolean}>}
 */
export const getHeatmapData = (months = 3) => {
  const key = getStorageKey();
  const complianceData = JSON.parse(localStorage.getItem(key) || '{}');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Monday of the week (months) ago
  const start = new Date(today);
  start.setMonth(start.getMonth() - months);
  // Align to Monday
  const startDay = start.getDay(); // 0=Sun
  const daysToMonday = startDay === 0 ? -6 : 1 - startDay;
  start.setDate(start.getDate() + daysToMonday);

  const result = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const dateKey = getLocalDateString(cursor);
    const dayData = complianceData[dateKey];
    let eaten = 0;
    let total = 0;
    const meals = { breakfast: null, lunch: null, snack: null, dinner: null };

    if (dayData?.meals) {
      Object.entries(dayData.meals).forEach(([meal, status]) => {
        meals[meal] = status;
        if (status !== null) {
          total++;
          if (status === 'eaten') eaten++;
        }
      });
    }

    result.push({
      date: dateKey,
      eaten,
      total,
      meals,
      isFuture: false,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};
