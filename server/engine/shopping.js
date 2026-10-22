// Weekly shopping list from a plan's weighed ingredients, scaled to the household.
import { getFood } from './nutrition.js';
import { SLOTS } from './planner.js';

// Shopping list sections used by the browser (src/components/shopping/ShoppingList.jsx).
const CATEGORY_BY_GROUP = {
    cereal: 'grains', pulse: 'proteins', egg: 'proteins', meat: 'proteins', fish: 'proteins',
    dairy: 'dairy', green_leafy: 'vegetables', vegetable: 'vegetables', root_tuber: 'vegetables',
    fruit: 'fruits', nut_seed: 'others', oil_fat: 'oils', sugar: 'others', spice: 'spices', other: 'others',
};
const LIQUIDS = new Set(['milk', 'oil', 'mustard_oil', 'coconut_oil', 'sesame_oil', 'olive_oil', 'coconut_milk', 'coconut_water', 'lemon']);
const CATEGORIES = ['vegetables', 'fruits', 'proteins', 'dairy', 'grains', 'spices', 'oils', 'others'];

const describeAmount = (foodId, grams) => {
    const food = getFood(foodId);
    if (food.unit && grams >= food.unit.grams * 0.75) {
        const count = Math.ceil(grams / food.unit.grams);
        return `${count} ${food.unit.name}${count === 1 ? '' : food.unit.name.endsWith('o') ? 'es' : 's'}`;
    }
    const metric = LIQUIDS.has(foodId) ? ['ml', 'L'] : ['g', 'kg'];
    if (grams >= 1000) return `${(grams / 1000).toFixed(grams >= 10000 ? 0 : 1)} ${metric[1]}`;
    if (grams >= 100) return `${Math.ceil(grams / 50) * 50} ${metric[0]}`;
    if (grams >= 10) return `${Math.ceil(grams / 5) * 5} ${metric[0]}`;
    return `${Math.max(1, Math.round(grams))} ${metric[0]}`;
};

/**
 * @param plan     array of days from the planner (per-person ingredient weights)
 * @param cookFor  number of people
 */
export const buildShoppingList = (plan, cookFor = 1) => {
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
    let totalCost = 0;
    for (const [foodId, { grams, meals }] of totals) {
        const food = getFood(foodId);
        const amount = describeAmount(foodId, grams);
        const costInr = food.price ? Math.round((grams / 1000) * food.price) : null;
        if (costInr) totalCost += costInr;
        byCategory[CATEGORY_BY_GROUP[food.group] || 'others'].push({
            foodId,
            name: food.name,
            grams: Math.round(grams),
            amount,
            display: `${amount} ${food.name}`,
            original: `${amount} ${food.name}`,
            costInr,
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
        cost: {
            total: totalCost,
            perDay: Math.round(totalCost / days),
            perPersonPerDay: Math.round(totalCost / days / cookFor),
            cookFor,
            note: 'Approximate metro retail prices; your local prices will differ.',
        },
    };
};
