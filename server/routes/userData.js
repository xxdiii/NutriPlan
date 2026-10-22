// Small per-user documents the browser keeps in sync (pantry, ticked shopping items,
// streak badges, chosen plan archetype). The browser caches them in localStorage.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';

const router = Router();
router.use(authenticateToken);

const KEY = /^[a-zA-Z0-9_-]{1,40}$/;
const MAX_BYTES = 100_000;

router.get('/', async (req, res) => {
    try {
        const rows = await prisma.userData.findMany({ where: { userId: req.user.id } });
        res.json(Object.fromEntries(rows.map(r => [r.key, parseJson(r.value, null)])));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        if (!KEY.test(key)) return res.status(400).json({ message: 'Invalid key.' });
        const value = JSON.stringify(req.body?.value ?? null);
        if (value.length > MAX_BYTES) return res.status(413).json({ message: 'Value too large.' });
        await prisma.userData.upsert({
            where: { userId_key: { userId: req.user.id, key } },
            update: { value },
            create: { userId: req.user.id, key, value },
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
