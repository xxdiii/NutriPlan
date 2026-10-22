// A user's food prices (city tier and month), their pantry, and recipes costed with both.
import { prisma } from '../lib/prisma.js';
import { applyPrices, buildPriceRows, priceTable } from '../engine/cost.js';
import { loadRecipesForUser } from './recipes.js';

// Prices only change when the seed script runs, so the rows are cached.
let rowsCache = null;

const priceRows = async () => {
    if (!rowsCache) {
        const rows = await prisma.ingredientPrice.findMany();
        rowsCache = rows.length ? rows : buildPriceRows();
    }
    return rowsCache;
};

const monthOf = (date) => Number(String(date || '').slice(5, 7)) || new Date().getMonth() + 1;

/**
 * Price table for a profile's city tier in the month of `date`.
 * @param date  'YYYY-MM-DD' (defaults to now)
 */
export const pricesFor = async (profile, date) =>
    priceTable({ tier: profile?.priceTier || 'metro', month: monthOf(date), rows: await priceRows() });

/** Curated and custom recipes with costs for the user's prices. */
export const loadPricedRecipes = async (userId, profile, date) =>
    applyPrices(await loadRecipesForUser(userId), await pricesFor(profile, date));

/** Map foodId -> { grams, expiresOn } */
export const loadPantry = async (userId) => {
    const rows = await prisma.pantryItem.findMany({ where: { userId } });
    return new Map(rows.map(r => [r.foodId, { grams: r.grams, expiresOn: r.expiresOn }]));
};

const DAY_MS = 86400000;
// Pantry items expiring within this many days of the plan start are "use it up first".
export const USE_UP_WINDOW_DAYS = 5;

/**
 * Pantry items to use up: Map foodId -> last plan-day index before they expire.
 * @param startDate  first day of the plan, 'YYYY-MM-DD'
 */
export const useUpMap = (pantry, startDate) => {
    const start = Date.parse(`${startDate}T00:00:00Z`);
    const map = new Map();
    for (const [foodId, { expiresOn }] of pantry) {
        if (!expiresOn) continue;
        const days = Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - start) / DAY_MS);
        if (days >= 0 && days < USE_UP_WINDOW_DAYS) map.set(foodId, days);
    }
    return map;
};
