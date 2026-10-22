// Meal compliance, weight logs and hydration.
// Meal statuses: 'eaten', 'skipped', 'other' (ate something else, logged separately) or null.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';
import { syncPlanLogs } from '../services/foodLogs.js';

const router = Router();
router.use(authenticateToken);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const emptyCompliance = (date) => ({ meals: { breakfast: null, lunch: null, snack: null, dinner: null }, date });

// All compliance records in a date range, keyed by date: { "2026-10-22": { meals, date } }
router.get('/compliance', async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = { userId: req.user.id };
        if (ISO_DATE.test(from) || ISO_DATE.test(to)) {
            where.date = {};
            if (ISO_DATE.test(from)) where.date.gte = from;
            if (ISO_DATE.test(to)) where.date.lte = to;
        }
        const records = await prisma.compliance.findMany({ where });
        res.json(Object.fromEntries(records.map(r => [r.date, parseJson(r.meals, emptyCompliance(r.date))])));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/compliance/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const record = await prisma.compliance.findUnique({
            where: { userId_date: { userId: req.user.id, date } }
        });
        res.json(record ? parseJson(record.meals, emptyCompliance(date)) : emptyCompliance(date));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/compliance', async (req, res) => {
    try {
        const { date, meals } = req.body || {};
        if (!ISO_DATE.test(date) || typeof meals !== 'object' || !meals) {
            return res.status(400).json({ message: 'date (YYYY-MM-DD) and meals are required.' });
        }
        const value = JSON.stringify({ meals, date });
        const updated = await prisma.compliance.upsert({
            where: { userId_date: { userId: req.user.id, date } },
            update: { meals: value },
            create: { userId: req.user.id, date, meals: value }
        });
        // A planned meal marked eaten becomes a food log entry ('other' = ate something else).
        await syncPlanLogs(req.user.id, date, meals);
        res.json(JSON.parse(updated.meals));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/weight-logs', async (req, res) => {
    try {
        const logs = await prisma.weightLog.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'asc' }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/weight-logs', async (req, res) => {
    try {
        const { weight, date, notes } = req.body || {};
        const kg = parseFloat(weight);
        const when = new Date(date);
        if (!(kg > 0) || Number.isNaN(when.getTime())) {
            return res.status(400).json({ message: 'A positive weight and a valid date are required.' });
        }
        const log = await prisma.weightLog.create({
            data: { userId: req.user.id, weight: kg, date: when, notes: notes || null }
        });
        res.json(log);
    } catch (error) {
        console.error('Error creating weight log:', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/weight-logs/:id', async (req, res) => {
    try {
        const logId = parseInt(req.params.id);
        // Verify the log belongs to the user before deleting
        const log = await prisma.weightLog.findFirst({ where: { id: logId, userId: req.user.id } });
        if (!log) return res.status(404).json({ error: 'Weight log not found' });

        await prisma.weightLog.delete({ where: { id: logId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/hydration/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const log = await prisma.hydrationLog.findFirst({ where: { userId: req.user.id, date } });
        res.json(log || { amount: 0, date });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/hydration', async (req, res) => {
    try {
        const { date, amount } = req.body || {}; // date YYYY-MM-DD
        const ml = parseInt(amount);
        if (!ISO_DATE.test(date) || !(ml >= 0)) {
            return res.status(400).json({ message: 'date (YYYY-MM-DD) and a non-negative amount are required.' });
        }

        // Find existing log for this date or create new
        const existingLog = await prisma.hydrationLog.findFirst({ where: { userId: req.user.id, date } });
        const log = existingLog
            ? await prisma.hydrationLog.update({ where: { id: existingLog.id }, data: { amount: ml } })
            : await prisma.hydrationLog.create({ data: { userId: req.user.id, date, amount: ml } });
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
