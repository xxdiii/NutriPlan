// Weekly shopping list from a plan's weighed ingredients, scaled to the household,
// minus what is in the pantry, rounded up to packs you can buy and priced for the user.
import { getFood } from './nutrition.js';
import { SLOTS } from './planner.js';
import { COUNTED, LOOSE_STEP, packSizes } from '../data/packs.js';

// Shopping list sections used by the browser (src/components/shopping/ShoppingList.jsx).
const CATEGORY_BY_GROUP = {
    cereal: 'grains', pulse: 'proteins', egg: 'proteins', meat: 'proteins', fish: 'proteins',
    dairy: 'dairy', green_leafy: 'vegetables', vegetable: 'vegetables', root_tuber: 'vegetables',
    fruit: 'fruits', nut_seed: 'others', oil_fat: 'oils', sugar: 'others', spice: 'spices', other: 'others',
};
const LIQUIDS = new Set(['milk', 'oil', 'mustard_oil', 'coconut_oil', 'sesame_oil', 'olive_oil', 'coconut_milk', 'coconut_water', 'lemon']);
export const CATEGORIES = ['vegetables', 'fruits', 'proteins', 'dairy', 'grains', 'spices', 'oils', 'others'];
// Packs of these last well beyond a week, so most of what you buy is a restock.
const LONG_LIFE_GROUPS = new Set(['cereal', 'pulse', 'spice', 'oil_fat', 'sugar', 'nut_seed']);

const metricUnits = (foodId) => (LIQUIDS.has(foodId) ? ['ml', 'L'] : ['g', 'kg']);

