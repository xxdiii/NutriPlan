// Loads a user's weights, food log and last check-in and runs the adaptive engine.
// Shared by the check-in routes and the AI coach.
import { prisma } from '../lib/prisma.js';
import { loadProfile } from '../routes/profile.js';
import { adaptiveCheckIn, WINDOW_DAYS } from '../engine/adaptive.js';
import { dailyTotals, logsBetween } from './foodLogs.js';

// History beyond the engine's window, so the trend has settled by the window start.
const LOOKBACK_DAYS = WINDOW_DAYS + 35;

const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export const runCheckIn = async (userId, today) => {
    const profile = await loadProfile(userId);
    if (!profile?.nutritionTargets?.targetCalories) return { profile: null, result: null };
    const since = addDays(today, -LOOKBACK_DAYS);
    const [weightRows, logs, last] = await Promise.all([
        prisma.weightLog.findMany({ where: { userId, date: { gte: new Date(`${since}T00:00:00Z`) } }, orderBy: { date: 'asc' } }),
        logsBetween(userId, since, today),
        prisma.checkIn.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const result = adaptiveCheckIn({
        profile,
        weights: weightRows.map(w => ({ date: w.date.toISOString().slice(0, 10), weight: w.weight })),
        intake: dailyTotals(logs),
        today,
        lastCheckInDate: last?.date || null,
    });
    return { profile, result };
};

