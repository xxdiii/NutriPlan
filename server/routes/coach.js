// AI coach (F7): conversation, and applying or dismissing the changes it proposes.
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, parseJson } from '../lib/auth.js';
import { AiError, checkQuota, defaultClient, defaultFallbackModel, defaultModel, prismaQuota } from '../services/gemini.js';
import { runCoachTurn, MAX_MESSAGE_LENGTH } from '../services/coach.js';
import { buildCoachContext, createCoachTools, dayHash } from '../services/coachTools.js';
import { createLog, toLogResponse, userCatalogue } from '../services/foodLogs.js';
import { resolveItem } from '../engine/foodMatch.js';

const router = Router();
router.use(authenticateToken);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_LIMIT = 60;

const todayFrom = (value) => (ISO_DATE.test(value) ? value : new Date().toISOString().slice(0, 10));

/** A message as the browser sees it: proposals without the stored plan days. */
const toMessage = (row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
    // The stored payload (whole plan days) is only needed on the server when applying.
    proposals: parseJson(row.proposals, []).map(proposal => ({ ...proposal, payload: undefined })),
});

const sendError = (res, error) => {
    if (error instanceof AiError) return res.status(error.status).json({ message: error.message });
    console.error('Coach error:', error);
    return res.status(500).json({ message: 'Something went wrong. Try again.' });
};

router.get('/messages', async (req, res) => {
    try {
        const rows = await prisma.coachMessage.findMany({ where: { userId: req.user.id }, orderBy: { id: 'desc' }, take: HISTORY_LIMIT });
        res.json(rows.reverse().map(toMessage));
    } catch (error) {
        sendError(res, error);
    }
});

router.post('/chat', async (req, res) => {
    try {
        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
        if (!message) return res.status(400).json({ message: 'Type a message.' });
        if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ message: `Keep messages under ${MAX_MESSAGE_LENGTH} characters.` });
        const userId = req.user.id;
        const today = todayFrom(req.body?.today);

        await checkQuota(prismaQuota, userId);
        const history = await prisma.coachMessage.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: 12 });
        const turn = await runCoachTurn({
            client: defaultClient(),
            model: defaultModel(),
            fallbackModel: defaultFallbackModel(),
            history: history.reverse(),
            message,
            context: await buildCoachContext(userId, today),
            tools: createCoachTools(userId, today),
        });
        if (turn.flag !== 'crisis') await prismaQuota.add(userId);

        const [userRow, replyRow] = await prisma.$transaction([
            prisma.coachMessage.create({ data: { userId, role: 'user', content: message } }),
            prisma.coachMessage.create({
                data: { userId, role: 'assistant', content: turn.text, proposals: turn.proposals.length ? JSON.stringify(turn.proposals) : null },
            }),
        ]);
        res.json({ messages: [toMessage(userRow), toMessage(replyRow)] });
    } catch (error) {
        sendError(res, error);
    }
});

const loadProposal = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const index = parseInt(req.params.index, 10);
    const row = await prisma.coachMessage.findFirst({ where: { id, userId: req.user.id } });
    const proposals = row ? parseJson(row.proposals, []) : [];
    if (!proposals[index]) {
        res.status(404).json({ message: 'Proposal not found.' });
        return null;
    }
    if (proposals[index].status !== 'pending') {
        res.status(409).json({ message: `This change was already ${proposals[index].status}.` });
        return null;
    }
    return { row, proposals, index, proposal: proposals[index] };
};

const saveStatus = ({ row, proposals, index }, status) => {
    proposals[index] = { ...proposals[index], status };
    return prisma.coachMessage.update({ where: { id: row.id }, data: { proposals: JSON.stringify(proposals) } });
};

// Write the proposed plan days, unless the plan changed since they were computed.
// (Meals already eaten were never changed by the proposal, so tracking stays valid.)
const applyPlan = async (userId, { planId, days, beforeHashes }) => {
    const row = await prisma.mealPlan.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!row || row.id !== planId) return { stale: true };
    const planData = parseJson(row.planData, {});
    const byDate = new Map(days.map(d => [d.date, d]));
    const stale = (planData.plan || []).some(d => byDate.has(d.date) && dayHash(d) !== beforeHashes[d.date]);
    if (stale) return { stale: true };
    planData.plan = planData.plan.map(d => byDate.get(d.date) || d);
    planData.updatedAt = new Date().toISOString();
    await prisma.mealPlan.update({ where: { id: row.id }, data: { planData: JSON.stringify(planData) } });
    return { stale: false };
};

router.post('/messages/:id/proposals/:index/apply', async (req, res) => {
    try {
        const found = await loadProposal(req, res);
        if (!found) return;
        const { proposal } = found;

        if (proposal.kind === 'plan') {
            const { stale } = await applyPlan(req.user.id, proposal.payload);
            if (stale) {
                await saveStatus(found, 'expired');
                return res.status(409).json({ message: 'Your plan has changed since this was suggested. Ask the coach again.' });
            }
            await saveStatus(found, 'applied');
            return res.json({ status: 'applied', kind: 'plan' });
        }

        if (proposal.kind === 'log') {
            // Re-resolve against the catalogue so stored numbers are recalculated, as for any log.
            const catalogue = await userCatalogue(req.user.id);
            const items = proposal.payload.items.map(item => resolveItem(catalogue, item));
            if (items.some(i => !i)) return res.status(400).json({ message: 'One of these foods is no longer available.' });
            const log = await createLog(req.user.id, { date: proposal.payload.date, slot: proposal.payload.slot, source: 'text', items });
            await saveStatus(found, 'applied');
            return res.json({ status: 'applied', kind: 'log', log: toLogResponse(log) });
        }
        res.status(400).json({ message: 'Unknown change.' });
    } catch (error) {
        sendError(res, error);
    }
});

router.post('/messages/:id/proposals/:index/dismiss', async (req, res) => {
    try {
        const found = await loadProposal(req, res);
        if (!found) return;
        await saveStatus(found, 'dismissed');
        res.json({ status: 'dismissed' });
    } catch (error) {
        sendError(res, error);
    }
});

router.delete('/messages', async (req, res) => {
    try {
        await prisma.coachMessage.deleteMany({ where: { userId: req.user.id } });
        res.json({ success: true });
    } catch (error) {
        sendError(res, error);
    }
});

export default router;
