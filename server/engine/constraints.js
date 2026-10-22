// Hard filters (diet, allergies, dislikes, cooking skill) and soft health warnings.
import { allowedDietCategories } from './nutrition.js';

const VITAMIN_K_GREENS = ['spinach', 'methi', 'mustard_greens', 'bathua', 'amaranth_leaves', 'drumstick_leaves', 'broccoli', 'cabbage'];
const HIGH_FODMAP = ['onion', 'garlic', 'spring_onion', 'rajma', 'kabuli_chana', 'kala_chana', 'cauliflower', 'mushroom'];

// Per-meal thresholds used for warnings (and scoring penalties in the planner).
export const LIMITS = {
    glycaemicLoad: 30,   // high GL for one meal (a low-GL day totals under ~100)
    sodium: 800,         // mg; ICMR's 5 g salt/day is ~2000 mg sodium
    sugar: 12,           // g
};

const has = (list, value) => Array.isArray(list) && list.includes(value);

/** Lower-cased words from the "foods you dislike" text box. */
export const parseDislikedFoods = (text) =>
    String(text || '')
        .toLowerCase()
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 3);

const mentionsAny = (recipe, words) => {
    if (!words.length) return false;
    const haystack = [recipe.name, ...recipe.ingredients.map(i => `${i.foodId} ${i.name}`)].join(' ').toLowerCase();
    return words.some(word => haystack.includes(word));
};

/**
 * Hard constraints: a recipe that fails any of these is never planned or offered.
 * Returns the reason it was rejected, or null when it is allowed.
 */
export const rejectionReason = (recipe, profile, { dislikedWords } = {}) => {
    const diet = profile.dietaryPreference || 'non_veg';
    if (!allowedDietCategories(diet).includes(recipe.dietCategory)) return 'diet';
    const allergies = profile.allergies || [];
    if (recipe.allergens.some(a => allergies.includes(a))) return 'allergy';
    if ((profile.dislikedRecipes || []).map(String).includes(String(recipe.id))) return 'disliked';
    if (mentionsAny(recipe, dislikedWords ?? parseDislikedFoods(profile.dislikedFoods))) return 'disliked_food';
    if (profile.cookingSkill === 'beginner' && recipe.difficulty === 'advanced') return 'skill';
    return null;
};

/**
 * Health and medication notes for a portion of a meal.
 * @param meal  { nutrition (for the portion), glycaemicLoad, foodIds, flags, allergens }
 */
export const healthWarnings = (meal, profile) => {
    const warnings = [];
    const conditions = profile.healthConditions || [];
    const medications = String(profile.medications || '').toLowerCase();
    const { nutrition, glycaemicLoad = 0, foodIds = [] } = meal;

    if ((has(conditions, 'diabetes_t1') || has(conditions, 'diabetes_t2') || has(conditions, 'pcos')) && glycaemicLoad > LIMITS.glycaemicLoad) {
        warnings.push({ type: 'glycaemic', message: `High glycaemic load (${Math.round(glycaemicLoad)}). Pair with salad or curd, or take a smaller portion of the grain.` });
    }
    if ((has(conditions, 'diabetes_t1') || has(conditions, 'diabetes_t2') || has(conditions, 'pcos')) && nutrition.sugar > LIMITS.sugar) {
        warnings.push({ type: 'sugar', message: `${Math.round(nutrition.sugar)} g sugar in this meal.` });
    }
    if (has(conditions, 'hypertension') && nutrition.sodium > LIMITS.sodium) {
        warnings.push({ type: 'sodium', message: `${Math.round(nutrition.sodium)} mg sodium. Use less salt when cooking.` });
    }
    if (has(conditions, 'thyroid_hypo') && meal.flags?.goitrogen) {
        warnings.push({ type: 'thyroid', message: 'Contains cruciferous vegetables. Cook them well.' });
    }
    if (has(conditions, 'ibs') && foodIds.some(id => HIGH_FODMAP.includes(id))) {
        warnings.push({ type: 'fodmap', message: 'Contains high-FODMAP ingredients (onion, garlic or legumes).' });
    }
    if (/warfarin|acitrom|acenocoumarol/.test(medications) && foodIds.some(id => VITAMIN_K_GREENS.includes(id))) {
        warnings.push({ type: 'medication', message: 'Vitamin K-rich greens: keep how much you eat consistent while on blood thinners.' });
    }
    if (/levothyroxine|thyroxine|thyronorm|eltroxin/.test(medications) && (meal.allergens || []).includes('soy')) {
        warnings.push({ type: 'medication', message: 'Contains soy: take levothyroxine at least 4 hours apart.' });
    }
    return warnings;
};
