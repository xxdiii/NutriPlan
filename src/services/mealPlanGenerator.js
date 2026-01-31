import breakfastRecipes from '../data/recipes/breakfast.json';
import lunchRecipes from '../data/recipes/lunch.json';
import dinnerRecipes from '../data/recipes/dinner.json';
import snackRecipes from '../data/recipes/snacks.json';
import { checkAllergyViolations } from '../utils/constraints/allergyChecker';
import { getHealthConstraintFindings } from '../utils/constraints/healthConstraints';
import { getMedicationFoodWarnings } from '../utils/constraints/medicationInteractions';

// More lenient filter - strict on allergies, warn on clinical/medication signals
const filterRecipes = (recipes, userProfile) => {
  return recipes.filter(recipe => {
    // STRICT: Check allergies (safety-critical)
    const allergyBlocks = checkAllergyViolations(recipe, userProfile);
    if (allergyBlocks.length > 0) {
      console.log(`Filtered out ${recipe.name} due to allergy`, allergyBlocks.map(v => v.code));
      return false;
    }

    // LENIENT: Check dietary preference
    // If user is vegetarian, allow vegetarian and vegan
    // If user is vegan, only allow vegan
    const userDiet = userProfile.dietaryPreference;
    const recipeDiets = recipe.dietaryType;

    if (userDiet === 'vegan') {
      if (!recipeDiets.includes('vegan')) {
        console.log(`Filtered out ${recipe.name} - not vegan`);
        return false;
      }
    } else if (userDiet === 'vegetarian') {
      if (!recipeDiets.includes('vegetarian') && !recipeDiets.includes('vegan')) {
        console.log(`Filtered out ${recipe.name} - not vegetarian`);
        return false;
      }
    } else if (userDiet === 'eggetarian') {
      // Eggetarian can eat veg + eggs
      if (!recipeDiets.includes('vegetarian') && 
          !recipeDiets.includes('vegan') && 
          !recipeDiets.includes('eggetarian')) {
        console.log(`Filtered out ${recipe.name} - not eggetarian compatible`);
        return false;
      }
    } else if (userDiet === 'pescatarian') {
      // Pescatarian: veg + fish
      if (recipeDiets.includes('non_veg') && !recipeDiets.includes('pescatarian')) {
        console.log(`Filtered out ${recipe.name} - contains meat`);
        return false;
      }
    }
    // non_veg can eat everything (no filter needed)

    // Don't filter by cuisine, cooking skill, or budget - be maximally lenient

    // Attach explainability metadata (used later in UI if needed)
    // NOTE: safe to mutate here because recipes are imported JSON objects and not React state.
    const healthFindings = getHealthConstraintFindings(recipe, userProfile);
    const medFindings = getMedicationFoodWarnings(recipe, userProfile);
    recipe.__constraints = {
      blocked: [], // currently only allergies are hard blocks
      warnings: [...healthFindings, ...medFindings],
    };

    return true;
  });
};

// Calculate meal calories based on target and meal type
const getMealCalorieTarget = (totalCalories, mealType) => {
  const distribution = {
    breakfast: 0.25,  // 25%
    lunch: 0.35,      // 35%
    snack: 0.10,      // 10%
    dinner: 0.30      // 30%
  };

  return totalCalories * distribution[mealType];
};

