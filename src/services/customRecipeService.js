/**
 * Custom Recipe Service
 *
 * Persists user-created recipes to localStorage and exposes them for the
 * meal plan generator and recipe browser.
 *
 * Storage key: 'nutriplan_custom_recipes'
 * Each recipe matches the same schema used by the built-in JSON files so it
 * can be dropped directly into the generator's recipe pools.
 */

const STORAGE_KEY = 'nutriplan_custom_recipes';

/** Supported dietary types (mirrors the built-in schema). */
export const DIETARY_TYPES = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'non_veg'];

/** Cuisine options available in the app. */
export const CUISINE_OPTIONS = [
  'north_indian', 'south_indian', 'asian', 'italian',
  'mediterranean', 'mexican', 'international', 'indian',
  'fusion', 'other',
];

/** Difficulty levels. */
export const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

/** Meal type tags used to route recipes into the correct generator pool. */
export const MEAL_TYPE_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load all custom recipes from localStorage.
 * @returns {Array<Object>} Array of recipe objects (may be empty).
 */
export const loadCustomRecipes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Save the full custom recipe list to localStorage.
 * @param {Array<Object>} recipes
 */
const persistRecipes = (recipes) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
};

/**
 * Add a new custom recipe.  Generates a unique id and timestamps it.
 * @param {Object} recipeData – form data (without id / createdAt).
 * @returns {Object} The saved recipe including generated id.
 */
export const addCustomRecipe = (recipeData) => {
  const recipes = loadCustomRecipes();
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const recipe = {
    ...recipeData,
    id,
    isCustom: true,               // flag so UI can show "Custom" badge
    createdAt: new Date().toISOString(),
  };
  recipes.push(recipe);
  persistRecipes(recipes);
  return recipe;
};

/**
 * Update an existing custom recipe by id.
 * @param {string} id
 * @param {Object} updates – partial recipe fields to merge.
 * @returns {Object|null} Updated recipe or null if not found.
 */
export const updateCustomRecipe = (id, updates) => {
  const recipes = loadCustomRecipes();
  const idx = recipes.findIndex(r => r.id === id);
  if (idx === -1) return null;
  recipes[idx] = { ...recipes[idx], ...updates, updatedAt: new Date().toISOString() };
  persistRecipes(recipes);
  return recipes[idx];
};

/**
 * Delete a custom recipe by id.
 * @param {string} id
 * @returns {boolean} true if deleted.
 */
export const deleteCustomRecipe = (id) => {
  const recipes = loadCustomRecipes();
  const filtered = recipes.filter(r => r.id !== id);
  if (filtered.length === recipes.length) return false;
  persistRecipes(filtered);
  return true;
};

/**
 * Return custom recipes split by meal type — ready to be merged
 * directly into the generator's preFilteredRecipes pools.
 *
 * @returns {{ breakfast: [], lunch: [], dinner: [], snack: [] }}
 */
export const getCustomRecipesByMealType = () => {
  const all = loadCustomRecipes();
  const pools = { breakfast: [], lunch: [], dinner: [], snack: [] };
  all.forEach(r => {
    (r.mealTypes || []).forEach(type => {
      if (pools[type]) pools[type].push(r);
    });
  });
  return pools;
};

/**
 * Build an empty recipe form object with sensible defaults.
 */
export const emptyRecipeForm = () => ({
  name: '',
  cuisine: 'international',
  dietaryType: [],
  mealTypes: [],
  prepTime: 10,
  cookTime: 20,
  difficulty: 'beginner',
  servings: 2,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  ingredients: [''],
  instructions: [''],
  tags: [],
  allergens: [],
  imageUrl: '',
});
