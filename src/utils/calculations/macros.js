// Calculate macronutrient distribution
export const calculateMacros = (calories, goal, dietaryPreference) => {
  let proteinPercent, fatPercent, carbPercent;

  // Adjust macros based on goal
  if (goal === 'bulk') {
    proteinPercent = 0.30; // 30% protein
    fatPercent = 0.25;     // 25% fat
    carbPercent = 0.45;    // 45% carbs
  } else if (goal === 'cut') {
    proteinPercent = 0.35; // 35% protein (higher to preserve muscle)
    fatPercent = 0.25;     // 25% fat
    carbPercent = 0.40;    // 40% carbs
  } else {
    proteinPercent = 0.30; // 30% protein
    fatPercent = 0.30;     // 30% fat
    carbPercent = 0.40;    // 40% carbs
  }

  // Adjust for vegan (might need slightly higher protein percentage)
  if (dietaryPreference === 'vegan') {
    proteinPercent += 0.05;
    carbPercent -= 0.05;
  }

  const protein = Math.round((calories * proteinPercent) / 4); // 4 cal per gram
  const fat = Math.round((calories * fatPercent) / 9);         // 9 cal per gram
  const carbs = Math.round((calories * carbPercent) / 4);      // 4 cal per gram

  return { protein, fat, carbs };
};