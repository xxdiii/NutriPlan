// Meal plans are generated and stored on the server; localStorage keeps a cache so the
// dashboard and insights pages can read the plan synchronously.
import { api } from './api';
import { localDateString } from '../utils/dates';

// Must match PLANNER_VERSION in server/engine/planner.js. Plans made by an older planner
// have a different shape and are regenerated.
export const PLANNER_VERSION = 3;
const CACHE_KEY = 'weeklyMealPlan';

const cache = (planDoc) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(planDoc));
  return planDoc;
};

export const getCachedPlan = () => {
  try {
    const plan = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return plan?.planVersion === PLANNER_VERSION ? plan : null;
  } catch {
    return null;
  }
};

/** Latest saved plan, or null when there is none (or it came from an older planner). */
export const loadPlan = async () => {
  try {
    const plan = await api.getMealPlan();
    if (plan && plan.planVersion === PLANNER_VERSION) return cache(plan);
    if (!plan) localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Could not load meal plan from server; using cached copy.', error);
    return getCachedPlan();
  }
};

/** Generate a fresh week starting today (local date). Each call uses a new seed. */
export const generatePlan = async () => {
  const plan = await api.generateMealPlan({
    startDate: localDateString(),
    seed: Math.floor(Math.random() * 2 ** 31),
  });
  return cache(plan);
};

/** Swap one meal on the server and return the updated plan document. */
export const swapMeal = async (date, slot, recipeId) => cache(await api.swapMeal(date, slot, recipeId));
