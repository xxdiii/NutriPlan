// Tools the AI coach can call, bound to one user. Read-only tools return compact data;
// proposing tools compute the change with the engine and return it as a proposal that
// the user applies (or dismisses) in the app. Nothing here writes to the database.
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { parseJson } from '../lib/auth.js';
import { loadProfile } from '../routes/profile.js';
import { loadRecipesForUser } from './recipes.js';
import { userCatalogue, logsBetween, dailyTotals, toLogResponse } from './foodLogs.js';
import { runCheckIn } from './adaptiveCheckIn.js';
import { matchParsedItem, sumNutrition } from '../engine/foodMatch.js';
import { diffDays, findRecipes, mealSummary, planEatOutDays, planEventDay, planFreshDays, planSwap } from '../engine/coachActions.js';
import { SLOTS } from '../engine/planner.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 7;

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const weekday = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

/** Fingerprint of a plan day, so applying a proposal can tell if the day changed since. */
export const dayHash = (day) => createHash('sha1').update(JSON.stringify(day)).digest('hex');

const compactDay = (day) => ({
    date: day.date,
    weekday: weekday(day.date),
    meals: Object.fromEntries(SLOTS.map(slot => [slot, mealSummary(day[slot])])),
    total_kcal: Math.round(day.totalCalories || 0),
    total_protein: Math.round(day.totalProtein || 0),
});

/** Lazily loaded data for one coach turn. */
const createLoader = (userId) => {
    const cache = {};
    const once = (key, fn) => (cache[key] ??= fn());
    return {
        profile: () => once('profile', () => loadProfile(userId)),
        planRow: () => once('plan', () => prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })),
        recipes: () => once('recipes', () => loadRecipesForUser(userId)),
        catalogue: () => once('catalogue', () => userCatalogue(userId)),
    };
};

const requireDate = (value, today) => (ISO_DATE.test(value || '') ? value : today);

/** Meals already eaten (or replaced by something else) per date; the coach never changes them. */
const lockedSlots = async (userId, start, end) => {
    const rows = await prisma.compliance.findMany({ where: { userId, date: { gte: start, lte: end } } });
    return Object.fromEntries(rows.map(r => {
        const meals = parseJson(r.meals, {}).meals || {};
        return [r.date, SLOTS.filter(slot => meals[slot] === 'eaten' || meals[slot] === 'other')];
    }));
};

/**
 * Plan days in [start, end] from the latest plan.
 * @returns { row, planData, days } or throws a message the model can relay
 */
const planDays = async (data, start, end = start) => {
    const row = await data.planRow();
    if (!row) throw new Error('The user has no meal plan yet. Suggest generating one on the Meal Plan page.');
    const planData = parseJson(row.planData, {});
    const days = (planData.plan || []).filter(d => d.date >= start && d.date <= end);
    if (!days.length) {
        const dates = (planData.plan || []).map(d => d.date);
        throw new Error(`The plan covers ${dates[0]} to ${dates[dates.length - 1]}; ${start}${end !== start ? ` to ${end}` : ''} is not in it.`);
    }
    return { row, planData, days };
};

const planProposal = ({ action, title, summary, row, before, after }) => {
    const changes = diffDays(before, after);
    if (!changes.length) throw new Error('That would not change the plan.');
    return {
        result: { prepared: title, changes },
        proposal: {
            kind: 'plan',
            action,
            title,
            summary,
            status: 'pending',
            changes,
            payload: { planId: row.id, days: after, beforeHashes: Object.fromEntries(before.map(d => [d.date, dayHash(d)])) },
        },
    };
};

/**
 * @param userId
 * @param today  the user's local date, YYYY-MM-DD
 */
