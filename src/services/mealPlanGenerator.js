import { api } from './api';
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
      // console.log(`Filtered out ${recipe.name} due to allergy`, allergyBlocks.map(v => v.code));
      return false;
    }

    // LENIENT: Check dietary preference
    const userDiet = userProfile.dietaryPreference;
    const recipeDiets = recipe.dietaryType;

    if (userDiet === 'vegan') {
      if (!recipeDiets.includes('vegan')) return false;
    } else if (userDiet === 'vegetarian') {
      if (!recipeDiets.includes('vegetarian') && !recipeDiets.includes('vegan')) return false;
    } else if (userDiet === 'eggetarian') {
      if (!recipeDiets.includes('vegetarian') &&
        !recipeDiets.includes('vegan') &&
        !recipeDiets.includes('eggetarian')) return false;
    } else if (userDiet === 'pescatarian') {
      if (recipeDiets.includes('non_veg') && !recipeDiets.includes('pescatarian')) return false;
    }
    // non_veg can eat everything

    // Attach explainability metadata
    // NOTE: safe to mutate here because we consider these transient findings for this session
    const healthFindings = getHealthConstraintFindings(recipe, userProfile);
    const medFindings = getMedicationFoodWarnings(recipe, userProfile);
    recipe.__constraints = {
      blocked: [],
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

// Find best matching recipe for calorie target and protein density
const findBestRecipe = (recipes, calorieTarget, usedRecipes = [], allowRepeat = false, targetProteinRatio = 0) => {
  if (!recipes || recipes.length === 0) {
    console.warn('No recipes available to select from');
    return null;
  }

  // First try to find unused recipes
  let available = recipes.filter(r => !usedRecipes.includes(r.id));

  // If no unused recipes, check fallback strategy
  if (available.length === 0) {
    if (allowRepeat) {
      // console.log('Allowing recipe repetition');
      available = recipes;
    } else {
      // FORCE REPEAT: Better to repeat a meal than have no meal at all
      console.warn('No unused recipes available and repeat not allowed - FORCING REPEAT to avoid missing meal');
      available = recipes;
    }
  }

  // Sort by combination of protein density match and calorie proximity
  const sorted = available.sort((a, b) => {
    // Calorie score (lower is better)
    const calDiffA = Math.abs(a.calories - calorieTarget);
    const calDiffB = Math.abs(b.calories - calorieTarget);
    const calScoreA = calDiffA / calorieTarget;
    const calScoreB = calDiffB / calorieTarget;

    // Protein Density score (lower is better)
    let densityScoreA = 0;
    let densityScoreB = 0;

    if (targetProteinRatio > 0) {
      const densityA = (a.protein * 4) / a.calories;
      const densityB = (b.protein * 4) / b.calories;

      const diffA = targetProteinRatio - densityA;
      const diffB = targetProteinRatio - densityB;

      densityScoreA = diffA > 0 ? diffA * 5 : 0;
      densityScoreB = diffB > 0 ? diffB * 5 : 0;
    }

    // Combined score: Protein mismatch is weighted heavily
    const healthPenaltyA = (a.__constraints?.warnings?.length || 0) * 50;
    const healthPenaltyB = (b.__constraints?.warnings?.length || 0) * 50;

    const totalScoreA = calScoreA + densityScoreA + healthPenaltyA;
    const totalScoreB = calScoreB + densityScoreB + healthPenaltyB;

    return totalScoreA - totalScoreB;
  });

  const best = sorted[0];
  // console.log(`Selected ${best.name}`);
  return best;
};

// Generate a single day's meal plan
const generateDayPlan = (userProfile, preFilteredRecipes, usedRecipesState, dayNumber = 0) => {
  const targetCalories = userProfile.nutritionTargets.targetCalories;
  const targetProtein = userProfile.nutritionTargets.macros.protein;
  const servings = userProfile.servings || 1;

  // Calculate target protein ratio (Protein Calories / Total Calories)
  const targetProteinRatio = (targetProtein * 4) / targetCalories;

  // Calculate calorie targets per meal
  const breakfastTarget = getMealCalorieTarget(targetCalories, 'breakfast');
  const lunchTarget = getMealCalorieTarget(targetCalories, 'lunch');
  const dinnerTarget = getMealCalorieTarget(targetCalories, 'dinner');
  const snackTarget = getMealCalorieTarget(targetCalories, 'snack');

  // Allow repetition after 3 days, or if we are forced to by low inventory
  // (though findBestRecipe now implicitly forces repeat if needed)
  const allowRepeat = dayNumber >= 3;

  // Select recipes using passed-in filtered lists
  const breakfast = findBestRecipe(preFilteredRecipes.breakfast, breakfastTarget, usedRecipesState.breakfast, allowRepeat, targetProteinRatio);
  const lunch = findBestRecipe(preFilteredRecipes.lunch, lunchTarget, usedRecipesState.lunch, allowRepeat, targetProteinRatio);
  const dinner = findBestRecipe(preFilteredRecipes.dinner, dinnerTarget, usedRecipesState.dinner, allowRepeat, targetProteinRatio);
  const snack = findBestRecipe(preFilteredRecipes.snack, snackTarget, usedRecipesState.snack, allowRepeat, targetProteinRatio);

  const calculatePortion = (recipe, targetCal) => {
    if (!recipe) return 1;
    const baseCal = recipe.calories;
    if (!baseCal) return 1;
    const ratio = targetCal / baseCal;
    let multiplier = Math.round(ratio * 2) / 2;
    return Math.max(0.5, Math.min(multiplier, 3.0));
  };

  const scaleRecipe = (recipe, targetCal) => {
    if (!recipe) return null;
    const portionMultiplier = calculatePortion(recipe, targetCal);
    const finalScale = servings * portionMultiplier;

    return {
      ...recipe,
      calories: Math.round(recipe.calories * finalScale),
      protein: Math.round(recipe.protein * finalScale),
      carbs: Math.round(recipe.carbs * finalScale),
      fat: Math.round(recipe.fat * finalScale),
      scaledServings: finalScale,
      originalServings: recipe.servings
    };
  };

  const scaledBreakfast = scaleRecipe(breakfast, breakfastTarget);
  const scaledLunch = scaleRecipe(lunch, lunchTarget);
  const scaledSnack = scaleRecipe(snack, snackTarget);
  const scaledDinner = scaleRecipe(dinner, dinnerTarget);

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

  return dayPlan;
};

// Generate full week meal plan
export const generateWeeklyMealPlan = (userProfile) => {
  console.log('\n🍽️ === STARTING MEAL PLAN GENERATION ===');

  // 1. Filter ALL recipes ONCE at the start (Performance Optimization)
  console.time('RecipeFiltering');
  const filteredBreakfast = filterRecipes(breakfastRecipes, userProfile);
  const filteredLunch = filterRecipes(lunchRecipes, userProfile);
  const filteredDinner = filterRecipes(dinnerRecipes, userProfile);
  const filteredSnack = filterRecipes(snackRecipes, userProfile);
  console.timeEnd('RecipeFiltering');

  console.log('Filtered recipes available:', {
    breakfast: filteredBreakfast.length,
    lunch: filteredLunch.length,
    dinner: filteredDinner.length,
    snacks: filteredSnack.length
  });

  if (filteredBreakfast.length === 0) console.warn('⚠️ CRITICAL: No breakfast recipes found for this profile!');
  if (filteredLunch.length === 0) console.warn('⚠️ CRITICAL: No lunch recipes found for this profile!');

  const preFilteredRecipes = {
    breakfast: filteredBreakfast,
    lunch: filteredLunch,
    dinner: filteredDinner,
    snack: filteredSnack
  };

  const weekPlan = [];

  // State to track used recipe IDs to encourage variety
  const usedRecipesState = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };

  for (let i = 0; i < 7; i++) {
    const dayPlan = generateDayPlan(
      userProfile,
      preFilteredRecipes,
      usedRecipesState,
      i
    );

    // Track used recipes
    if (dayPlan.breakfast) usedRecipesState.breakfast.push(dayPlan.breakfast.id);
    if (dayPlan.lunch) usedRecipesState.lunch.push(dayPlan.lunch.id);
    if (dayPlan.dinner) usedRecipesState.dinner.push(dayPlan.dinner.id);
    if (dayPlan.snack) usedRecipesState.snack.push(dayPlan.snack.id);

    const today = new Date();
    const planDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = planDate.toLocaleDateString('en-US', { weekday: 'long' });

    weekPlan.push({
      day: dayName,
      date: planDate.toISOString().split('T')[0],
      ...dayPlan
    });
  }

  console.log('\n✅ === MEAL PLAN GENERATION COMPLETE ===');
  return weekPlan;
};

// Generate meal plan and save to Backend
export const createAndSaveMealPlan = async (userProfile) => {
  console.log('📋 Creating meal plan for user goal:', userProfile.goal);

  try {
    const mealPlan = generateWeeklyMealPlan(userProfile);

    const planData = {
      plan: mealPlan,
      createdAt: new Date().toISOString(),
      userProfile: {
        targetCalories: userProfile.nutritionTargets.targetCalories,
        macros: userProfile.nutritionTargets.macros
      }
    };

    await api.saveMealPlan(planData);
    console.log('✅ Meal plan saved to Backend');
    return mealPlan;
  } catch (err) {
    console.error('❌ Failed to create/save meal plan:', err);
    throw err; // Propagate error so UI can show a notification
  }
};