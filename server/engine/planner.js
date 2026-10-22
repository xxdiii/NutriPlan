// Weekly meal planner.
//
// Breakfast and snacks are single dishes. Lunch and dinner are either a one-dish meal
// (biryani, khichdi) or a main served with a staple ("1 katori dal + 3 rotis"); both are
// portioned per person to the slot's calorie target, then each day is rebalanced so it
// lands within a few percent of the daily target while getting as close as possible to
// the protein target.
import { NUTRIENTS, formatQuantity, getFood, DIET_ORDER } from './nutrition.js';
import { rejectionReason, parseDislikedFoods, healthWarnings } from './constraints.js';

export const PLANNER_VERSION = 3;
export const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];
export const SLOT_SHARE = { breakfast: 0.25, lunch: 0.33, snack: 0.12, dinner: 0.30 };

// Cuisines that count as "local" for a user's state.
const STATE_CUISINES = {
    'Punjab': ['punjabi', 'north_indian'], 'Haryana': ['punjabi', 'north_indian'], 'Delhi': ['punjabi', 'north_indian'],
    'Himachal Pradesh': ['north_indian', 'punjabi'], 'Uttarakhand': ['north_indian'], 'Uttar Pradesh': ['north_indian'],
    'Bihar': ['north_indian'], 'Jharkhand': ['north_indian'], 'Madhya Pradesh': ['north_indian'],
    'Chhattisgarh': ['north_indian'], 'Rajasthan': ['north_indian'], 'Gujarat': ['gujarati'],
    'Maharashtra': ['maharashtrian'], 'Goa': ['goan', 'maharashtrian'], 'West Bengal': ['bengali'],
    'Tripura': ['bengali'], 'Assam': ['bengali'], 'Odisha': ['odia', 'bengali'],
    'Karnataka': ['south_indian'], 'Kerala': ['south_indian'], 'Tamil Nadu': ['south_indian'],
    'Andhra Pradesh': ['south_indian'], 'Telangana': ['south_indian'], 'Puducherry': ['south_indian'],
};
const RICE_STATES = ['Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'West Bengal', 'Odisha', 'Assam', 'Tripura', 'Goa'];
const BHAKRI_STATES = ['Maharashtra', 'Karnataka', 'Gujarat', 'Rajasthan'];

// Rough food spend per person per day for each onboarding budget level (₹).
export const DAILY_BUDGET = { low: 100, medium: 200, high: 400 };

const GLYCAEMIC_CONDITIONS = ['diabetes_t1', 'diabetes_t2', 'pcos'];
const SAFE_FLAGS = ['noOnionGarlic', 'jainSafe', 'sattvic', 'vratSafe', 'glutenFree'];
const MAIN_SCALES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SINGLE_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
const STAPLE_STEPS = { rice: 0.5, katori: 0.5, default: 1 };
const DAY_TOLERANCE = 0.04;

/** Deterministic PRNG (mulberry32) so a plan can be reproduced from its seed. */
export const createRng = (seed) => {
    let a = (Number(seed) >>> 0) || 1;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const addDays = (isoDate, days) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const weekdayOf = (isoDate) => new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const round1 = (v) => Math.round(v * 10) / 10;
const shortName = (name) => name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

// ── Portions ──────────────────────────────────────────────────────────────────

const stapleStep = (staple) => (staple.stapleGroup === 'rice' || /katori/.test(staple.servingUnit) ? STAPLE_STEPS.rice : STAPLE_STEPS.default);

const stapleCounts = (staple) => {
    const step = stapleStep(staple);
    const counts = [];
    for (let c = step; c <= (step < 1 ? 3 : 6); c += step) counts.push(c);
    return counts;
};

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
// Serving units that say how much, not what; the dish name is added to the label.
const CONTAINER_UNITS = /^(katori|bowl|glass|plate|handful|small handful|cup|jar|serving|ball)$/;

/** 1.75 -> "1¾"; values that are not quarter steps are rounded to one decimal. */
const formatCount = (n) => {
    const whole = Math.floor(n + 1e-9);
    const fraction = FRACTIONS[Math.round((n - whole) * 100) / 100];
    if (Math.abs(n - whole) < 1e-9) return String(whole);
    if (fraction) return `${whole || ''}${fraction}`;
    return String(round1(n));
};

/** Leading count of a serving unit: "3 chillas" -> 3, "1 katori" -> 1. */
const unitCount = (unit) => Number(/^(\d+(?:\.\d+)?)\s/.exec(unit)?.[1]) || 1;

/**
 * Readable portion: "1¾ katori sambar", "3 roti", "4 idli + sambar".
 * @param name dish name, added when the unit is a container like katori or bowl
 */
export const describePortion = (unit, scale, name = '') => {
    const match = /^(\d+(?:\.\d+)?)\s+(.*)$/.exec(unit);
    if (!match) return scale === 1 ? unit : `${formatCount(scale)} × ${unit}`;
    const count = Number(match[1]) * scale;
    let label = match[2];
    // "1 parathas + curd" -> "1 paratha + curd"
    if (count === 1 && Number(match[1]) !== 1) label = label.replace(/^(\w+?)(?:es|s)\b/, (word, stem) => (/(ch|sh)$/.test(stem) ? stem : word.replace(/s$/, '')));
    const withName = CONTAINER_UNITS.test(label.trim()) && name ? ` ${shortName(name).toLowerCase()}` : '';
    if (Math.abs(count * 4 - Math.round(count * 4)) < 0.01) return `${formatCount(count)} ${label}${withName}`;
    return `${formatCount(scale)} × ${unit}${withName}`;
};

/**
 * Portion multiples a dish can take. Countable units ("3 chillas", "4 idli") move in
 * whole items; containers ("1 katori", "1 plate") in quarters.
 */
const scaleOptions = (recipe) => {
    const n = unitCount(recipe.servingUnit);
    const max = maxScale(recipe);
    if (n <= 1) return SINGLE_SCALES.filter(s => s <= max);
    const options = [];
    for (let count = Math.ceil(n * 0.5); count <= n * max; count++) options.push(Math.round((count / n) * 1000) / 1000);
    return options;
};

// Snacks stay snack-sized: at most a double serving.
const maxScale = (recipe) => (recipe.course === 'snack' ? 2 : 3);

const portionScore = (kcal, protein, targetKcal, targetProtein) =>
    Math.abs(kcal - targetKcal) / targetKcal + 0.8 * Math.max(0, targetProtein - protein) / Math.max(targetProtein, 1);

// For diabetes and PCOS, portions lean towards the dal/sabzi and away from the grain.
const glycaemicPenalty = (glycaemicLoad, glycaemic) => (glycaemic ? 0.01 * Math.max(0, glycaemicLoad - 20) : 0);

const isGlycaemic = (profile) => GLYCAEMIC_CONDITIONS.some(c => (profile.healthConditions || []).includes(c));

const bestSingleScale = (recipe, targetKcal, targetProtein, glycaemic = false) => {
    let best = { scale: 1, score: Infinity };
    for (const scale of scaleOptions(recipe)) {
        const score = portionScore(recipe.nutrition.kcal * scale, recipe.nutrition.protein * scale, targetKcal, targetProtein)
            + 0.05 * (scale - 1) ** 2
            + glycaemicPenalty(recipe.glycaemicLoad * scale, glycaemic);
        if (score < best.score) best = { scale, score };
    }
    return best.scale;
};

const bestPlateScales = (main, staple, targetKcal, targetProtein, glycaemic = false) => {
    let best = { mainScale: 1, stapleCount: 1, score: Infinity };
    for (const mainScale of MAIN_SCALES) {
        for (const stapleCount of stapleCounts(staple)) {
            const kcal = main.nutrition.kcal * mainScale + staple.nutrition.kcal * stapleCount;
            const protein = main.nutrition.protein * mainScale + staple.nutrition.protein * stapleCount;
            const glycaemicLoad = main.glycaemicLoad * mainScale + staple.glycaemicLoad * stapleCount;
            const score = portionScore(kcal, protein, targetKcal, targetProtein) + 0.08 * (mainScale - 1) ** 2
                + glycaemicPenalty(glycaemicLoad, glycaemic);
            if (score < best.score) best = { mainScale, stapleCount, score };
        }
    }
    return best;
};

// ── Meal objects ──────────────────────────────────────────────────────────────

/**
 * Build the meal object the app stores and displays from portioned components.
 * Nutrition and ingredient weights are per person; `ingredients` (display strings)
 * are for the whole household so they can be cooked as written.
 * @param components [{ recipe, scale }] main first
 */
export const buildMeal = (components, profile, extra = {}) => {
    const cookFor = Math.max(1, parseInt(profile.servings, 10) || 1);
    const nutrition = Object.fromEntries(NUTRIENTS.map(n => [n, 0]));
    let glycaemicLoad = 0;
    let cost = 0;
    const allergens = new Set();
    const grams = new Map();
    const typedIngredients = [];
    let dietIndex = 0;

    for (const { recipe, scale } of components) {
        for (const n of NUTRIENTS) nutrition[n] += (recipe.nutrition[n] || 0) * scale;
        glycaemicLoad += recipe.glycaemicLoad * scale;
        cost += recipe.costInr * scale;
        recipe.allergens.forEach(a => allergens.add(a));
        dietIndex = Math.max(dietIndex, DIET_ORDER.indexOf(recipe.dietCategory));
        for (const item of recipe.ingredients) {
            grams.set(item.foodId, (grams.get(item.foodId) || 0) + (item.grams / recipe.servings) * scale);
        }
        // Custom recipes have typed ingredient lines instead of weighed catalogue items.
        typedIngredients.push(...(recipe.customIngredients || []));
    }

    // A combined meal is only Jain-safe (etc.) if every part is; a caution applies if any part has it.
    const flags = Object.fromEntries(SAFE_FLAGS.map(k => [k, components.every(c => Boolean(c.recipe.flags?.[k]))]));
    flags.goitrogen = components.some(c => Boolean(c.recipe.flags?.goitrogen));

    const [first, second] = components;
    const main = first.recipe;
    const portionLabel = components.map(c => describePortion(c.recipe.servingUnit, c.scale, c.recipe.name)).join(' + ');
    const ingredientItems = [...grams.entries()].map(([foodId, g]) => ({ foodId, grams: round1(g) }));
    const dietCategory = DIET_ORDER[dietIndex];
    const rounded = {
        calories: Math.round(nutrition.kcal),
        protein: Math.round(nutrition.protein),
        carbs: Math.round(nutrition.carbs),
        fat: Math.round(nutrition.fat),
    };

    const meal = {
        id: main.id,
        recipeId: main.id,
        name: second ? `${main.name} with ${shortName(second.recipe.name)}` : main.name,
        course: main.course,
        cuisine: main.cuisine,
        components: components.map(({ recipe, scale }) => ({
            id: recipe.id, name: recipe.name, course: recipe.course, scale,
            portionLabel: describePortion(recipe.servingUnit, scale, recipe.name),
        })),
        portionLabel,
        scaledServings: first.scale,
        servings: cookFor,
        prepTime: main.prepTime,
        cookTime: Math.max(main.cookTime, second?.recipe.cookTime || 0),
        difficulty: main.difficulty,
        tags: main.tags,
        imageUrl: main.imageUrl || null,
        ...rounded,
        nutrition: Object.fromEntries(NUTRIENTS.map(n => [n, round1(nutrition[n])])),
        glycaemicLoad: round1(glycaemicLoad),
        costInr: round1(cost),
        allergens: [...allergens].sort(),
        dietCategory,
        dietaryType: [dietCategory],
        flags,
        ingredientItems,
        ingredients: [...ingredientItems.map(i => formatQuantity(i.foodId, i.grams * cookFor)), ...typedIngredients],
        instructions: [
            ...main.instructions,
            ...(second ? second.recipe.instructions.map(step => `${shortName(second.recipe.name)}: ${step}`) : []),
        ],
        ...extra,
    };
    meal.warnings = healthWarnings({
        nutrition: meal.nutrition,
        glycaemicLoad: meal.glycaemicLoad,
        foodIds: ingredientItems.map(i => i.foodId),
        flags,
        allergens: meal.allergens,
    }, profile);
    return meal;
};

// ── Context and scoring ───────────────────────────────────────────────────────

/** Everything the planner needs about a user, computed once per plan. */
export const buildContext = (profile, recipes, { seed = Date.now() } = {}) => {
    const targets = profile.nutritionTargets || {};
    const targetKcal = targets.targetCalories || 2000;
    const targetProtein = targets.macros?.protein || Math.round(targetKcal * 0.15 / 4);
    const dislikedWords = parseDislikedFoods(profile.dislikedFoods);
    const allowed = recipes.filter(r => !rejectionReason(r, profile, { dislikedWords }));
    const conditions = profile.healthConditions || [];
    const region = profile.region || '';

    return {
        profile,
        targetKcal,
        targetProtein,
        allowed,
        staples: allowed.filter(r => r.course === 'staple'),
        cuisines: new Set([...(profile.cuisines || []), ...(STATE_CUISINES[region] || [])]),
        region,
        budgetPerDay: DAILY_BUDGET[profile.budget] || DAILY_BUDGET.medium,
        glycaemic: GLYCAEMIC_CONDITIONS.some(c => conditions.includes(c)),
        hypertension: conditions.includes('hypertension'),
        anaemia: conditions.includes('anemia'),
        rng: createRng(seed),
    };
};

const slotCandidates = (ctx, slot) => ctx.allowed.filter(r => r.course !== 'staple' && r.meals.includes(slot));

const per100 = (recipe, value) => (value / Math.max(recipe.nutrition.kcal, 1)) * 100;

/** Lower is better. `state` carries what the week has used so far. */
const scoreRecipe = (ctx, recipe, slot, state, { jitter = true } = {}) => {
    const { profile } = ctx;
    let score = 0;

    // Protein density compared with what the day needs. A main is diluted by its staple.
    const targetDensity = (ctx.targetProtein / ctx.targetKcal) * 100;
    let density = per100(recipe, recipe.nutrition.protein);
    if (recipe.course === 'main') density = 0.55 * density + 0.45 * 3;
    score += 3 * Math.max(0, targetDensity - density) / targetDensity;

    if (ctx.cuisines.has(recipe.cuisine)) score -= 0.6;
    if (recipe.regions.includes(ctx.region)) score -= 0.4;

    if (ctx.glycaemic) score += 0.12 * Math.max(0, per100(recipe, recipe.glycaemicLoad) - 6);
    // ICMR's 5 g salt a day is about 100 mg sodium per 100 kcal; most home cooking is 2-3x that.
    if (ctx.hypertension) score += 0.8 * Math.max(0, per100(recipe, recipe.nutrition.sodium) - 200) / 200;
    if (ctx.anaemia) score -= 0.1 * Math.min(per100(recipe, recipe.nutrition.iron), 3);

    // Cost of a slot-sized portion against the slot's share of the daily budget.
    const slotKcal = ctx.targetKcal * SLOT_SHARE[slot];
    const slotBudget = ctx.budgetPerDay * SLOT_SHARE[slot];
    const portionCost = (recipe.costInr / Math.max(recipe.nutrition.kcal, 1)) * slotKcal;
    if (portionCost > slotBudget) score += Math.min(2, 0.8 * (portionCost / slotBudget - 1));

    if (profile.cookingSkill === 'beginner' && recipe.difficulty === 'intermediate') score += 0.4;
    if (profile.cookingSkill === 'intermediate' && recipe.difficulty === 'advanced') score += 0.3;
    if (profile.mealPrepPreference === 'daily' && recipe.prepTime + recipe.cookTime > 45) score += 0.3;
    if (slot === 'dinner' && recipe.batchFriendly) {
        if (profile.mealPrepPreference === 'batch_3') score -= 0.3;
        if (profile.mealPrepPreference === 'batch_7') score -= 0.5;
    }

    // Variety across the week and within the day.
    const lastUsed = state.lastUsed.get(recipe.id);
    if (lastUsed !== undefined) score += state.day - lastUsed <= 2 ? 3 : 1;
    if (state.todayIds.has(recipe.id)) score += 3;
    if (state.todayCuisines.has(recipe.cuisine)) score += 0.3;

    if (jitter) score += ctx.rng() * 0.8;
    return score;
};

const chooseStaple = (ctx, main, state) => {
    let pool = ctx.staples.filter(s => main.pairs.includes(s.stapleGroup));
    if (!pool.length) pool = ctx.staples.filter(s => !['vrat', 'makki'].includes(s.stapleGroup));
    if (!pool.length) return null;

    let best = null;
    for (const staple of pool) {
        let score = ctx.rng() * 0.5;
        if (ctx.glycaemic) score += 0.15 * per100(staple, staple.glycaemicLoad);
        if (staple.stapleGroup === 'rice' && RICE_STATES.includes(ctx.region)) score -= 0.4;
        if (staple.stapleGroup === 'bhakri' && BHAKRI_STATES.includes(ctx.region)) score -= 0.4;
        if (staple.regions.includes(ctx.region)) score -= 0.2;
        if (state.lastStaple === staple.id) score += 0.5;
        if (!best || score < best.score) best = { staple, score };
    }
    return best.staple;
};

/** Portion a recipe (and a staple for mains) for one meal slot. */
export const portionMeal = (recipe, staple, targetKcal, targetProtein, profile, extra) => {
    const glycaemic = isGlycaemic(profile);
    if (recipe.course === 'main' && staple) {
        const { mainScale, stapleCount } = bestPlateScales(recipe, staple, targetKcal, targetProtein, glycaemic);
        return buildMeal([{ recipe, scale: mainScale }, { recipe: staple, scale: stapleCount }], profile, extra);
    }
    return buildMeal([{ recipe, scale: bestSingleScale(recipe, targetKcal, targetProtein, glycaemic) }], profile, extra);
};

// ── Day balancing ─────────────────────────────────────────────────────────────

export const dayTotals = (day) => {
    const totals = { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFibre: 0, totalSodium: 0, totalCost: 0 };
    for (const slot of SLOTS) {
        const meal = day[slot];
        if (!meal) continue;
        totals.totalCalories += meal.calories;
        totals.totalProtein += meal.protein;
        totals.totalCarbs += meal.carbs;
        totals.totalFat += meal.fat;
        totals.totalFibre += meal.nutrition?.fibre || 0;
        totals.totalSodium += meal.nutrition?.sodium || 0;
        totals.totalCost += meal.costInr || 0;
    }
    totals.totalFibre = Math.round(totals.totalFibre);
    totals.totalSodium = Math.round(totals.totalSodium);
    totals.totalCost = Math.round(totals.totalCost);
    return totals;
};

/** Every one-step portion change for a meal: main ±0.25 katori, staple ±1 unit, dish ±0.25. */
const portionMoves = (meal, recipesById, profile) => {
    const components = meal.components.map(c => ({ recipe: recipesById.get(c.id), scale: c.scale }));
    if (components.some(c => !c.recipe)) return [];
    const moves = [];
    components.forEach((component, index) => {
        const isStaple = component.recipe.course === 'staple';
        const count = unitCount(component.recipe.servingUnit);
        const step = isStaple ? stapleStep(component.recipe) : count > 1 ? 1 / count : 0.25;
        const min = isStaple ? step : count > 1 ? Math.ceil(count * 0.5) / count : 0.5;
        const max = isStaple ? (step < 1 ? 3 : 6) : maxScale(component.recipe);
        for (const delta of [-step, step]) {
            const scale = Math.round((component.scale + delta) * 1000) / 1000;
            if (scale < min - 1e-9 || scale > max + 1e-9) continue;
            const next = components.map((c, i) => (i === index ? { ...c, scale } : c));
            moves.push(() => buildMeal(next, profile, { leftover: meal.leftover, leftoverFrom: meal.leftoverFrom }));
        }
    });
    return moves;
};

const dayObjective = (totals, targetKcal, targetProtein) =>
    Math.abs(totals.totalCalories - targetKcal) / targetKcal
    + 0.8 * Math.max(0, targetProtein - totals.totalProtein) / targetProtein
    + (totals.totalCalories > targetKcal * (1 + DAY_TOLERANCE + 0.01) ? 1 : 0);

/** Greedy portion tweaks until the day is within tolerance of the targets. */
export const rebalanceDay = (day, ctx, recipesById) => {
    const current = { ...day };
    for (let iteration = 0; iteration < 16; iteration++) {
        const baseScore = dayObjective(dayTotals(current), ctx.targetKcal, ctx.targetProtein);
        let best = null;
        for (const slot of SLOTS) {
            if (!current[slot]) continue;
            for (const move of portionMoves(current[slot], recipesById, ctx.profile)) {
                const meal = move();
                const score = dayObjective(dayTotals({ ...current, [slot]: meal }), ctx.targetKcal, ctx.targetProtein);
                if (score < baseScore - 1e-6 && (!best || score < best.score)) best = { slot, meal, score };
            }
        }
        if (!best) break;
        current[best.slot] = best.meal;
    }
    return { ...current, ...dayTotals(current) };
};

// ── Week ──────────────────────────────────────────────────────────────────────

const recordUse = (state, meal) => {
    for (const component of meal.components) {
        if (component.course === 'staple') state.lastStaple = component.id;
        else {
            state.lastUsed.set(component.id, state.day);
            state.todayIds.add(component.id);
        }
    }
    state.todayCuisines.add(meal.cuisine);
};

const pickRecipe = (ctx, slot, state) => {
    const candidates = slotCandidates(ctx, slot);
    let best = null;
    for (const recipe of candidates) {
        if (recipe.course === 'main' && !ctx.staples.length && slot !== 'breakfast') continue;
        const score = scoreRecipe(ctx, recipe, slot, state);
        if (!best || score < best.score) best = { recipe, score };
    }
    return best?.recipe || null;
};

/**
 * @param profile   saved profile including nutritionTargets
 * @param recipes   engine-shaped recipes (see services/recipes.js)
 * @param options   startDate 'YYYY-MM-DD' (the user's local today), days, seed
 */
export const generateWeekPlan = (profile, recipes, { startDate, days = 7, seed = Date.now() } = {}) => {
    const ctx = buildContext(profile, recipes, { seed });
    const recipesById = new Map(recipes.map(r => [r.id, r]));
    const start = startDate || new Date().toISOString().slice(0, 10);
    const batchCooking = ['batch_3', 'batch_7'].includes(profile.mealPrepPreference);
    const state = { day: 0, lastUsed: new Map(), todayIds: new Set(), todayCuisines: new Set(), lastStaple: null };
    const plan = [];

    for (let d = 0; d < days; d++) {
        state.day = d;
        state.todayIds = new Set();
        state.todayCuisines = new Set();
        const date = addDays(start, d);
        const day = { day: weekdayOf(date), date };

        for (const slot of SLOTS) {
            const slotKcal = ctx.targetKcal * SLOT_SHARE[slot];
            const slotProtein = ctx.targetProtein * SLOT_SHARE[slot];

            // Cook once, eat twice: yesterday's dinner becomes today's lunch.
            const yesterdayDinner = plan[d - 1]?.dinner;
            if (slot === 'lunch' && batchCooking && yesterdayDinner && !yesterdayDinner.leftover) {
                const recipe = recipesById.get(yesterdayDinner.recipeId);
                if (recipe?.batchFriendly) {
                    const staple = recipe.course === 'main' ? chooseStaple(ctx, recipe, state) : null;
                    day.lunch = portionMeal(recipe, staple, slotKcal, slotProtein, profile, { leftover: true, leftoverFrom: plan[d - 1].date });
                    recordUse(state, day.lunch);
                    continue;
                }
            }

            const recipe = pickRecipe(ctx, slot, state);
            if (!recipe) { day[slot] = null; continue; }
            const staple = recipe.course === 'main' ? chooseStaple(ctx, recipe, state) : null;
            day[slot] = portionMeal(recipe, staple, slotKcal, slotProtein, profile);
            recordUse(state, day[slot]);
        }
        plan.push(rebalanceDay(day, ctx, recipesById));
    }
    return plan;
};

/** Ranked alternatives for one slot, each portioned to replace `currentMeal`. */
export const rankAlternatives = (profile, recipes, slot, currentMeal, { limit = 6 } = {}) => {
    const ctx = buildContext(profile, recipes, { seed: 1 });
    const state = { day: 0, lastUsed: new Map(), todayIds: new Set(), todayCuisines: new Set(), lastStaple: null };
    const targetKcal = currentMeal?.calories || ctx.targetKcal * SLOT_SHARE[slot];
    const targetProtein = Math.max(currentMeal?.protein || 0, ctx.targetProtein * SLOT_SHARE[slot]);
    const currentIds = new Set((currentMeal?.components || []).map(c => c.id));

    return slotCandidates(ctx, slot)
        .filter(r => !currentIds.has(r.id))
        .map(recipe => ({ recipe, score: scoreRecipe(ctx, recipe, slot, state, { jitter: false }) }))
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map(({ recipe }) => portionMeal(recipe, recipe.course === 'main' ? chooseStaple(ctx, recipe, state) : null, targetKcal, targetProtein, profile));
};

/** Replace one meal, portioned to the calories of the meal it replaces. */
export const swapMeal = (day, slot, recipe, profile, recipes) => {
    const ctx = buildContext(profile, recipes, { seed: Date.now() });
    const state = { day: 0, lastUsed: new Map(), todayIds: new Set(), todayCuisines: new Set(), lastStaple: null };
    const current = day[slot];
    const targetKcal = current?.calories || ctx.targetKcal * SLOT_SHARE[slot];
    const targetProtein = current?.protein || ctx.targetProtein * SLOT_SHARE[slot];
    const staple = recipe.course === 'main' ? chooseStaple(ctx, recipe, state) : null;
    const updated = { ...day, [slot]: portionMeal(recipe, staple, targetKcal, targetProtein, profile) };
    return { ...updated, ...dayTotals(updated) };
};

/** Display name for a food, for shopping lists. */
export const foodName = (foodId) => getFood(foodId).name;
