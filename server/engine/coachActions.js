// Plan changes the AI coach can propose (F7). Pure functions over the planner: the coach
// chooses which action to take; every portion, calorie budget and recipe comes from here.
import { buildContext, dayTotals, generateWeekPlan, rebalanceDay, swapMeal, SLOTS, SLOT_SHARE } from './planner.js';
import { nameScore, tokens } from './foodMatch.js';
import { fitToBudget } from './budget.js';

// An event meal may take up to this multiple of its usual share of the day...
const EVENT_BOOST = 1.6;
// ...but never more than this share of the whole day.
const EVENT_MAX_SHARE = 0.5;

const roundTo = (n, step) => Math.round(n / step) * step;

const EAT_OUT_TIPS = [
    'Start with a salad, clear soup or raita.',
    'Pick tandoori, grilled or dal dishes over creamy, fried or buttery ones.',
    'Have 1-2 rotis or a small bowl of rice rather than both; go easy on naan, puri and biryani.',
    'If you want a sweet, share one.',
];

/**
 * A meal the user eats out: a calorie budget instead of a recipe. Macros are unknown, so
 * they are zero; the user logs what they actually ate.
 */
export const eatingOutMeal = (slot, occasion, kcal, proteinGoal, profile = {}) => {
    const allergies = profile.allergies || [];
    const tips = [...EAT_OUT_TIPS];
    if (allergies.length) tips.push(`Tell the staff about your allergies (${allergies.join(', ')}); restaurant food often hides nuts, dairy and wheat.`);
    return {
        id: `eat-out-${slot}`,
        recipeId: null,
        eatingOut: true,
        name: `Eating out: ${occasion}`,
        course: 'eat_out',
        cuisine: 'eating_out',
        components: [],
        portionLabel: `Up to about ${kcal} kcal; aim for ${proteinGoal} g protein`,
        scaledServings: 1,
        servings: 1,
        prepTime: 0,
        cookTime: 0,
        difficulty: 'beginner',
        tags: ['eating-out'],
        imageUrl: null,
        calories: kcal,
        protein: 0,
        carbs: 0,
        fat: 0,
        nutrition: { kcal, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, sodium: 0, iron: 0, calcium: 0, vitC: 0, folate: 0 },
        glycaemicLoad: 0,
        costInr: 0,
        allergens: [],
        dietCategory: profile.dietaryPreference || null,
        dietaryType: [],
        flags: {},
        ingredientItems: [],
        ingredients: [],
        instructions: tips,
        warnings: [],
    };
};

const cleanOccasion = (text, fallback) => String(text || fallback).trim().replace(/\s+/g, ' ').slice(0, 40) || fallback;

/**
 * An occasion at one meal (a wedding dinner, a work lunch): that meal becomes a larger
 * eating-out budget and the day's other planned meals are re-portioned lighter, so the
 * day still lands near the calorie target.
 * @param locked  slots already eaten: kept exactly as they are
 */
export const planEventDay = (day, slot, occasion, profile, recipes, locked = []) => {
    if (locked.includes(slot)) throw new Error(`The ${slot} is already marked as eaten.`);
    const ctx = buildContext(profile, recipes, { seed: 1 });
    const recipesById = new Map(recipes.map(r => [r.id, r]));
    const share = SLOT_SHARE[slot];
    const label = cleanOccasion(occasion, 'special occasion');
    const proteinGoal = Math.round(ctx.targetProtein * share);
    const initial = Math.round(ctx.targetKcal * Math.min(EVENT_MAX_SHARE, share * EVENT_BOOST));

    // Eaten meals are left out of the re-portioning and their calories come off the target.
    const kept = Object.fromEntries(locked.filter(s => day[s]).map(s => [s, day[s]]));
    const keptKcal = Object.values(kept).reduce((sum, m) => sum + m.calories, 0);
    const keptProtein = Object.values(kept).reduce((sum, m) => sum + m.protein, 0);
    const working = { ...day, [slot]: eatingOutMeal(slot, label, initial, proteinGoal, profile) };
    for (const s of Object.keys(kept)) delete working[s];
    const balanced = {
        ...rebalanceDay(working, {
            ...ctx,
            targetKcal: ctx.targetKcal - keptKcal,
            targetProtein: Math.max(1, ctx.targetProtein * (1 - share) - keptProtein),
        }, recipesById),
        ...kept,
    };

    // Whatever the other meals leave of the day's target is the event budget.
    const others = SLOTS.filter(s => s !== slot && balanced[s]).reduce((sum, s) => sum + balanced[s].calories, 0);
    const budget = roundTo(Math.max(ctx.targetKcal * share, ctx.targetKcal - others), 10);
    const updated = { ...balanced, [slot]: eatingOutMeal(slot, label, budget, proteinGoal, profile) };
    return { ...updated, ...dayTotals(updated) };
};

