// Food logging: AI parsing of photos and text, catalogue search, and the user's food log.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../lib/auth.js';
import { gemini, AiError } from '../services/gemini.js';
import { catalogueNames, matchParsedItem, resolveItem, searchCatalogue, sumNutrition } from '../engine/foodMatch.js';
import { LOG_SLOTS, LOG_SOURCES, userCatalogue, createLog, toLogResponse, dailyTotals, logsBetween } from '../services/foodLogs.js';

const router = Router();
router.use(authenticateToken);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TEXT = 500;
const MAX_IMAGE_BASE64 = 4 * 1024 * 1024;
const MAX_ITEMS = 20;

const sendError = (res, error) => {
    if (error instanceof AiError) return res.status(error.status).json({ message: error.message });
    console.error('Food log error:', error);
    return res.status(500).json({ message: 'Something went wrong.' });
};

// Identify dishes and portions with Gemini, then match them to the catalogue.
// Only the text or the image is sent to Gemini, never the user's name or email.
router.post('/parse', async (req, res) => {
    try {
        const { text, image, mimeType } = req.body || {};
        let input;
        if (typeof text === 'string' && text.trim()) {
            if (text.length > MAX_TEXT) return res.status(400).json({ message: `Keep the description under ${MAX_TEXT} characters.` });
            input = { text };
        } else if (typeof image === 'string' && image) {
            const data = image.replace(/^data:[^;]+;base64,/, '');
            const type = /^data:([^;]+);base64,/.exec(image)?.[1] || mimeType;
            if (!IMAGE_TYPES.includes(type)) return res.status(400).json({ message: 'Use a JPEG, PNG or WebP photo.' });
            if (data.length > MAX_IMAGE_BASE64) return res.status(400).json({ message: 'That photo is too large.' });
            input = { image: data, mimeType: type };
        } else {
            return res.status(400).json({ message: 'Describe what you ate or add a photo.' });
        }

        const catalogue = await userCatalogue(req.user.id);
        const { isFood, items } = await gemini().parseMeal(req.user.id, input, catalogueNames(catalogue));
        res.json({
            isFood,
            source: input.text ? 'text' : 'photo',
            items: items.map(parsed => ({ ...matchParsedItem(catalogue, parsed), quantity: parsed.quantity, unit: parsed.unit })),
        });
    } catch (error) {
        sendError(res, error);
    }
});

// Catalogue search for adding or correcting items by hand (no AI).
router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').slice(0, 80);
        if (q.trim().length < 2) return res.json([]);
        res.json(searchCatalogue(await userCatalogue(req.user.id), q));
    } catch (error) {
        sendError(res, error);
    }
});

const resolveAll = (catalogue, items) => {
    if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) return null;
    const resolved = items.map(item => resolveItem(catalogue, item));
    return resolved.every(Boolean) ? resolved : null;
};

// Nutrition for items as the user adjusts portions on the confirmation card.
router.post('/resolve', async (req, res) => {
    try {
        const catalogue = await userCatalogue(req.user.id);
        const resolved = (req.body?.items || []).map(item => resolveItem(catalogue, item));
        res.json({ items: resolved, totals: sumNutrition(resolved.filter(Boolean)) });
    } catch (error) {
        sendError(res, error);
    }
});

// Save a meal. Nutrition is recalculated here from the catalogue; anything the browser
// sends besides kind, refId, quantity and unit is ignored.
router.post('/', async (req, res) => {
    try {
        const { date, slot, source = 'manual', items, note } = req.body || {};
        if (!ISO_DATE.test(date) || !LOG_SLOTS.includes(slot) || !LOG_SOURCES.includes(source) || source === 'plan') {
            return res.status(400).json({ message: 'A date, meal and source are required.' });
        }
        const resolved = resolveAll(await userCatalogue(req.user.id), items);
        if (!resolved) return res.status(400).json({ message: 'Every item needs a food from the list and a valid portion.' });

        const row = await createLog(req.user.id, {
            date, slot, source, items: resolved,
            note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 200) : null,
        });
        res.status(201).json(toLogResponse(row));
    } catch (error) {
        sendError(res, error);
    }
});

const rangeFrom = (query) => {
    const to = ISO_DATE.test(query.to) ? query.to : new Date().toISOString().slice(0, 10);
    const from = ISO_DATE.test(query.from) ? query.from : to;
    return { from, to };
};

router.get('/', async (req, res) => {
    try {
        const { from, to } = rangeFrom(req.query);
        res.json((await logsBetween(req.user.id, from, to)).map(toLogResponse));
    } catch (error) {
        sendError(res, error);
    }
});

router.get('/summary', async (req, res) => {
    try {
        const { from, to } = rangeFrom(req.query);
        res.json(dailyTotals(await logsBetween(req.user.id, from, to)));
    } catch (error) {
        sendError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const log = await prisma.foodLog.findFirst({ where: { id, userId: req.user.id } });
        if (!log) return res.status(404).json({ message: 'Log not found.' });
        // Planned meals are removed by un-ticking them in the plan, which keeps tracking in step.
        if (log.source === 'plan') return res.status(400).json({ message: 'Untick this meal in your plan instead.' });
        await prisma.foodLog.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        sendError(res, error);
    }
});

export default router;
