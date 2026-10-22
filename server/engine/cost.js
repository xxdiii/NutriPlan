// Food costs for a user's city tier and month (F5): price tables, recipe cost from
// ingredient weights, and ₹ per 10 g of protein. Pure functions.
import { FOOD_TABLE, analyseRecipe, allowedDietCategories } from './nutrition.js';
import { DOCA, METRO_PREMIUM, TIER2_FACTOR, DEFAULT_TIER2_FACTOR, PRICE_TIERS, SEASONS, OFF_SEASON_MARKUP } from '../data/prices.js';

const round1 = (n) => Math.round(n * 10) / 10;

/** Price rows for every priced food and tier, as stored in IngredientPrice. */
export const buildPriceRows = () => {
    const rows = [];
    for (const food of FOOD_TABLE.values()) {
        if (!food.price) continue;
        const doca = DOCA.prices[food.key];
        for (const tier of PRICE_TIERS) {
            if (doca) {
                rows.push({
                    foodId: food.key,
                    tier,
                    priceInr: round1(tier === 'metro' ? doca * METRO_PREMIUM : doca),
                    source: tier === 'metro' ? `${DOCA.source}; metro +${Math.round((METRO_PREMIUM - 1) * 100)}% estimate` : DOCA.source,
                    asOf: DOCA.date,
                });
            } else {
                const factor = tier === 'metro' ? 1 : TIER2_FACTOR[food.group] ?? DEFAULT_TIER2_FACTOR;
                rows.push({
                    foodId: food.key,
                    tier,
                    priceInr: round1(food.price * factor),
                    source: tier === 'metro' ? 'Estimate: metro retail 2025-26' : `Estimate: metro × ${factor}`,
                    asOf: null,
                });
            }
        }
    }
    return rows;
};

/** Whether fresh produce is in season in a month (1-12). Unlisted foods always are. */
export const inSeason = (foodId, month) => !SEASONS[foodId] || SEASONS[foodId].includes(month);

/**
 * ₹/kg for each food in one tier and month.
 * @param rows   IngredientPrice rows (defaults to the built-in table)
 * @returns Map foodId -> { price, inSeason, source }
 */
export const priceTable = ({ tier = 'metro', month = new Date().getMonth() + 1, rows = buildPriceRows() } = {}) => {
    const table = new Map();
    const useTier = PRICE_TIERS.includes(tier) ? tier : 'metro';
    for (const row of rows) {
        if (row.tier !== useTier) continue;
        const seasonal = inSeason(row.foodId, month);
        table.set(row.foodId, {
            price: round1(seasonal ? row.priceInr : row.priceInr * OFF_SEASON_MARKUP),
            inSeason: seasonal,
            source: row.source,
        });
    }
    return table;
};

/** Cost of one serving from ingredient weights (custom recipes keep their own figure). */
export const recipeCost = (recipe, table) => {
    if (!recipe.ingredients?.length) return recipe.costInr || 0;
    let cost = 0;
    for (const { foodId, grams } of recipe.ingredients) cost += (grams / 1000) * (table.get(foodId)?.price || 0);
    return cost / recipe.servings;
};

/** Recipes with `costInr` recalculated for the user's prices. */
export const applyPrices = (recipes, table) => recipes.map(recipe => ({ ...recipe, costInr: round1(recipeCost(recipe, table)) }));

/** ₹ per 10 g protein, or null when there is too little protein for it to mean much. */
export const costPer10gProtein = (cost, protein) => (protein >= 2 ? round1((cost / protein) * 10) : null);

// Everyday protein sources people compare, from soya and dal to paneer and meat.
const PROTEIN_FOODS = ['soya_chunks', 'masoor_dal', 'toor_dal', 'moong_dal', 'kala_chana', 'rajma', 'peanuts', 'egg', 'milk', 'curd', 'paneer', 'tofu', 'chicken', 'rohu', 'mutton'];

/**
 * Everyday protein sources ranked by ₹ per 10 g protein, limited to what the user can eat.
 * @param profile  dietaryPreference and allergies
 */
export const proteinForMoney = (table, profile = {}) => {
    const allowed = allowedDietCategories(profile.dietaryPreference || 'non_veg');
    const allergies = profile.allergies || [];
    return PROTEIN_FOODS
        .map(key => FOOD_TABLE.get(key))
        .filter(food => food && table.has(food.key) && food.per100.protein > 0)
        .filter(food => {
            const { dietCategory, allergens } = analyseRecipe([{ food: food.key, grams: 100 }], 1);
            return allowed.includes(dietCategory) && !allergens.some(a => allergies.includes(a));
        })
        .map(food => ({
            foodId: food.key,
            name: food.name,
            proteinPer100g: food.per100.protein,
            pricePerKg: table.get(food.key).price,
            // price/kg ÷ protein per kg × 10 g
            per10gProtein: round1(table.get(food.key).price / food.per100.protein),
        }))
        .sort((a, b) => a.per10gProtein - b.per10gProtein);
};