// Find best matching recipe for calorie target
const findBestRecipe = (recipes, calorieTarget, usedRecipes = [], allowRepeat = false) => {
  if (!recipes || recipes.length === 0) {
    console.warn('No recipes available to select from');
    return null;
  }

  // First try to find unused recipes
  let available = recipes.filter(r => !usedRecipes.includes(r.id));
  
  // If no unused recipes and repeat is allowed, use all recipes
  if (available.length === 0) {
    if (allowRepeat) {
      console.log('Allowing recipe repetition');
      available = recipes;
    } else {
      console.warn('No unused recipes available and repeat not allowed');
      return null;
    }
  }

  // Sort by how close they are to target calories
  // Add some randomness for variety
  const sorted = available.sort((a, b) => {
    const diffA = Math.abs(a.calories - calorieTarget);
    const diffB = Math.abs(b.calories - calorieTarget);
    
    // If both are within 30% of target, add randomness
    const targetRange = calorieTarget * 0.3;
    if (diffA < targetRange && diffB < targetRange) {
      return Math.random() - 0.5;
    }
    
    return diffA - diffB;
  });

  console.log(`Selected ${sorted[0].name} (${sorted[0].calories} cal) for target ${calorieTarget} cal`);
  return sorted[0];
};

// Generate a single day's meal plan
const generateDayPlan = (userProfile, usedBreakfast = [], usedLunch = [], usedDinner = [], usedSnacks = [], dayNumber = 0) => {
  const targetCalories = userProfile.nutritionTargets.targetCalories;
  const servings = userProfile.servings || 1;

  console.log(`\n=== Generating Day ${dayNumber + 1} ===`);
  console.log('User profile:', {
    diet: userProfile.dietaryPreference,
    allergies: userProfile.allergies,
    targetCal: targetCalories
  });

  // Filter all recipes
  const filteredBreakfast = filterRecipes(breakfastRecipes, userProfile);
  const filteredLunch = filterRecipes(lunchRecipes, userProfile);
  const filteredDinner = filterRecipes(dinnerRecipes, userProfile);
  const filteredSnacks = filterRecipes(snackRecipes, userProfile);

  console.log('Filtered recipes count:', {
    breakfast: filteredBreakfast.length,
    lunch: filteredLunch.length,
    dinner: filteredDinner.length,
    snacks: filteredSnacks.length
  });

  if (filteredBreakfast.length === 0) console.error('❌ No breakfast recipes available!');
  if (filteredLunch.length === 0) console.error('❌ No lunch recipes available!');
  if (filteredDinner.length === 0) console.error('❌ No dinner recipes available!');
  if (filteredSnacks.length === 0) console.error('❌ No snack recipes available!');

  // Calculate calorie targets per meal
  const breakfastTarget = getMealCalorieTarget(targetCalories, 'breakfast');
  const lunchTarget = getMealCalorieTarget(targetCalories, 'lunch');
  const dinnerTarget = getMealCalorieTarget(targetCalories, 'dinner');
  const snackTarget = getMealCalorieTarget(targetCalories, 'snack');

  console.log('Calorie targets:', {
    breakfast: breakfastTarget,
    lunch: lunchTarget,
    dinner: dinnerTarget,
    snack: snackTarget
  });

  // Allow repetition after 3 days (more lenient)
  const allowRepeat = dayNumber >= 3;

  // Select recipes
  const breakfast = findBestRecipe(filteredBreakfast, breakfastTarget, usedBreakfast, allowRepeat);
  const lunch = findBestRecipe(filteredLunch, lunchTarget, usedLunch, allowRepeat);
  const dinner = findBestRecipe(filteredDinner, dinnerTarget, usedDinner, allowRepeat);
  const snack = findBestRecipe(filteredSnacks, snackTarget, usedSnacks, allowRepeat);

  // Calculate scaled nutrition for servings
  const scaleRecipe = (recipe) => {
    if (!recipe) return null;
    const scale = servings / recipe.servings;
    return {
      ...recipe,
      calories: Math.round(recipe.calories * scale),
      protein: Math.round(recipe.protein * scale),
      carbs: Math.round(recipe.carbs * scale),
      fat: Math.round(recipe.fat * scale),
      scaledServings: servings
    };
  };

  const scaledBreakfast = scaleRecipe(breakfast);
  const scaledLunch = scaleRecipe(lunch);
  const scaledSnack = scaleRecipe(snack);
  const scaledDinner = scaleRecipe(dinner);

  const dayPlan = {
    breakfast: scaledBreakfast,
    lunch: scaledLunch,
    snack: scaledSnack,
    dinner: scaledDinner,
    totalCalories: 
      (scaledBreakfast?.calories || 0) + 
      (scaledLunch?.calories || 0) + 
      (scaledSnack?.calories || 0) + 
      (scaledDinner?.calories || 0),
    totalProtein: 
      (scaledBreakfast?.protein || 0) + 
      (scaledLunch?.protein || 0) + 
      (scaledSnack?.protein || 0) + 
      (scaledDinner?.protein || 0),
    totalCarbs: 
      (scaledBreakfast?.carbs || 0) + 
      (scaledLunch?.carbs || 0) + 
      (scaledSnack?.carbs || 0) + 
      (scaledDinner?.carbs || 0),
    totalFat: 
      (scaledBreakfast?.fat || 0) + 
      (scaledLunch?.fat || 0) + 
      (scaledSnack?.fat || 0) + 
      (scaledDinner?.fat || 0)
  };

  console.log('Day plan generated:', {
    breakfast: scaledBreakfast?.name || 'MISSING',
    lunch: scaledLunch?.name || 'MISSING',
    snack: scaledSnack?.name || 'MISSING',
    dinner: scaledDinner?.name || 'MISSING',
    totalCal: dayPlan.totalCalories
  });

  return dayPlan;
};

