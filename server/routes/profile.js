import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';
import { computeNutritionTargets, normaliseGoal } from '../../shared/targets.js';

const router = Router();

export const loadProfile = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
    return user ? parseJson(user.profile, {}) : null;
};

const hasBodyMetrics = (p) => p.weight && p.height && p.age && p.gender;

router.get('/', authenticateToken, async (req, res) => {
    try {
        const profile = await loadProfile(req.user.id);
        if (!profile) return res.sendStatus(404);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Saves the profile. Calorie and macro targets are always recomputed here so every
// screen (onboarding, profile, plan library) gets the same numbers.
router.post('/', authenticateToken, async (req, res) => {
    try {
        const profile = { ...req.body };
        if (profile.goal) profile.goal = normaliseGoal(profile.goal);
        if (hasBodyMetrics(profile)) profile.nutritionTargets = computeNutritionTargets(profile);

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { profile: JSON.stringify(profile) }
        });
        res.json(JSON.parse(updatedUser.profile));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
