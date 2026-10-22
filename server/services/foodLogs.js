// FoodLog storage helpers shared by the logs routes, meal tracking and the adaptive engine.
import { prisma } from '../lib/prisma.js';
import { parseJson } from '../lib/auth.js';
import { FOOD_TABLE } from '../engine/nutrition.js';
import { buildCatalogue, sumNutrition } from '../engine/foodMatch.js';
import { loadRecipesForUser } from './recipes.js';

export const LOG_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];
export const LOG_SOURCES = ['plan', 'photo', 'text', 'manual'];
const TOTAL_FIELDS = ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sugar', 'sodium'];

/** Curated recipes, the user's own recipes and ready-to-eat foods. */
export const userCatalogue = async (userId) => buildCatalogue(await loadRecipesForUser(userId), FOOD_TABLE.values());

const totalsOf = (items) => {
    const sum = sumNutrition(items);
    return Object.fromEntries(TOTAL_FIELDS.map(f => [f, sum[f]]));
};

export const toLogResponse = (row) => ({
    id: row.id,
    date: row.date,
    slot: row.slot,
    source: row.source,
    items: parseJson(row.items, []),
    totals: Object.fromEntries(TOTAL_FIELDS.map(f => [f, row[f]])),
    note: row.note,
    createdAt: row.createdAt,
});

/** Store items that were already resolved against the catalogue. */
export const createLog = (userId, { date, slot, source, items, note = null }) =>
    prisma.foodLog.create({
        data: {
            userId, date, slot, source, note,
            // Unit options are only for the confirmation card.
            items: JSON.stringify(items.map(item => ({ ...item, unitOptions: undefined }))),
            ...totalsOf(items),
        },
    });

/**
 * Keep "plan" logs in step with meal tracking: a meal marked eaten is logged with the
 * planned portions; any other status removes that slot's plan log.
 * @param meals { breakfast: 'eaten' | 'skipped' | 'other' | null, ... }
 */
export const syncPlanLogs = async (userId, date, meals) => {
    const plan = await prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const day = plan ? parseJson(plan.planData, {}).plan?.find(d => d.date === date) : null;
    const existing = await prisma.foodLog.findMany({ where: { userId, date, source: 'plan' } });

    for (const slot of LOG_SLOTS) {
        const current = existing.filter(l => l.slot === slot);
        const meal = day?.[slot];
        // Eating-out meals are only a calorie budget; the user logs what they actually ate.
        if (meals?.[slot] !== 'eaten' || !meal || meal.eatingOut) {
            if (current.length) await prisma.foodLog.deleteMany({ where: { id: { in: current.map(l => l.id) } } });
            continue;
        }
        if (current.length) continue;
        // The planned meal's nutrition was itself computed from the recipes by the planner.
        const items = [{
            kind: 'plan',
            refId: meal.recipeId,
            name: meal.name,
            quantity: 1,
            unit: 'serving',
            portionLabel: meal.portionLabel,
            components: meal.components,
            nutrition: meal.nutrition,
        }];
        await createLog(userId, { date, slot, source: 'plan', items });
    }
};

/** Per-day totals: { 'YYYY-MM-DD': { kcal, protein, ..., slots: [...], entries } } */
export const dailyTotals = (rows) => {
    const days = {};
    for (const row of rows) {
        const day = days[row.date] || (days[row.date] = { ...Object.fromEntries(TOTAL_FIELDS.map(f => [f, 0])), slots: [], entries: 0 });
        for (const f of TOTAL_FIELDS) day[f] = Math.round((day[f] + row[f]) * 10) / 10;
        if (!day.slots.includes(row.slot)) day.slots.push(row.slot);
        day.entries++;
    }
    return days;
};

export const logsBetween = (userId, from, to) =>
    prisma.foodLog.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
