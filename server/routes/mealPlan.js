import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';
import { loadProfile } from './profile.js';
import { loadPricedRecipes, loadPantry, pricesFor, useUpMap } from '../services/prices.js';
import { rankAlternatives, swapMeal, PLANNER_VERSION, SLOTS } from '../engine/planner.js';
import { rejectionReason } from '../engine/constraints.js';
import { buildShoppingList, shoppingListText } from '../engine/shopping.js';
import { budgetSummary, planWeek } from '../engine/budget.js';
import { proteinForMoney } from '../engine/cost.js';

const router = Router();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const latestPlanRow = (userId) => prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });

const toResponse = (row) => ({
    ...parseJson(row.planData, {}),
    id: row.id,
    planVersion: row.version,
    metadata: { startDate: row.startDate, endDate: row.endDate },
});

const requireProfile = async (req, res) => {
    const profile = await loadProfile(req.user.id);
    if (!profile?.nutritionTargets?.targetCalories) {
        res.status(400).json({ message: 'Complete your profile before generating a meal plan.' });
        return null;
    }
    return profile;
};

router.get('/', authenticateToken, async (req, res) => {
    try {
        const row = await latestPlanRow(req.user.id);
        // null rather than 404 keeps the frontend's "no plan yet" check simple
        res.json(row ? toResponse(row) : null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate and save a new weekly plan. `startDate` is the user's local date.
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const profile = await requireProfile(req, res);
        if (!profile) return;
        const startDate = ISO_DATE.test(req.body?.startDate) ? req.body.startDate : new Date().toISOString().slice(0, 10);
        const seed = Number.isFinite(Number(req.body?.seed)) ? Number(req.body.seed) : Math.floor(Math.random() * 2 ** 31);

        // Costs use the user's city tier and the month; pantry items about to expire are used first.
        const [recipes, pantry] = await Promise.all([loadPricedRecipes(req.user.id, profile, startDate), loadPantry(req.user.id)]);
        const useUp = useUpMap(pantry, startDate);
        const { plan, swaps } = planWeek(profile, recipes, { startDate, seed, useUp });
        const planData = {
            plan,
            budget: { ...budgetSummary(plan, profile), swaps },
            usedUp: [...useUp.keys()],
            createdAt: new Date().toISOString(),
            planVersion: PLANNER_VERSION,
            startDate,
            seed,
            servings: profile.servings || 1,
            targets: profile.nutritionTargets,
        };
        const row = await prisma.mealPlan.create({
            data: {
                userId: req.user.id,
                startDate: new Date(`${plan[0].date}T00:00:00Z`),
                endDate: new Date(`${plan[plan.length - 1].date}T00:00:00Z`),
                version: PLANNER_VERSION,
                planData: JSON.stringify(planData),
            }
        });
        res.json(toResponse(row));
    } catch (error) {
        console.error('Generate plan error:', error);
        res.status(500).json({ error: error.message });
    }
});

const findDay = (planData, date) => planData.plan?.findIndex(d => d.date === date) ?? -1;

// Alternatives for one meal, portioned to replace it.
router.get('/alternatives', authenticateToken, async (req, res) => {
    try {
        const { date, slot } = req.query;
        if (!SLOTS.includes(slot)) return res.status(400).json({ message: 'Unknown meal slot.' });
        const profile = await requireProfile(req, res);
        if (!profile) return;
        const row = await latestPlanRow(req.user.id);
        const planData = row ? parseJson(row.planData, {}) : {};
        const index = findDay(planData, date);
        const current = index >= 0 ? planData.plan[index][slot] : null;
        const recipes = await loadPricedRecipes(req.user.id, profile, date);
        res.json(rankAlternatives(profile, recipes, slot, current));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Swap one meal in the current plan; the new meal is re-portioned to the same calories.
router.post('/swap', authenticateToken, async (req, res) => {
    try {
        const { date, slot, recipeId } = req.body || {};
        if (!SLOTS.includes(slot)) return res.status(400).json({ message: 'Unknown meal slot.' });
        const profile = await requireProfile(req, res);
        if (!profile) return;
        const row = await latestPlanRow(req.user.id);
        if (!row) return res.status(404).json({ message: 'No meal plan to update.' });

        const planData = parseJson(row.planData, {});
        const index = findDay(planData, date);
        if (index < 0) return res.status(404).json({ message: 'That date is not in the current plan.' });

        const recipes = await loadPricedRecipes(req.user.id, profile, date);
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe || recipe.course === 'staple' || !recipe.meals.includes(slot)) {
            return res.status(400).json({ message: 'That recipe cannot be used for this meal.' });
        }
        if (rejectionReason(recipe, profile)) {
            return res.status(400).json({ message: 'That recipe does not fit your diet or allergies.' });
        }

        planData.plan[index] = swapMeal(planData.plan[index], slot, recipe, profile, recipes);
        planData.updatedAt = new Date().toISOString();
        const updated = await prisma.mealPlan.update({ where: { id: row.id }, data: { planData: JSON.stringify(planData) } });
        res.json(toResponse(updated));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/shopping-list', authenticateToken, async (req, res) => {
    try {
        const row = await latestPlanRow(req.user.id);
        if (!row) return res.json(null);
        const planData = parseJson(row.planData, {});
        const profile = (await loadProfile(req.user.id)) || {};
        const cookFor = Math.max(1, parseInt(profile.servings ?? planData.servings, 10) || 1);
        const plan = planData.plan || [];
        const [prices, pantry] = await Promise.all([pricesFor(profile, plan[0]?.date), loadPantry(req.user.id)]);
        const list = buildShoppingList(plan, cookFor, { prices, pantry });
        res.json({
            ...list,
            budget: budgetSummary(plan, profile),
            priceTier: profile.priceTier || 'metro',
            proteinForMoney: proteinForMoney(prices, profile),
            shareText: shoppingListText(list),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
