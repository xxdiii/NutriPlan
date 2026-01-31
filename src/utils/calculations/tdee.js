import { calculateBMR } from './bmr';

// Total Daily Energy Expenditure
export const calculateTDEE = (weight, height, age, gender, activityLevel) => {
  const bmr = calculateBMR(weight, height, age, gender);
  return Math.round(bmr * activityLevel);
};

// Calculate target calories based on goal
export const calculateTargetCalories = (tdee, goal, customDeficit = 0) => {
  if (goal === 'maintain') return tdee;
  if (goal === 'cut') return tdee - 500; // Default 500 cal deficit
  if (goal === 'bulk') return tdee + 300; // Default 300 cal surplus
  return tdee + customDeficit;
};