export const createCoachTools = (userId, today) => {
    const data = createLoader(userId);

    return {
        async get_plan({ start_date, days = 3 }) {
            const start = requireDate(start_date, today);
            const count = Math.min(MAX_DAYS, Math.max(1, parseInt(days, 10) || 3));
            const { days: found } = await planDays(data, start, addDays(start, count - 1));
            return { result: { days: found.map(compactDay) } };
        },

        async get_food_log({ date }) {
            const day = requireDate(date, today);
            const [logs, profile] = await Promise.all([logsBetween(userId, day, day), data.profile()]);
            const totals = dailyTotals(logs)[day] || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
            return {
                result: {
                    date: day,
                    entries: logs.map(toLogResponse).map(l => ({
                        slot: l.slot,
                        source: l.source,
                        items: l.items.map(i => `${i.name} (${i.portionLabel || `${i.quantity} ${i.unit}`}, ${Math.round(i.nutrition.kcal)} kcal)`),
                    })),
                    totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) },
                    target: { kcal: profile?.nutritionTargets?.targetCalories, macros: profile?.nutritionTargets?.macros },
                },
            };
        },

        async explain_target() {
            const { profile, result } = await runCheckIn(userId, today);
            if (!profile) throw new Error('The user has not completed their profile.');
            const t = profile.nutritionTargets;
            return {
                result: {
                    target_kcal: t.targetCalories,
                    macros_g: t.macros,
                    maintenance_used: t.tdee,
                    maintenance_source: t.tdeeSource === 'adaptive' ? 'adaptive (from logged intake and weight trend)' : 'Mifflin-St Jeor formula',
                    formula_maintenance: t.formulaTdee ?? t.tdee,
                    bmr: t.bmr,
                    goal: t.goal,
                    goal_adjustment_kcal: t.adjustment,
                    weekly_rate_goal_kg: profile.targetRate,
                    macro_profile: t.macroProfile,
                    notes: t.notes,
                    weekly_check_in: {
                        status: result.status,
                        due: result.due,
                        observed_maintenance: result.observedTdee,
                        suggested_target: result.proposedTarget,
                        logged_days: result.loggedDays,
                        weight_trend_kg: result.currentWeight,
                        weekly_weight_change_kg: result.weeklyRateKg ?? null,
                        missing: result.needs,
                    },
                },
            };
        },

        async search_recipes({ query, slot }) {
            const [profile, recipes] = await Promise.all([data.profile(), data.recipes()]);
            const found = findRecipes(profile, recipes, query, SLOTS.includes(slot) ? slot : null, 6);
            return {
                result: {
                    recipes: found.map(r => ({ name: r.name, meals: r.meals, serving: r.servingUnit, kcal_per_serving: Math.round(r.nutrition.kcal), protein_per_serving: Math.round(r.nutrition.protein), total_minutes: r.prepTime + r.cookTime })),
                },
            };
        },

        async swap_meal({ date, slot, recipe_query }) {
            if (!SLOTS.includes(slot)) throw new Error('slot must be breakfast, lunch, snack or dinner.');
            const day = requireDate(date, today);
            const [{ row, days }, profile, recipes] = await Promise.all([planDays(data, day), data.profile(), data.recipes()]);
            if ((await lockedSlots(userId, day, day))[day]?.includes(slot)) throw new Error(`The ${slot} on ${day} is already marked as eaten, so it can't be swapped.`);
            const current = days[0][slot];
            const candidates = findRecipes(profile, recipes, recipe_query, slot, 5).filter(r => !(current?.components || []).some(c => c.id === r.id));
            if (!candidates.length) throw new Error(`No ${slot} recipe matching "${recipe_query}" fits the user's diet and allergies. Try search_recipes with another idea.`);
            const after = planSwap(days[0], slot, candidates[0], profile, recipes);
            return planProposal({
                action: 'swap_meal',
                title: `Swap ${weekday(day)}'s ${slot}`,
                summary: `${current?.name || 'Nothing'} → ${after[slot].name}`,
                row, before: days, after: [after],
            });
        },

        async log_food({ date, slot, items }) {
            if (!SLOTS.includes(slot)) throw new Error('slot must be breakfast, lunch, snack or dinner.');
            const day = requireDate(date, today);
            if (day > today) throw new Error('Food can only be logged for today or earlier.');
            const catalogue = await data.catalogue();
            const matched = [];
            const unmatched = [];
            for (const item of (Array.isArray(items) ? items : []).slice(0, 12)) {
                const { item: resolved } = matchParsedItem(catalogue, { dish: String(item.dish || ''), english: String(item.dish || ''), candidates: [], quantity: Number(item.quantity) || 1, unit: item.unit, confidence: 1 });
                if (resolved) matched.push({ ...resolved, unitOptions: undefined });
                else unmatched.push(item.dish);
            }
            if (!matched.length) throw new Error(`None of these are in the food database: ${unmatched.join(', ')}. Ask the user to log them with the Log food button (search).`);
            const totals = sumNutrition(matched);
            return {
                result: { prepared: `${slot} log`, items: matched.map(i => `${i.name} ${i.quantity} ${i.unit}: ${Math.round(i.nutrition.kcal)} kcal`), total_kcal: Math.round(totals.kcal), not_found: unmatched },
                proposal: {
                    kind: 'log',
                    action: 'log_food',
                    title: `Log ${slot}${day === today ? '' : ` on ${weekday(day)}`}`,
                    summary: matched.map(i => i.name).join(', '),
                    status: 'pending',
                    log: { date: day, slot, items: matched.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, kcal: Math.round(i.nutrition.kcal), protein: Math.round(i.nutrition.protein) })), totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) }, notFound: unmatched },
                    payload: { date: day, slot, items: matched.map(i => ({ kind: i.kind, refId: i.refId, quantity: i.quantity, unit: i.unit })) },
                },
            };
        },

        async rebalance_day({ date, slot, occasion }) {
            if (!SLOTS.includes(slot)) throw new Error('slot must be breakfast, lunch, snack or dinner.');
            const day = requireDate(date, today);
            const [{ row, days }, profile, recipes] = await Promise.all([planDays(data, day), data.profile(), data.recipes()]);
            const locked = (await lockedSlots(userId, day, day))[day] || [];
            const after = planEventDay(days[0], slot, occasion, profile, recipes, locked);
            return planProposal({
                action: 'rebalance_day',
                title: `Make room for ${occasion || 'eating out'} (${weekday(day)} ${slot})`,
                summary: `${slot} becomes a budget of about ${after[slot].calories} kcal; the other meals are lighter.`,
                row, before: days, after: [after],
            });
        },

        async replan_days({ start_date, end_date, mode, reason }) {
            const start = requireDate(start_date, today);
            const end = requireDate(end_date, start);
            if (end < start) throw new Error('end_date is before start_date.');
            if (start < today) throw new Error('Only today and later days can be replanned.');
            if (addDays(start, MAX_DAYS - 1) < end) throw new Error(`At most ${MAX_DAYS} days at a time.`);
            if (!['eat_out', 'fresh'].includes(mode)) throw new Error('mode must be eat_out or fresh.');
            const [{ row, days }, profile, recipes] = await Promise.all([planDays(data, start, end), data.profile(), data.recipes()]);
            const locked = await lockedSlots(userId, start, end);
            const after = mode === 'eat_out'
                ? planEatOutDays(days, profile, recipes, reason || 'travel', locked)
                : planFreshDays(days, profile, recipes, Math.floor(Math.random() * 2 ** 31), locked);
            const range = days.length === 1 ? weekday(days[0].date) : `${weekday(days[0].date)} to ${weekday(days[days.length - 1].date)}`;
            return planProposal({
                action: 'replan_days',
                title: mode === 'eat_out' ? `Eating-out budgets for ${range}` : `New recipes for ${range}`,
                summary: mode === 'eat_out' ? 'Every meal becomes a calorie budget with ordering tips.' : 'Fresh recipes, same targets.',
                row, before: days, after,
            });
        },
    };
};

