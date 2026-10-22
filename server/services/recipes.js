// Loads recipes from the database in the shape the planner works with, and converts
// them to the shape the browser displays.
import { prisma } from '../lib/prisma.js';
import { parseJson } from '../lib/auth.js';
import { formatQuantity } from '../engine/nutrition.js';

const INCLUDE_INGREDIENTS = { ingredients: { include: { food: true }, orderBy: { position: 'asc' } } };

export const toEngineRecipe = (row) => ({
    id: row.id,
    source: row.source,
    ownerId: row.ownerId,
    name: row.name,
    course: row.course,
    cuisine: row.cuisine,
    meals: parseJson(row.meals, []),
    regions: parseJson(row.regions, []),
    pairs: parseJson(row.pairs, []),
    stapleGroup: row.stapleGroup,
    servings: row.servings,
    servingUnit: row.servingUnit,
    prepTime: row.prepTime,
    cookTime: row.cookTime,
    difficulty: row.difficulty,
    tags: parseJson(row.tags, []),
    instructions: parseJson(row.instructions, []),
    batchFriendly: row.batchFriendly,
    imageUrl: row.imageUrl,
    nutrition: {
        kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fibre: row.fibre,
        sugar: row.sugar, sodium: row.sodium, iron: row.iron, calcium: row.calcium, vitC: row.vitC, folate: row.folate,
    },
    glycaemicLoad: row.glycaemicLoad,
    costInr: row.costInr,
    allergens: parseJson(row.allergens, []),
    dietCategory: row.dietCategory,
    flags: parseJson(row.flags, {}),
    ingredients: (row.ingredients || []).map(i => ({ foodId: i.foodId, name: i.food.name, grams: i.grams, group: i.food.foodGroup })),
    customIngredients: parseJson(row.customIngredients, null),
});

// Curated recipes only change when the seed script runs, so they are cached.
let curatedCache = null;

export const loadCuratedRecipes = async () => {
    if (!curatedCache) {
        const rows = await prisma.recipe.findMany({ where: { ownerId: null }, include: INCLUDE_INGREDIENTS });
        curatedCache = rows.map(toEngineRecipe);
    }
    return curatedCache;
};

export const loadCustomRecipes = async (userId) => {
    const rows = await prisma.recipe.findMany({ where: { ownerId: userId }, include: INCLUDE_INGREDIENTS, orderBy: { createdAt: 'desc' } });
    return rows.map(toEngineRecipe);
};

/** Curated recipes plus the user's own. */
export const loadRecipesForUser = async (userId) => [...(await loadCuratedRecipes()), ...(await loadCustomRecipes(userId))];

/** One recipe, per serving, as the browser shows it. */
export const toClientRecipe = (recipe) => ({
    id: recipe.id,
    name: recipe.name,
    course: recipe.course,
    cuisine: recipe.cuisine,
    meals: recipe.meals,
    regions: recipe.regions,
    pairs: recipe.pairs,
    stapleGroup: recipe.stapleGroup,
    servings: recipe.servings,
    servingUnit: recipe.servingUnit,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    instructions: recipe.instructions,
    batchFriendly: recipe.batchFriendly,
    imageUrl: recipe.imageUrl,
    calories: Math.round(recipe.nutrition.kcal),
    protein: Math.round(recipe.nutrition.protein),
    carbs: Math.round(recipe.nutrition.carbs),
    fat: Math.round(recipe.nutrition.fat),
    nutrition: recipe.nutrition,
    glycaemicLoad: recipe.glycaemicLoad,
    costInr: recipe.costInr,
    allergens: recipe.allergens,
    dietCategory: recipe.dietCategory,
    dietaryType: [recipe.dietCategory],
    flags: recipe.flags,
    isCustom: recipe.source === 'custom',
    // Whole-recipe quantities; nutrition above is per serving.
    ingredients: recipe.customIngredients || recipe.ingredients.map(i => formatQuantity(i.foodId, i.grams)),
});
