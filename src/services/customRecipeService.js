/**
 * Custom Recipe Service
 *
 * User-created recipes are stored on the server (POST/PUT/DELETE /api/recipes/custom),
 * so they follow the user across devices and the meal planner can use them.
 */
import { api } from './api';

/** Supported dietary types (mirrors the built-in schema). */
export const DIETARY_TYPES = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'non_veg'];

/** Cuisine options available in the app. */
export const CUISINE_OPTIONS = [
  'north_indian', 'south_indian', 'punjabi', 'gujarati', 'maharashtrian', 'bengali',
  'asian', 'mediterranean', 'international', 'other',
];

/** Difficulty levels. */
export const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'];

/** Meal type tags used to route recipes into the correct generator pool. */
export const MEAL_TYPE_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─────────────────────────────────────────────────────────────────────────────

/** Create a recipe; resolves to the saved recipe. */
export const addCustomRecipe = (recipeData) => api.saveCustomRecipe(recipeData);

/** Replace an existing recipe's fields; resolves to the saved recipe. */
export const updateCustomRecipe = (id, recipeData) => api.saveCustomRecipe(recipeData, id);

/** Delete a recipe by id. */
export const deleteCustomRecipe = (id) => api.deleteCustomRecipe(id);

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
