// Pantry (F5): foods the user has at home, with an optional quantity and expiry date.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../lib/auth.js';
import { FOOD_TABLE } from '../engine/nutrition.js';
import { nameScore, tokens } from '../engine/foodMatch.js';

const router = Router();
router.use(authenticateToken);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_GRAMS = 100000;

const toItem = (row) => {
    const food = FOOD_TABLE.get(row.foodId);
    return { foodId: row.foodId, name: food?.name || row.foodId, group: food?.group || 'other', grams: row.grams, expiresOn: row.expiresOn };
};

router.get('/', async (req, res) => {
    try {
        const rows = await prisma.pantryItem.findMany({ where: { userId: req.user.id } });
        res.json(rows.map(toItem).sort((a, b) => (a.expiresOn || '9999').localeCompare(b.expiresOn || '9999') || a.name.localeCompare(b.name)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Any ingredient can be in the pantry (atta, dal, spices), not just ready-to-eat foods.
router.get('/search', (req, res) => {
    const q = tokens(String(req.query.q || '').slice(0, 60));
    if (!q.length) return res.json([]);
    const results = [...FOOD_TABLE.values()]
        .map(food => ({ food, score: nameScore(q, tokens(food.name.replace(/[()]/g, ' '))) }))
        .filter(r => r.score >= 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ food }) => ({ foodId: food.key, name: food.name, group: food.group }));
    res.json(results);
});

// Add or update one item. grams null = "have enough"; expiresOn optional.
router.put('/:foodId', async (req, res) => {
    try {
        const { foodId } = req.params;
        if (!FOOD_TABLE.has(foodId)) return res.status(400).json({ message: 'Unknown food.' });
        const grams = req.body?.grams === null || req.body?.grams === undefined || req.body?.grams === '' ? null : Number(req.body.grams);
        if (grams !== null && !(grams > 0 && grams <= MAX_GRAMS)) return res.status(400).json({ message: 'Enter a quantity in grams, or leave it empty.' });
        const expiresOn = ISO_DATE.test(req.body?.expiresOn || '') ? req.body.expiresOn : null;
        const row = await prisma.pantryItem.upsert({
            where: { userId_foodId: { userId: req.user.id, foodId } },
            create: { userId: req.user.id, foodId, grams, expiresOn },
            update: { grams, expiresOn },
        });
        res.json(toItem(row));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:foodId', async (req, res) => {
    try {
        await prisma.pantryItem.deleteMany({ where: { userId: req.user.id, foodId: req.params.foodId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// One-time import of the old name-only pantry (food names from the shopping list).
router.post('/import', async (req, res) => {
    try {
        const names = Array.isArray(req.body?.names) ? req.body.names.slice(0, 200).map(n => String(n).toLowerCase().trim()) : [];
        const byName = new Map([...FOOD_TABLE.values()].map(f => [f.name.toLowerCase(), f.key]));
        const foodIds = [...new Set(names.map(n => byName.get(n)).filter(Boolean))];
        for (const foodId of foodIds) {
            await prisma.pantryItem.upsert({
                where: { userId_foodId: { userId: req.user.id, foodId } },
                create: { userId: req.user.id, foodId, grams: null },
                update: {},
            });
        }
        res.json({ imported: foodIds.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
