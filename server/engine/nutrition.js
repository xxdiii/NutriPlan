// Recipe nutrition, allergens, diet category and dietary flags, all derived from
// ingredient weights and the food catalogue. Nothing here is typed in by hand.
import { createRequire } from 'node:module';
import { FOODS } from '../data/foods.js';
import { metroOverride } from '../data/prices.js';

const require = createRequire(import.meta.url);
const ifct = require('../data/ifct-foods.json');

export const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar', 'sodium', 'iron', 'calcium', 'vitC', 'folate'];

// Carbohydrate-rich foods without a published GI estimate count with this GI.
const DEFAULT_GI = 55;
const STARCHY_CARBS_PER_100G = 15;

const buildFoodTable = () => {
    const table = new Map();
    for (const [key, name, source, group, opts = {}] of FOODS) {
        if (table.has(key)) throw new Error(`Duplicate food key: ${key}`);
        const fromIfct = typeof source === 'string';
        const per100 = fromIfct ? ifct.foods[source] : source;
        if (!per100) throw new Error(`No nutrient data for ${key} (${source})`);
        table.set(key, {
            key,
            name,
            source: fromIfct ? `IFCT 2017 ${source}` : source.ref,
            group,
            per100: Object.fromEntries(NUTRIENTS.map(n => [n, per100[n] || 0])),
            allergens: opts.allergens || [],
            animal: opts.animal || null,
            flags: opts.flags || [],
            gi: opts.gi ?? null,
            // Metro ₹/kg: government (DoCA) prices where published, otherwise the estimate in foods.js.
            price: metroOverride(key) ?? opts.price ?? null,
            unit: opts.unit ? { name: opts.unit[0], grams: opts.unit[1] } : null,
        });
    }
    return table;
};

export const FOOD_TABLE = buildFoodTable();

export const getFood = (key) => {
    const food = FOOD_TABLE.get(key);
    if (!food) throw new Error(`Unknown food: ${key}`);
    return food;
};

// Most restrictive diet the recipe satisfies, from least to most permissive.
export const DIET_ORDER = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'non_veg'];

const dietCategoryFor = (animals) => {
    if (animals.has('meat')) return 'non_veg';
    if (animals.has('fish') || animals.has('shellfish')) return 'pescatarian';
    if (animals.has('egg')) return 'eggetarian';
    if (animals.has('dairy') || animals.has('honey')) return 'vegetarian';
    return 'vegan';
};

/** Diet categories a person following `diet` may eat. */
export const allowedDietCategories = (diet) => {
    const index = DIET_ORDER.indexOf(diet);
    return index === -1 ? DIET_ORDER : DIET_ORDER.slice(0, index + 1);
};

const round = (value, digits = 0) => {
    const f = 10 ** digits;
    return Math.round(value * f) / f;
};

/**
 * @param {Array<{food: string, grams: number}>} items  ingredient weights for the whole recipe
 * @param {number} servings                              servings the recipe makes
 * @returns per-serving nutrients, glycaemic load and cost, plus allergens, diet and flags
 */
export const analyseRecipe = (items, servings = 1) => {
    const totals = Object.fromEntries(NUTRIENTS.map(n => [n, 0]));
    let glycaemicLoad = 0;
    let cost = 0;
    const allergens = new Set();
    const animals = new Set();
    const flags = new Set();
    let allVrat = items.length > 0;

    for (const { food: key, grams } of items) {
        const food = getFood(key);
        const factor = grams / 100;
        for (const n of NUTRIENTS) totals[n] += food.per100[n] * factor;

        const carbs = food.per100.carbs * factor;
        const gi = food.gi ?? (food.per100.carbs >= STARCHY_CARBS_PER_100G ? DEFAULT_GI : null);
        if (gi !== null) glycaemicLoad += carbs * gi / 100;
        if (food.price) cost += (grams / 1000) * food.price;

        food.allergens.forEach(a => allergens.add(a));
        if (food.animal) animals.add(food.animal);
        food.flags.forEach(f => flags.add(f));
        if (!food.flags.includes('vrat')) allVrat = false;
    }

    const dietCategory = dietCategoryFor(animals);
    const vegetarian = DIET_ORDER.indexOf(dietCategory) <= 1;
    const perServing = Object.fromEntries(NUTRIENTS.map(n => [n, totals[n] / servings]));

    return {
        nutrition: {
            kcal: round(perServing.kcal),
            protein: round(perServing.protein, 1),
            carbs: round(perServing.carbs, 1),
            fat: round(perServing.fat, 1),
            fibre: round(perServing.fibre, 1),
            sugar: round(perServing.sugar, 1),
            sodium: round(perServing.sodium),
            iron: round(perServing.iron, 1),
            calcium: round(perServing.calcium),
            vitC: round(perServing.vitC, 1),
            folate: round(perServing.folate),
        },
        glycaemicLoad: round(glycaemicLoad / servings, 1),
        costInr: round(cost / servings, 1),
        allergens: [...allergens].sort(),
        dietCategory,
        flags: {
            noOnionGarlic: !flags.has('allium'),
            jainSafe: vegetarian && !flags.has('root') && !flags.has('allium') && !flags.has('mushroom') && !animals.has('honey'),
            sattvic: vegetarian && !flags.has('allium') && !flags.has('mushroom'),
            vratSafe: allVrat,
            glutenFree: !allergens.has('wheat'),
            goitrogen: flags.has('goitrogen'),
        },
    };
};

/** "120 g toor dal", "2 eggs", "1 tomato" */
export const formatQuantity = (key, grams) => {
    const food = getFood(key);
    if (food.unit) {
        const count = grams / food.unit.grams;
        if (count >= 0.5 && Math.abs(count * 2 - Math.round(count * 2)) < 0.15) {
            const n = Math.round(count * 2) / 2;
            const label = n === 1 ? food.unit.name : `${food.unit.name}${food.unit.name.endsWith('o') ? 'es' : 's'}`;
            // Units like "slice" need the food name; "2 eggs" does not.
            const suffix = food.name.toLowerCase().includes(food.unit.name) ? '' : ` ${food.name.toLowerCase()}`;
            return `${n} ${label}${suffix}`;
        }
    }
    const g = grams >= 20 ? Math.round(grams / 5) * 5 : Math.round(grams * 2) / 2;
    return `${g} g ${food.name.toLowerCase()}`;
};
