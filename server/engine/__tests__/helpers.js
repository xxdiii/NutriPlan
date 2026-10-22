// Builds engine-shaped recipes straight from the recipe definitions (what the seed
// script stores and services/recipes.js loads), so tests don't need a database.
import { RECIPES } from '../../data/recipes/index.js';
import { analyseRecipe, getFood } from '../nutrition.js';
import { computeNutritionTargets } from '../../../shared/targets.js';

export const toEngineRecipe = (def) => {
    const analysis = analyseRecipe(def.ingredients, def.serves);
    return {
        id: def.id,
        source: 'curated',
        name: def.name,
        course: def.course,
        cuisine: def.cuisine,
        meals: def.meals,
        regions: def.regions,
        pairs: def.pairs,
        stapleGroup: def.group,
        servings: def.serves,
        servingUnit: def.unit,
        prepTime: def.prepTime,
        cookTime: def.cookTime,
        difficulty: def.difficulty,
        tags: def.tags,
        instructions: def.steps,
        batchFriendly: def.batchFriendly,
        imageUrl: null,
        ...analysis,
        ingredients: def.ingredients.map(i => ({ foodId: i.food, name: getFood(i.food).name, grams: i.grams })),
        customIngredients: null,
    };
};

export const CATALOGUE = RECIPES.map(toEngineRecipe);

export const makeProfile = (overrides = {}) => {
    const profile = {
        gender: 'male', age: 25, height: 170, weight: 70, activityLevel: 1.2,
        goal: 'maintain', targetRate: 0.5, dietaryPreference: 'non_veg',
        cuisines: [], region: '', budget: 'medium', servings: 1,
        mealPrepPreference: 'daily', cookingSkill: 'intermediate',
        allergies: [], healthConditions: [], medications: '', dislikedFoods: '',
        ...overrides,
    };
    return { ...profile, nutritionTargets: computeNutritionTargets(profile) };
};

export const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

/** Every recipe id used anywhere in a plan (mains, staples and one-dish meals). */
export const componentIds = (plan) =>
    plan.flatMap(day => SLOTS.flatMap(slot => (day[slot]?.components || []).map(c => c.id)));
