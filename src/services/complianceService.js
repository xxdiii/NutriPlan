// Compliance tracking service for meal plan adherence

/**
 * Get compliance data for a specific date
 */
export const getComplianceForDate = (date) => {
  const complianceData = JSON.parse(localStorage.getItem('mealCompliance') || '{}');
  const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
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
  const complianceData = JSON.parse(localStorage.getItem('mealCompliance') || '{}');
  const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
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
  
  localStorage.setItem('mealCompliance', JSON.stringify(complianceData));
  return complianceData[dateKey];
};

/**
 * Get compliance statistics for a date range
 */
export const getComplianceStats = (startDate, endDate) => {
  const complianceData = JSON.parse(localStorage.getItem('mealCompliance') || '{}');
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let totalMeals = 0;
  let eatenMeals = 0;
  let skippedMeals = 0;
  const dailyCompliance = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
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
 * Calculate current streak (consecutive days with at least one meal eaten)
 */
export const calculateStreak = () => {
  const complianceData = JSON.parse(localStorage.getItem('mealCompliance') || '{}');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let streak = 0;
  let currentDate = new Date(today);
  
  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];
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
  const today = new Date().toISOString().split('T')[0];
  return getComplianceForDate(today);
};