/**
 * Travelling or no kitchen: every meal of each day becomes an eating-out budget.
 * @param locked  { date: [slots already eaten] }, kept as they are
 */
export const planEatOutDays = (days, profile, recipes, occasion = 'travel', locked = {}) => {
    const ctx = buildContext(profile, recipes, { seed: 1 });
    const label = cleanOccasion(occasion, 'travel');
    return days.map(day => {
        const updated = { ...day };
        for (const slot of SLOTS) {
            if ((locked[day.date] || []).includes(slot)) continue;
            updated[slot] = eatingOutMeal(slot, label, roundTo(ctx.targetKcal * SLOT_SHARE[slot], 10), Math.round(ctx.targetProtein * SLOT_SHARE[slot]), profile);
        }
        return { ...updated, ...dayTotals(updated) };
    });
};

/**
 * New recipes for some days of the plan (e.g. "bored of this week").
 * @param locked  { date: [slots already eaten] }, kept as they are
 */
export const planFreshDays = (days, profile, recipes, seed, locked = {}) => {
    if (!days.length) return [];
    const first = days[0].date;
    const last = days[days.length - 1].date;
    const span = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86400000) + 1;
    const { plan: generated } = fitToBudget(generateWeekPlan(profile, recipes, { startDate: first, days: span, seed }), profile, recipes);
    const fresh = new Map(generated.map(d => [d.date, d]));
    return days.map(day => {
        const next = fresh.get(day.date);
        if (!next) return day;
        const kept = Object.fromEntries((locked[day.date] || []).filter(s => day[s]).map(s => [s, day[s]]));
        const updated = { ...next, ...kept };
        return { ...updated, ...dayTotals(updated) };
    });
};

// Words in requests like "something light with paneer" that say nothing about the dish.
const FILLER = new Set(['something', 'anything', 'dish', 'food', 'meal', 'kuch', 'khana', 'want', 'like', 'please', 'some', 'instead', 'different', 'else', 'other', 'option']);

/**
 * Recipes that fit the user's diet, allergies and dislikes, ranked against a request.
 * @param slot  limit to recipes for this meal slot (optional)
 */
export const findRecipes = (profile, recipes, query, slot = null, limit = 5) => {
    const ctx = buildContext(profile, recipes, { seed: 1 });
    const q = tokens(query).filter(t => !FILLER.has(t));
    const candidates = ctx.allowed.filter(r => r.course !== 'staple' && r.meals.length && (!slot || r.meals.includes(slot)));
    if (!q.length) return [];
    return candidates
        .map(recipe => {
            const haystack = new Set(tokens([recipe.name, recipe.cuisine.replace(/_/g, ' '), ...recipe.tags, ...recipe.ingredients.map(i => i.name)].join(' ')));
            const coverage = q.filter(t => haystack.has(t)).length / q.length;
            return { recipe, score: 0.6 * nameScore(q, tokens(recipe.name)) + 0.4 * coverage };
        })
        .filter(r => r.score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => r.recipe);
};

/** Swap one meal for a recipe chosen by `findRecipes`. */
export const planSwap = (day, slot, recipe, profile, recipes) => swapMeal(day, slot, recipe, profile, recipes);

/** What the coach and the confirmation card show about a meal. */
export const mealSummary = (meal) => (meal ? {
    name: meal.name,
    portion: meal.portionLabel || '',
    kcal: Math.round(meal.calories || 0),
    protein: Math.round(meal.protein || 0),
    eatingOut: Boolean(meal.eatingOut),
} : null);

const sameMeal = (a, b) => JSON.stringify(mealSummary(a)) === JSON.stringify(mealSummary(b));

/** Changed meals and day totals between two versions of the same days. */
export const diffDays = (before, after) => after.map((day, i) => {
    const old = before[i];
    return {
        date: day.date,
        totals: { before: Math.round(dayTotals(old).totalCalories), after: Math.round(dayTotals(day).totalCalories) },
        meals: SLOTS.filter(slot => !sameMeal(old[slot], day[slot])).map(slot => ({ slot, before: mealSummary(old[slot]), after: mealSummary(day[slot]) })),
    };
}).filter(d => d.meals.length);