// Generate full week meal plan
export const generateWeeklyMealPlan = (userProfile) => {
  console.log('\n🍽️ === STARTING MEAL PLAN GENERATION ===');
  console.log('Total recipes loaded:', {
    breakfast: breakfastRecipes.length,
    lunch: lunchRecipes.length,
    dinner: dinnerRecipes.length,
    snacks: snackRecipes.length
  });

  const weekPlan = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Separate tracking for each meal type
  const usedBreakfast = [];
  const usedLunch = [];
  const usedDinner = [];
  const usedSnacks = [];

  for (let i = 0; i < 7; i++) {
    const dayPlan = generateDayPlan(
      userProfile, 
      usedBreakfast, 
      usedLunch, 
      usedDinner, 
      usedSnacks,
      i
    );
    
    // Track used recipes
    if (dayPlan.breakfast) usedBreakfast.push(dayPlan.breakfast.id);
    if (dayPlan.lunch) usedLunch.push(dayPlan.lunch.id);
    if (dayPlan.dinner) usedDinner.push(dayPlan.dinner.id);
    if (dayPlan.snack) usedSnacks.push(dayPlan.snack.id);

    const today = new Date();
    const planDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);

    weekPlan.push({
      day: days[i],
      date: planDate.toISOString().split('T')[0],
      ...dayPlan
    });
  }

  console.log('\n✅ === MEAL PLAN GENERATION COMPLETE ===');
  console.log('Week plan summary:', weekPlan.map((d, i) => ({
    day: d.day,
    meals: `B:${d.breakfast ? '✓' : '✗'} L:${d.lunch ? '✓' : '✗'} S:${d.snack ? '✓' : '✗'} D:${d.dinner ? '✓' : '✗'}`
  })));

  return weekPlan;
};

// Generate meal plan and save to localStorage
export const createAndSaveMealPlan = (userProfile) => {
  console.log('\n📋 Creating meal plan for user profile:', {
    diet: userProfile.dietaryPreference,
    allergies: userProfile.allergies,
    goal: userProfile.goal,
    targetCal: userProfile.nutritionTargets.targetCalories
  });
  
  const mealPlan = generateWeeklyMealPlan(userProfile);
  
  const planData = {
    plan: mealPlan,
    createdAt: new Date().toISOString(),
    userProfile: {
      targetCalories: userProfile.nutritionTargets.targetCalories,
      macros: userProfile.nutritionTargets.macros
    }
  };
  
  localStorage.setItem('weeklyMealPlan', JSON.stringify(planData));
  
  console.log('✅ Meal plan saved to localStorage');
  return mealPlan;
};