/** "450 g", "1.5 kg", "750 ml" */
export const formatWeight = (foodId, grams) => {
    const [small, large] = metricUnits(foodId);
    if (grams >= 1000) return `${Number((grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1))} ${large}`;
    return `${Math.round(grams)} ${small}`;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : word.endsWith('o') ? 'es' : 's'}`;

/** How much a recipe needs, in words: "3 tomatoes", "450 g", "1.2 kg". */
const describeAmount = (foodId, grams) => {
    const food = getFood(foodId);
    if (food.unit && grams >= food.unit.grams * 0.75) return plural(Math.ceil(grams / food.unit.grams), food.unit.name);
    if (grams >= 100) return formatWeight(foodId, Math.ceil(grams / 50) * 50);
    if (grams >= 10) return formatWeight(foodId, Math.ceil(grams / 5) * 5);
    return formatWeight(foodId, Math.max(1, Math.round(grams)));
};

/**
 * Cheapest-to-waste combination of packs covering `need`; ties go to fewer packs.
 * @returns [{ size, count }] largest first
 */
export const choosePacks = (sizes, need) => {
    if (need <= 0) return [];
    const sorted = [...sizes].sort((a, b) => b - a);
    let best = null;
    const search = (i, remaining, counts) => {
        if (i === sorted.length - 1) {
            const all = [...counts, Math.max(0, Math.ceil(remaining / sorted[i]))];
            const total = all.reduce((sum, n, k) => sum + n * sorted[k], 0);
            const packs = all.reduce((sum, n) => sum + n, 0);
            if (!best || total < best.total || (total === best.total && packs < best.packs)) best = { all, total, packs };
            return;
        }
        for (let n = 0; n <= Math.ceil(remaining / sorted[i]); n++) search(i + 1, remaining - n * sorted[i], [...counts, n]);
    };
    search(0, need, []);
    return best.all.map((count, k) => ({ size: sorted[k], count })).filter(p => p.count > 0);
};

/**
 * What to buy for `need` grams of a food.
 * @returns { label, grams, leftover }
 */
export const buyFor = (foodId, need) => {
    const food = getFood(foodId);
    const counted = COUNTED[foodId];
    if (counted) {
        const pieces = Math.ceil(need / counted.gramsEach);
        const packs = choosePacks(counted.packs, pieces);
        const total = packs.reduce((sum, p) => sum + p.size * p.count, 0);
        const label = counted.packs.length === 1
            ? plural(total, counted.name)
            : packs.map(p => (p.count === 1 ? `${p.size} ${counted.name}s` : `${p.count} × ${p.size} ${counted.name}s`)).join(' + ');
        return { label, grams: total * counted.gramsEach, leftover: Math.round(total * counted.gramsEach - need) };
    }
    const sizes = packSizes(foodId, food.group);
    if (!sizes) {
        // Loose: rounded up to 250 g, shown as a count for foods sold by the piece.
        const grams = Math.ceil(need / LOOSE_STEP) * LOOSE_STEP;
        const label = food.unit && need >= food.unit.grams * 0.75
            ? `${plural(Math.ceil(need / food.unit.grams), food.unit.name)} (about ${formatWeight(foodId, grams)})`
            : formatWeight(foodId, grams);
        return { label, grams, leftover: Math.round(grams - need) };
    }
    const packs = choosePacks(sizes, need);
    const grams = packs.reduce((sum, p) => sum + p.size * p.count, 0);
    const label = packs.map(p => (p.count === 1 ? formatWeight(foodId, p.size) : `${p.count} × ${formatWeight(foodId, p.size)}`)).join(' + ');
    return { label, grams, leftover: Math.round(grams - need) };
};

/**
 * @param plan     array of days from the planner (per-person ingredient weights)
 * @param cookFor  number of people
 * @param prices   price table from engine/cost.js (Map foodId -> { price, inSeason })
 * @param pantry   Map foodId -> { grams: number | null, expiresOn }; null grams = "have enough"
 */
export const buildShoppingList = (plan, cookFor = 1, { prices = null, pantry = new Map() } = {}) => {
    const totals = new Map();
    for (const day of plan) {
        for (const slot of SLOTS) {
            const meal = day[slot];
            if (!meal?.ingredientItems) continue;
            for (const { foodId, grams } of meal.ingredientItems) {
                const entry = totals.get(foodId) || { grams: 0, meals: [] };
                entry.grams += grams * cookFor;
                entry.meals.push(`${day.day} ${slot}`);
                totals.set(foodId, entry);
            }
        }
    }

    const byCategory = Object.fromEntries(CATEGORIES.map(c => [c, []]));
    let buyTotal = 0;
    let usedTotal = 0;
    let staplesTotal = 0;
    for (const [foodId, { grams, meals }] of totals) {
        const food = getFood(foodId);
        const priceInfo = prices?.get(foodId);
        const pricePerKg = priceInfo?.price ?? food.price ?? null;
        const held = pantry.get(foodId);
        const need = held ? (held.grams === null ? 0 : Math.max(0, grams - held.grams)) : grams;
        const status = need <= 0 ? 'in_pantry' : need < grams ? 'partial' : 'buy';
        const buy = need > 0 ? buyFor(foodId, need) : null;
        const usedCost = pricePerKg ? Math.round((grams / 1000) * pricePerKg) : null;
        const buyCost = buy && pricePerKg ? Math.round((buy.grams / 1000) * pricePerKg) : 0;
        buyTotal += buyCost;
        if (LONG_LIFE_GROUPS.has(food.group)) staplesTotal += buyCost;
        usedTotal += usedCost || 0;
        const amount = describeAmount(foodId, grams);

        byCategory[CATEGORY_BY_GROUP[food.group] || 'others'].push({
            foodId,
            name: food.name,
            grams: Math.round(grams),
            amount,
            display: buy ? `${buy.label} ${food.name}` : `${food.name} (in your pantry)`,
            original: `${amount} ${food.name}`,
            status,
            needGrams: Math.round(need),
            pantry: held ? { grams: held.grams, expiresOn: held.expiresOn || null } : null,
            buy: buy ? { ...buy, costInr: buyCost } : null,
            costInr: usedCost,
            pricePerKg,
            inSeason: priceInfo ? priceInfo.inSeason : true,
            count: new Set(meals).size,
            meals,
        });
    }
    for (const items of Object.values(byCategory)) items.sort((a, b) => a.name.localeCompare(b.name));

    const allIngredients = Object.values(byCategory).flat();
    const days = Math.max(plan.length, 1);
    return {
        byCategory,
        allIngredients,
        totalItems: allIngredients.length,
        toBuy: allIngredients.filter(i => i.status !== 'in_pantry').length,
        cost: {
            // What you pay at the shop (whole packs) vs the food the plan actually uses.
            total: buyTotal,
            used: usedTotal,
            // Part of `total` spent on long-life staples (grains, dals, spices, oil...).
            staples: staplesTotal,
            perDay: Math.round(usedTotal / days),
            perPersonPerDay: Math.round(usedTotal / days / cookFor),
            cookFor,
            note: 'Prices: government (DoCA) averages for staples, estimates for the rest; your local prices will differ.',
        },
    };
};

/** Plain-text list for WhatsApp or the clipboard, grouped by aisle. */
export const shoppingListText = (list, { title = 'NutriPlan shopping list' } = {}) => {
    const lines = [`*${title}*`];
    for (const category of CATEGORIES) {
        const items = (list.byCategory[category] || []).filter(i => i.status !== 'in_pantry');
        if (!items.length) continue;
        lines.push('', `*${category[0].toUpperCase()}${category.slice(1)}*`);
        for (const item of items) lines.push(`- ${item.display}`);
    }
    if (list.cost.total) lines.push('', `Approx. ₹${list.cost.total.toLocaleString('en-IN')}`);
    return lines.join('\n');
};
