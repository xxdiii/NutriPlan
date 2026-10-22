// Planning to a ₹ budget (F5). The planner already prefers cheaper recipes; this repair
// step then swaps the meals with the best saving for the least nutrition lost until the
// week fits the budget, keeping every hard constraint and the day's calorie target.
import { buildContext, budgetPerPersonPerDay, dayTotals, generateWeekPlan, portionMeal, rebalanceDay, slotCandidates, SLOTS } from './planner.js';

const MAX_SWAPS = 40;
// Meals swapped in may appear at most this often in the week.
const MAX_USES = 2;
// Only the most promising cheaper recipes (by estimated cost) are portioned exactly.
const SHORTLIST = 3;
const MIN_SAVING = 1;

const round = (n) => Math.round(n);

/** ₹ per person for the whole plan (eating-out budgets are not grocery spend). */
export const planCost = (plan) => plan.reduce((sum, day) =>
    sum + SLOTS.reduce((s, slot) => s + (day[slot] && !day[slot].eatingOut ? day[slot].costInr || 0 : 0), 0), 0);

const recipeUses = (plan) => {
    const uses = new Map();
    for (const day of plan) for (const slot of SLOTS) for (const c of day[slot]?.components || []) {
        if (c.course !== 'staple') uses.set(c.id, (uses.get(c.id) || 0) + 1);
    }
    return uses;
};

const cheapestStaple = (ctx, main) => {
    const pool = ctx.staples.filter(s => main.pairs.includes(s.stapleGroup));
    return pool.reduce((best, s) => (!best || s.costInr / s.nutrition.kcal < best.costInr / best.nutrition.kcal ? s : best), null);
};

// A batch-cooked dinner feeds the next day's lunch; swapping it would break the leftover.
const feedsLeftover = (plan, d, slot) => slot === 'dinner' && plan[d + 1]?.lunch?.leftoverFrom === plan[d].date;

/**
 * Bring a plan within the user's budget where possible.
 * @returns { plan, cost, budget, fits, swaps } where cost and budget are ₹ per person
 */
export const fitToBudget = (plan, profile, recipes) => {
    const ctx = buildContext(profile, recipes, { seed: 1 });
    const recipesById = new Map(recipes.map(r => [r.id, r]));
    const budget = budgetPerPersonPerDay(profile) * plan.length;
    const days = plan.map(day => ({ ...day }));
    let cost = planCost(days);
    let swaps = 0;
    const uses = recipeUses(days);
    const candidatesBySlot = Object.fromEntries(SLOTS.map(slot => [slot, slotCandidates(ctx, slot)]));

    while (cost > budget && swaps < MAX_SWAPS) {
        let best = null;
        days.forEach((day, d) => {
            for (const slot of SLOTS) {
                const meal = day[slot];
                if (!meal || meal.eatingOut || meal.leftover || feedsLeftover(days, d, slot) || !meal.components?.length) continue;
                const current = new Set(meal.components.map(c => c.id));
                const shortlist = candidatesBySlot[slot]
                    .filter(r => !current.has(r.id) && (uses.get(r.id) || 0) < MAX_USES)
                    .map(r => ({ recipe: r, estimate: (r.costInr / Math.max(r.nutrition.kcal, 1)) * meal.calories }))
                    .filter(c => c.estimate < meal.costInr - MIN_SAVING)
                    .sort((a, b) => a.estimate - b.estimate)
                    .slice(0, SHORTLIST);
                for (const { recipe } of shortlist) {
                    const staple = recipe.course === 'main' ? cheapestStaple(ctx, recipe) : null;
                    if (recipe.course === 'main' && !staple) continue;
                    const next = portionMeal(recipe, staple, meal.calories, meal.protein, profile);
                    const saving = meal.costInr - next.costInr;
                    if (saving < MIN_SAVING) continue;
                    const proteinLoss = Math.max(0, meal.protein - next.protein) / Math.max(meal.protein, 1);
                    const kcalDrift = Math.abs(next.calories - meal.calories) / Math.max(meal.calories, 1);
                    const score = saving / (1 + 5 * proteinLoss + 3 * kcalDrift);
                    if (!best || score > best.score) best = { d, slot, meal: next, score, old: meal };
                }
            }
        });
        if (!best) break;

        for (const c of best.old.components) if (c.course !== 'staple') uses.set(c.id, (uses.get(c.id) || 1) - 1);
        for (const c of best.meal.components) if (c.course !== 'staple') uses.set(c.id, (uses.get(c.id) || 0) + 1);
        days[best.d] = rebalanceDay({ ...days[best.d], [best.slot]: best.meal }, ctx, recipesById);
        cost = planCost(days);
        swaps++;
    }

    return { plan: days.map(day => ({ ...day, ...dayTotals(day) })), cost: round(cost), budget: round(budget), fits: cost <= budget, swaps };
};

/** The planner followed by the budget repair: what every "new plan" uses. */
export const planWeek = (profile, recipes, options = {}) => {
    const plan = generateWeekPlan(profile, recipes, options);
    return fitToBudget(plan, profile, recipes);
};

/** Budget summary for a plan, for the shopping page and meal plan. */
export const budgetSummary = (plan, profile) => {
    const people = Math.max(1, parseInt(profile.servings, 10) || 1);
    const perPersonPerDay = budgetPerPersonPerDay(profile);
    const cost = planCost(plan);
    return {
        source: parseFloat(profile.weeklyBudget) > 0 ? 'custom' : 'level',
        level: profile.budget || 'medium',
        people,
        days: plan.length,
        budgetPerPersonPerDay: round(perPersonPerDay),
        weeklyBudget: round(perPersonPerDay * 7 * people),
        planCost: round(cost * people),
        planCostPerDay: round((cost * people) / Math.max(plan.length, 1)),
        fits: cost <= perPersonPerDay * plan.length + 0.5,
    };
};