/** Compact text summary of the user's data for the system prompt (no name or email). */
export const buildCoachContext = async (userId, today) => {
    const data = createLoader(userId);
    const [profile, row] = await Promise.all([data.profile(), data.planRow()]);
    const weekAgo = addDays(today, -7);
    const totals = dailyTotals(await logsBetween(userId, weekAgo, today));
    const planData = row ? parseJson(row.planData, {}) : null;
    const todayPlan = planData?.plan?.find(d => d.date === today);
    const pastDays = Object.entries(totals).filter(([date, t]) => date < today && t.slots.length >= 2);
    const t = profile?.nutritionTargets;

    const lines = [
        `Today: ${today} (${weekday(today)}).`,
        profile ? `Profile: ${profile.gender || '?'}, ${profile.age || '?'} y, ${profile.height || '?'} cm, ${profile.weight || '?'} kg; goal ${t?.goal || profile.goal}${profile.targetRate ? ` at ${profile.targetRate} kg/week` : ''}; diet ${profile.dietaryPreference || 'not set'}; allergies ${(profile.allergies || []).join(', ') || 'none'}; health conditions ${(profile.healthConditions || []).join(', ') || 'none'}; region ${profile.region || 'not set'}.` : 'Profile: not completed.',
        t ? `Targets: ${t.targetCalories} kcal, protein ${t.macros.protein} g, carbs ${t.macros.carbs} g, fat ${t.macros.fat} g (maintenance ${t.tdee} kcal from ${t.tdeeSource === 'adaptive' ? 'their logs and weight trend' : 'the formula'}).` : '',
        planData?.plan?.length ? `Meal plan covers ${planData.plan[0].date} to ${planData.plan[planData.plan.length - 1].date}.` : 'No meal plan yet.',
        todayPlan ? `Today's plan: ${SLOTS.map(s => todayPlan[s] ? `${s} ${todayPlan[s].name} (${todayPlan[s].portionLabel}, ${todayPlan[s].calories} kcal)` : null).filter(Boolean).join('; ')}.` : '',
        `Logged today: ${Math.round(totals[today]?.kcal || 0)} kcal, ${Math.round(totals[today]?.protein || 0)} g protein.`,
        pastDays.length ? `Last 7 days: average ${Math.round(pastDays.reduce((s, [, d]) => s + d.kcal, 0) / pastDays.length)} kcal on ${pastDays.length} logged days.` : 'Little food logged in the last 7 days.',
    ];
    return lines.filter(Boolean).join('\n');
};
