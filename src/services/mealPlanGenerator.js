import { api } from './api';
import breakfastRecipes from '../data/recipes/breakfast.json';
import lunchRecipes from '../data/recipes/lunch.json';
import dinnerRecipes from '../data/recipes/dinner.json';
import snackRecipes from '../data/recipes/snacks.json';
import { checkAllergyViolations } from '../utils/constraints/allergyChecker';
import { getHealthConstraintFindings } from '../utils/constraints/healthConstraints';
import { getMedicationFoodWarnings } from '../utils/constraints/medicationInteractions';
import {
  createCuisineState,
  resetDayCuisines,
  recordCuisineUsed,
  getCuisinePenalty,
} from '../utils/cuisineRotation';
import { getCustomRecipesByMealType } from './customRecipeService';

/**
 * Filters a list of recipes based on user profile preferences, allergies, and health constraints.
 * It enforces strict allergy checks, dietary preferences (vegan, vegetarian, etc.), and excludes
 * recipes explicitly disliked by the user. It also attaches health and medication warnings.
 *
 * @param {Array} recipes - The list of recipes to filter.
 * @param {Object} userProfile - The user's profile containing dietary preferences, allergies, etc.
 * @returns {Array} A new array of recipes that pass the filtering criteria.
 */
// More lenient filter - strict on allergies, warn on clinical/medication signals
const filterRecipes = (recipes, userProfile) => {
  // Build disliked recipe ID set for fast lookup
  const dislikedIds = new Set(
    (userProfile.dislikedRecipes || []).map(id => String(id))
  );

  return recipes.filter(recipe => {
    // ADAPTIVE: Skip disliked recipes (user feedback loop)
    if (dislikedIds.has(String(recipe.id))) return false;

    // STRICT: Check allergies (safety-critical)
    const allergyBlocks = checkAllergyViolations(recipe, userProfile);
    if (allergyBlocks.length > 0) {
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
    const healthFindings = getHealthConstraintFindings(recipe, userProfile);
    const medFindings = getMedicationFoodWarnings(recipe, userProfile);
    recipe.__constraints = {
      blocked: [],
      warnings: [...healthFindings, ...medFindings],
    };

    return true;
  });
};

/**
 * Calculates the target calorie amount for a specific meal based on a predefined daily distribution.
 * Breakfast: 25%, Lunch: 35%, Snack: 10%, Dinner: 30%.
 *
 * @param {number} totalCalories - The total daily calorie target.
 * @param {string} mealType - The type of meal (e.g., 'breakfast', 'lunch', 'snack', 'dinner').
 * @returns {number} The calculated calorie target for the specified meal.
 */
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

/**
 * Selects the best recipe for a meal slot based on a scoring algorithm prioritizing protein targets,
 * calorie proximity, minimizing health warnings, and cuisine rotation fairness.
 * It also attempts to avoid repeating recently used recipes.
 *
 * @param {Array} recipes - The available pool of filtered recipes for the meal type.
 * @param {number} calorieTarget - The optimal calorie amount for this meal.
 * @param {number} [proteinTarget=0] - The optimal protein amount (in grams) for this meal.
 * @param {Array} [usedRecipes=[]] - List of recipe IDs that have already been scheduled to encourage variety.
 * @param {boolean} [allowRepeat=false] - Whether to allow reusing recipes if the pool is exhausted.
 * @param {Object|null} [cuisineState=null] - Cuisine rotation state from cuisineRotation.js for fairness scoring.
 * @returns {Object|null} The best matching recipe object, or null if no recipes are available.
 */
// Protein-first recipe scoring with cuisine rotation fairness
// calorieTarget  – kcal this meal slot should supply
// proteinTarget  – grams of protein this meal slot should supply
const findBestRecipe = (recipes, calorieTarget, proteinTarget = 0, usedRecipes = [], allowRepeat = false, cuisineState = null) => {
  if (!recipes || recipes.length === 0) {
    console.warn('No recipes available to select from');
    return null;
  }

  let available = recipes.filter(r => !usedRecipes.includes(r.id));
  if (available.length === 0) {
    available = recipes; // force repeat rather than empty slot
  }

  const sorted = [...available].sort((a, b) => {
    // ── Calorie proximity (normalised 0–1) ──────────────────────────
    const calScoreA = Math.abs(a.calories - calorieTarget) / (calorieTarget || 1);
    const calScoreB = Math.abs(b.calories - calorieTarget) / (calorieTarget || 1);

    // ── Protein proximity (normalised 0–1) ──────────────────────────
    // Penalise recipes below the protein target much more than those above.
    // Being 50% below target is worse than being 50% above.
    let protScoreA = 0;
    let protScoreB = 0;
    if (proteinTarget > 0) {
      const diffA = proteinTarget - a.protein;  // positive = shortfall
      const diffB = proteinTarget - b.protein;
      protScoreA = diffA > 0
        ? (diffA / proteinTarget) * 2  // shortfall  — 2× penalty
        : Math.abs(diffA) / proteinTarget * 0.3;  // surplus  — slight penalty
      protScoreB = diffB > 0
        ? (diffB / proteinTarget) * 2
        : Math.abs(diffB) / proteinTarget * 0.3;
    }

    // ── Health warning penalty ──────────────────────────────────────
    const healthA = (a.__constraints?.warnings?.length || 0) * 0.5;
    const healthB = (b.__constraints?.warnings?.length || 0) * 0.5;

    // ── Cuisine rotation fairness penalty (normalised 0–1) ──────────
    // Discourages choosing a cuisine that was used very recently or
    // already appears in another slot today. Weight = 1.5× so it is
    // noticeable but never overrides a severe protein shortfall.
    const cuisineA = cuisineState ? getCuisinePenalty(cuisineState, a.cuisine) * 1.5 : 0;
    const cuisineB = cuisineState ? getCuisinePenalty(cuisineState, b.cuisine) * 1.5 : 0;

    // Protein weight = 3×  (it is the hardest macro to hit)
    const totalA = (protScoreA * 3) + calScoreA + healthA + cuisineA;
    const totalB = (protScoreB * 3) + calScoreB + healthB + cuisineB;

    return totalA - totalB;
  });

  return sorted[0];
};

/**
 * Generates a full meal plan for a single day, including breakfast, lunch, snack, and dinner.
 * It scales recipe portions to best meet both calorie and protein targets, applying a final
 * protein boost if the day's total protein falls short. Cuisine rotation fairness is enforced
 * across all four meal slots within the day and across the full week.
 *
 * @param {Object} userProfile - The user's profile containing nutritional targets and servings.
 * @param {Object} preFilteredRecipes - Categorized lists of recipes (breakfast, lunch, etc.) already filtered for the user.
 * @param {Object} usedRecipesState - State object tracking which recipe IDs have been used so far.
 * @param {number} [dayNumber=0] - The zero-indexed day number of the plan (used to toggle repeat allowance).
 * @param {Object|null} [cuisineState=null] - Shared cuisine rotation state across the week.
 * @returns {Object} An object containing the selected scaled meals and the day's total macro/calorie counts.
 */
// Generate a single day's meal plan
const generateDayPlan = (userProfile, preFilteredRecipes, usedRecipesState, dayNumber = 0, cuisineState = null) => {
  const targetCalories = userProfile.nutritionTargets.targetCalories;
  const targetProtein  = userProfile.nutritionTargets.macros.protein;   // grams
  const servings       = userProfile.servings || 1;

  // ── Per-meal targets (same distribution as calories) ──────────────
  const dist = { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

  const calTarget  = type => targetCalories * dist[type];
  const protTarget = type => targetProtein  * dist[type];

  const allowRepeat = dayNumber >= 3;

  // ── Reset within-day cuisine tracking for a fresh day ─────────────
  if (cuisineState) resetDayCuisines(cuisineState);

  // ── Select best recipe for each slot (cuisine-aware) ──────────────
  // Each slot is selected sequentially so that the cuisine chosen for
  // breakfast can immediately influence the penalty for lunch, etc.
  const breakfast = findBestRecipe(preFilteredRecipes.breakfast, calTarget('breakfast'), protTarget('breakfast'), usedRecipesState.breakfast, allowRepeat, cuisineState);
  if (cuisineState && breakfast) recordCuisineUsed(cuisineState, breakfast.cuisine);

  const lunch     = findBestRecipe(preFilteredRecipes.lunch,     calTarget('lunch'),     protTarget('lunch'),     usedRecipesState.lunch,     allowRepeat, cuisineState);
  if (cuisineState && lunch) recordCuisineUsed(cuisineState, lunch.cuisine);

  const dinner    = findBestRecipe(preFilteredRecipes.dinner,    calTarget('dinner'),    protTarget('dinner'),    usedRecipesState.dinner,    allowRepeat, cuisineState);
  if (cuisineState && dinner) recordCuisineUsed(cuisineState, dinner.cuisine);

  const snack     = findBestRecipe(preFilteredRecipes.snack,     calTarget('snack'),     protTarget('snack'),     usedRecipesState.snack,     allowRepeat, cuisineState);
  if (cuisineState && snack) recordCuisineUsed(cuisineState, snack.cuisine);

  // ── Protein-aware portion scaling ─────────────────────────────────
  // Scale to whichever is higher: calorie need or protein need.
  // This ensures both targets are reached (protein wins when the recipe
  // is protein-sparse; calories win when the recipe is calorie-dense).
  const calculatePortion = (recipe, cTarget, pTarget) => {
    if (!recipe || !recipe.calories) return 1;

    const calScale  = cTarget / recipe.calories;
    const protScale = recipe.protein > 0 ? pTarget / recipe.protein : calScale;

    // Use the higher scale so both cal & protein targets are met.
    // But cap generously so the serving stays realistic.
    const raw = Math.max(calScale, protScale);
    const rounded = Math.round(raw * 2) / 2;   // nearest 0.5
    return Math.max(0.5, Math.min(rounded, 3.5));
  };

  const scaleRecipe = (recipe, cTarget, pTarget) => {
    if (!recipe) return null;
    const portionMultiplier = calculatePortion(recipe, cTarget, pTarget);
    const finalScale = servings * portionMultiplier;
    return {
      ...recipe,
      calories: Math.round(recipe.calories * finalScale),
      protein:  Math.round(recipe.protein  * finalScale),
      carbs:    Math.round(recipe.carbs    * finalScale),
      fat:      Math.round(recipe.fat      * finalScale),
      scaledServings:   finalScale,
      originalServings: recipe.servings,
    };
  };

  let scaledBreakfast = scaleRecipe(breakfast, calTarget('breakfast'), protTarget('breakfast'));
  let scaledLunch     = scaleRecipe(lunch,     calTarget('lunch'),     protTarget('lunch'));
  let scaledSnack     = scaleRecipe(snack,     calTarget('snack'),     protTarget('snack'));
  let scaledDinner    = scaleRecipe(dinner,    calTarget('dinner'),    protTarget('dinner'));

  // ── Post-day protein validation ────────────────────────────────────
  // If total protein is still < 90% of target after scaling,
  // boost the most protein-dense meal by up to 1.5× (capped at 3.5 total scale).
  const totalProt = () =>
    (scaledBreakfast?.protein || 0) +
    (scaledLunch?.protein     || 0) +
    (scaledSnack?.protein     || 0) +
    (scaledDinner?.protein    || 0);

  if (totalProt() < targetProtein * 0.9) {
    // Find the meal slot with the highest protein density (protein/calorie)
    const slots = [
      { key: 'lunch',     scaled: scaledLunch,     raw: lunch,     cTarget: calTarget('lunch')  },
      { key: 'dinner',    scaled: scaledDinner,    raw: dinner,    cTarget: calTarget('dinner') },
      { key: 'breakfast', scaled: scaledBreakfast, raw: breakfast, cTarget: calTarget('breakfast') },
      { key: 'snack',     scaled: scaledSnack,     raw: snack,     cTarget: calTarget('snack')  },
    ].filter(s => s.scaled && s.raw);

    slots.sort((a, b) => {
      const densA = (a.raw.protein * 4) / (a.raw.calories || 1);
      const densB = (b.raw.protein * 4) / (b.raw.calories || 1);
      return densB - densA; // highest protein density first
    });

    if (slots.length > 0) {
      const shortfall = targetProtein - totalProt();
      const best = slots[0];
      const addScale = Math.min(
        shortfall / (best.raw.protein || 1),
        1.5 // cap additional boost
      );
      const boostedScale = Math.min(
        (best.scaled.scaledServings || 1) + addScale,
        3.5 * servings
      );
      const boosted = {
        ...best.raw,
        calories: Math.round(best.raw.calories * boostedScale),
        protein:  Math.round(best.raw.protein  * boostedScale),
        carbs:    Math.round(best.raw.carbs    * boostedScale),
        fat:      Math.round(best.raw.fat      * boostedScale),
        scaledServings:   boostedScale,
        originalServings: best.raw.servings,
      };
      if (best.key === 'lunch')     scaledLunch     = boosted;
      if (best.key === 'dinner')    scaledDinner    = boosted;
      if (best.key === 'breakfast') scaledBreakfast = boosted;
      if (best.key === 'snack')     scaledSnack     = boosted;
    }
  }

  return {
    breakfast:    scaledBreakfast,
    lunch:        scaledLunch,
    snack:        scaledSnack,
    dinner:       scaledDinner,
    totalCalories:
      (scaledBreakfast?.calories || 0) +
      (scaledLunch?.calories     || 0) +
      (scaledSnack?.calories     || 0) +
      (scaledDinner?.calories    || 0),
    totalProtein:
      (scaledBreakfast?.protein || 0) +
      (scaledLunch?.protein     || 0) +
      (scaledSnack?.protein     || 0) +
      (scaledDinner?.protein    || 0),
    totalCarbs:
      (scaledBreakfast?.carbs || 0) +
      (scaledLunch?.carbs     || 0) +
      (scaledSnack?.carbs     || 0) +
      (scaledDinner?.carbs    || 0),
    totalFat:
      (scaledBreakfast?.fat || 0) +
      (scaledLunch?.fat     || 0) +
      (scaledSnack?.fat     || 0) +
      (scaledDinner?.fat    || 0),
  };
};

/**
 * Generates a complete 7-day weekly meal plan by repeatedly calling generateDayPlan.
 * It optimizes performance by pre-filtering recipes once before the daily generation loop.
 *
 * @param {Object} userProfile - The user's profile containing dietary goals, preferences, and nutritional targets.
 * @returns {Array} An array of 7 daily meal plan objects, each detailing the meals and date.
 */
// Generate full week meal plan
export const generateWeeklyMealPlan = (userProfile) => {
  console.log('\n🍽️ === STARTING MEAL PLAN GENERATION ===');

  // 1. Filter ALL recipes ONCE at the start (Performance Optimization)
  console.time('RecipeFiltering');
  const filteredBreakfast = filterRecipes(breakfastRecipes, userProfile);
  const filteredLunch = filterRecipes(lunchRecipes, userProfile);
  const filteredDinner = filterRecipes(dinnerRecipes, userProfile);
  const filteredSnack = filterRecipes(snackRecipes, userProfile);

  // 2. Merge user custom recipes into the appropriate pools
  //    They pass through the same filter so allergies / diet prefs are respected.
  const customPools = getCustomRecipesByMealType();
  const mergedBreakfast = [...filteredBreakfast, ...filterRecipes(customPools.breakfast, userProfile)];
  const mergedLunch     = [...filteredLunch,     ...filterRecipes(customPools.lunch,     userProfile)];
  const mergedDinner    = [...filteredDinner,    ...filterRecipes(customPools.dinner,    userProfile)];
  const mergedSnack     = [...filteredSnack,     ...filterRecipes(customPools.snack,     userProfile)];
  console.timeEnd('RecipeFiltering');

  console.log('Filtered + custom recipes available:', {
    breakfast: mergedBreakfast.length,
    lunch: mergedLunch.length,
    dinner: mergedDinner.length,
    snacks: mergedSnack.length
  });

  if (mergedBreakfast.length === 0) console.warn('⚠️ CRITICAL: No breakfast recipes found for this profile!');
  if (mergedLunch.length === 0) console.warn('⚠️ CRITICAL: No lunch recipes found for this profile!');

  const preFilteredRecipes = {
    breakfast: mergedBreakfast,
    lunch: mergedLunch,
    dinner: mergedDinner,
    snack: mergedSnack
  };

  const weekPlan = [];

  // State to track used recipe IDs to encourage variety
  const usedRecipesState = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };

  // Shared cuisine rotation state — persists across all 7 days
  const cuisineState = createCuisineState();

  for (let i = 0; i < 7; i++) {
    const dayPlan = generateDayPlan(
      userProfile,
      preFilteredRecipes,
      usedRecipesState,
      i,
      cuisineState
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

/**
 * Orchestrates the generation of a weekly meal plan and persists it to the backend via an API call.
 *
 * @param {Object} userProfile - The user's profile containing nutritional targets and goals.
 * @returns {Promise<Array>} A promise resolving to the generated weekly meal plan array.
 * @throws {Error} Throws an error if saving to the backend fails.
 */
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