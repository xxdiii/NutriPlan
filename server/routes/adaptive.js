// Weekly adaptive-target check-ins (F2).
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';
import { computeNutritionTargets } from '../../shared/targets.js';
import { generateWeekPlan } from '../engine/planner.js';
import { fitToBudget } from '../engine/budget.js';
import { loadProfile } from './profile.js';
import { loadPricedRecipes } from '../services/prices.js';
import { runCheckIn } from '../services/adaptiveCheckIn.js';

const router = Router();
router.use(authenticateToken);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The browser sends its local date; fall back to the server's. */
const todayFrom = (value) => (ISO_DATE.test(value) ? value : new Date().toISOString().slice(0, 10));

const saveProfile = (userId, profile) =>
    prisma.user.update({ where: { id: userId }, data: { profile: JSON.stringify(profile) } });

// Regenerate the plan from tomorrow to its end with the new targets; past days and today stay.
const regenerateRemainingDays = async (userId, profile, today) => {
    const row = await prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!row) return false;
    const planData = parseJson(row.planData, {});
    const remaining = (planData.plan || []).filter(d => d.date > today);
    if (!remaining.length) return false;
    const recipes = await loadPricedRecipes(userId, profile, remaining[0].date);
    const generated = generateWeekPlan(profile, recipes, { startDate: remaining[0].date, days: remaining.length, seed: Math.floor(Math.random() * 2 ** 31) });
    const { plan: fresh } = fitToBudget(generated, profile, recipes);
    const byDate = new Map(fresh.map(d => [d.date, d]));
    planData.plan = planData.plan.map(d => byDate.get(d.date) || d);
    planData.targets = profile.nutritionTargets;
    planData.updatedAt = new Date().toISOString();
    await prisma.mealPlan.update({ where: { id: row.id }, data: { planData: JSON.stringify(planData) } });
    return true;
};

router.get('/check-in', async (req, res) => {
    try {
        const { result } = await runCheckIn(req.user.id, todayFrom(req.query.today));
        if (!result) return res.status(400).json({ message: 'Complete your profile first.' });
        res.json(result);
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Could not run the check-in.' });
    }
});

// Accept the proposed target: store the adaptive TDEE, recompute targets, replan ahead.
router.post('/accept', async (req, res) => {
    try {
        const today = todayFrom(req.body?.today);
        const { profile, result } = await runCheckIn(req.user.id, today);
        if (!result) return res.status(400).json({ message: 'Complete your profile first.' });
        if (result.status !== 'ok') return res.status(400).json({ message: 'Not enough data for a check-in yet.', needs: result.needs });
        if (!result.due) return res.status(400).json({ message: `Your next check-in is in ${7 - result.daysSinceLast} days.` });

        const oldTarget = profile.nutritionTargets.targetCalories;
        const updated = {
            ...profile,
            adaptive: {
                tdee: result.proposedTdee,
                observedTdee: result.observedTdee,
                formulaTdee: result.formulaTdee,
                confidence: result.confidence,
                updatedAt: today,
            },
        };
        updated.nutritionTargets = computeNutritionTargets(updated);
        await saveProfile(req.user.id, updated);
        await prisma.checkIn.create({
            data: {
                userId: req.user.id,
                date: today,
                formulaTdee: result.formulaTdee,
                observedTdee: result.observedTdee,
                appliedTdee: result.proposedTdee,
                oldTarget,
                newTarget: updated.nutritionTargets.targetCalories,
                details: JSON.stringify({ ...result, trend: undefined }),
            },
        });
        const replanned = req.body?.regenerate === false ? false : await regenerateRemainingDays(req.user.id, updated, today);
        res.json({ profile: updated, replanned });
    } catch (error) {
        console.error('Accept check-in error:', error);
        res.status(500).json({ message: 'Could not save the new target.' });
    }
});

// Go back to the formula estimate.
router.post('/reset', async (req, res) => {
    try {
        const profile = await loadProfile(req.user.id);
        if (!profile) return res.sendStatus(404);
        const { adaptive, ...rest } = profile;
        rest.nutritionTargets = computeNutritionTargets(rest);
        await saveProfile(req.user.id, rest);
        res.json({ profile: rest, removed: Boolean(adaptive) });
    } catch (error) {
        console.error('Reset target error:', error);
        res.status(500).json({ message: 'Could not reset the target.' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const rows = await prisma.checkIn.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'asc' },
            select: { id: true, date: true, formulaTdee: true, observedTdee: true, appliedTdee: true, oldTarget: true, newTarget: true, createdAt: true },
        });
        res.json(rows);
    } catch (error) {
        console.error('Check-in history error:', error);
        res.status(500).json({ message: 'Could not load check-ins.' });
    }
});

export default router;
