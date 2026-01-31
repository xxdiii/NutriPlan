// Calculate progress percentage toward goal
export const calculateProgress = (currentWeight, startWeight, targetWeight) => {
  if (!targetWeight || !startWeight || !currentWeight) return 0;
  
  const totalChange = Math.abs(targetWeight - startWeight);
  const currentChange = Math.abs(currentWeight - startWeight);
  
  if (totalChange === 0) return 100;
  
  return Math.min(Math.round((currentChange / totalChange) * 100), 100);
};

// Calculate estimated days to goal
export const calculateDaysToGoal = (currentWeight, targetWeight, targetRate) => {
  if (!targetWeight || !currentWeight || !targetRate) return null;
  
  const weightDiff = Math.abs(targetWeight - currentWeight);
  const weeksNeeded = weightDiff / targetRate;
  const daysNeeded = Math.ceil(weeksNeeded * 7);
  
  return daysNeeded;
};

// Calculate average weight change per week
export const calculateWeeklyAverage = (weightLogs) => {
  if (!weightLogs || weightLogs.length < 2) return 0;
  
  // Sort by date
  const sorted = [...weightLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const firstLog = sorted[0];
  const lastLog = sorted[sorted.length - 1];
  
  const weightChange = lastLog.weight - firstLog.weight;
  const daysDiff = (new Date(lastLog.date) - new Date(firstLog.date)) / (1000 * 60 * 60 * 24);
  const weeksDiff = daysDiff / 7;
  
  if (weeksDiff === 0) return 0;
  
  return (weightChange / weeksDiff).toFixed(2);
};

// Get weight trend (gaining, losing, maintaining)
export const getWeightTrend = (weightLogs) => {
  if (!weightLogs || weightLogs.length < 2) return 'insufficient_data';
  
  const weeklyAvg = parseFloat(calculateWeeklyAverage(weightLogs));
  
  if (Math.abs(weeklyAvg) < 0.1) return 'maintaining';
  if (weeklyAvg > 0) return 'gaining';
  return 'losing';
};

// Predict goal date based on current rate
export const predictGoalDate = (currentWeight, targetWeight, weightLogs) => {
  if (!weightLogs || weightLogs.length < 2) return null;
  
  const weeklyAvg = parseFloat(calculateWeeklyAverage(weightLogs));
  
  if (weeklyAvg === 0) return null;
  
  const weightDiff = targetWeight - currentWeight;
  const weeksNeeded = weightDiff / weeklyAvg;
  
  if (weeksNeeded < 0) return null; // Moving in wrong direction
  
  const daysNeeded = Math.ceil(weeksNeeded * 7);
  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + daysNeeded);
  
  return goalDate;
};

// Format date for display
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', options);
};