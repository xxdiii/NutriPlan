// Adaptive calorie targets (F2). Estimates the user's real maintenance calories (TDEE)
// from logged intake and the rate of weight change, blends it with the Mifflin-St Jeor
// estimate according to how much data there is, and proposes a new target with limits.
// The rate comes from a least-squares line through the window's weigh-ins (no lag); the
// smoothed trend is shown on the chart and used to spot plateaus.
// Pure: no database, no clock (today is passed in).
import { calculateTDEE, computeNutritionTargets } from '../../shared/targets.js';

export const KCAL_PER_KG = 7700;
export const WINDOW_DAYS = 21;
// Smoothing per day of the weight trend (an exponential moving average).
export const TREND_ALPHA = 0.1;
export const MAX_WEEKLY_CHANGE = 150;
export const CHECK_IN_INTERVAL = 7;
// A day counts as logged when at least this many meals were logged.
export const MIN_SLOTS_PER_DAY = 2;
const MIN_LOGGED_DAYS = 7;
const MIN_SPAN_DAYS = 7;
const MAX_CONFIDENCE = 0.9;
// Observed values far outside this range of the formula mean bad data, not a real TDEE.
const SANE_RANGE = [0.6, 1.6];
const PLATEAU_DAYS = 14;
const PLATEAU_KG = 0.1;

const DAY_MS = 86400000;
const toDay = (date) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const fromDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Smoothed weight trend at each weigh-in date. Several weigh-ins on one day are averaged.
 * Gaps between weigh-ins get proportionally more smoothing weight, so weekly weigh-ins
 * still move the trend at a sensible pace.
 * @param weights [{ date: 'YYYY-MM-DD', weight }]
 * @returns [{ date, weight, trend }] in date order
 */
export const weightTrend = (weights, alpha = TREND_ALPHA) => {
    const byDay = new Map();
    for (const { date, weight } of weights) {
        const w = Number(weight);
        if (!(w > 0) || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
        const key = date.slice(0, 10);
        const entry = byDay.get(key) || { sum: 0, n: 0 };
        byDay.set(key, { sum: entry.sum + w, n: entry.n + 1 });
    }
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    const series = [];
    let trend = null;
    let lastDay = null;
    for (const [date, { sum, n }] of days) {
        const weight = sum / n;
        const day = toDay(date);
        if (trend === null) {
            trend = weight;
        } else {
            const effective = 1 - (1 - alpha) ** (day - lastDay);
            trend += effective * (weight - trend);
        }
        lastDay = day;
        series.push({ date, weight: round1(weight), trend: Math.round(trend * 100) / 100 });
    }
    return series;
};

/** Trend value on a date: the last weigh-in's trend at or before it. */
const trendOn = (series, day) => {
    let value = null;
    for (const point of series) {
        if (toDay(point.date) > day) break;
        value = point.trend;
    }
    return value;
};

/** Least-squares slope of weight against day, in kg per day. */
const slopePerDay = (points) => {
    const xs = points.map(p => toDay(p.date));
    const ys = points.map(p => p.weight);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0;
    let den = 0;
    xs.forEach((x, i) => {
        num += (x - mx) * (ys[i] - my);
        den += (x - mx) ** 2;
    });
    return den ? num / den : 0;
};

/**
 * @param profile          the saved profile (with goal, rate, body metrics, adaptive)
 * @param weights          [{ date, weight }]
 * @param intake           { 'YYYY-MM-DD': { kcal, slots: [...] } } from FoodLog
 * @param today            'YYYY-MM-DD' (the user's local date)
 * @param lastCheckInDate  'YYYY-MM-DD' of the last accepted check-in, or null
 */
export const adaptiveCheckIn = ({ profile, weights, intake, today, lastCheckInDate = null }) => {
    const todayDay = toDay(today);
    const series = weightTrend(weights.filter(w => toDay(String(w.date).slice(0, 10)) <= todayDay));
    const latest = series[series.length - 1];
    const currentWeight = latest ? round1(latest.trend) : Number(profile.weight) || 0;
    // Targets use the profile weight (the latest weigh-in), like every other screen.
    const bodyWeight = Number(profile.weight) || currentWeight;

    const formulaTdee = calculateTDEE(bodyWeight, profile.height, profile.age, profile.gender, profile.activityLevel);
    const currentTdee = Math.round(profile.adaptive?.tdee || formulaTdee);
    const currentTarget = profile.nutritionTargets?.targetCalories ?? computeNutritionTargets(profile).targetCalories;
    const daysSinceLast = lastCheckInDate ? todayDay - toDay(lastCheckInDate) : null;
    const due = daysSinceLast === null || daysSinceLast >= CHECK_IN_INTERVAL;

    // Window: the last 21 days, from the first weigh-in in it to the last.
    const windowStart = todayDay - (WINDOW_DAYS - 1);
    const inWindow = series.filter(p => toDay(p.date) >= windowStart);
    const startDay = inWindow.length ? toDay(inWindow[0].date) : todayDay;
    const endDay = inWindow.length ? toDay(inWindow[inWindow.length - 1].date) : todayDay;
    const span = endDay - startDay;

    const loggedDays = [];
    for (let day = startDay; day <= endDay; day++) {
        const entry = intake[fromDay(day)];
        if (entry && (entry.slots?.length || 0) >= MIN_SLOTS_PER_DAY) loggedDays.push(entry.kcal);
    }
    const avgIntake = loggedDays.length ? loggedDays.reduce((a, b) => a + b, 0) / loggedDays.length : null;

    const needs = [];
    if (inWindow.length < 2 || span < MIN_SPAN_DAYS) {
        needs.push(`Weigh in at least twice, ${MIN_SPAN_DAYS}+ days apart, within the last ${WINDOW_DAYS} days.`);
    }
    if (loggedDays.length < MIN_LOGGED_DAYS) {
        needs.push(`Log at least ${MIN_SLOTS_PER_DAY} meals a day on ${MIN_LOGGED_DAYS} days (${loggedDays.length} so far).`);
    }

    const base = {
        due,
        daysSinceLast,
        formulaTdee,
        currentTdee,
        currentTarget,
        currentWeight,
        loggedDays: loggedDays.length,
        windowDays: span,
        avgIntake: avgIntake === null ? null : Math.round(avgIntake),
        trend: series.slice(-30),
    };
    if (needs.length) {
        return { ...base, status: 'not_enough_data', needs, observedTdee: null, proposedTdee: currentTdee, proposedTarget: currentTarget, change: 0, confidence: 0, plateau: false, notes: [] };
    }

    const trendChange = slopePerDay(inWindow) * span;
    const rawObserved = avgIntake - (trendChange * KCAL_PER_KG) / span;
    const observedTdee = Math.round(clamp(rawObserved, formulaTdee * SANE_RANGE[0], formulaTdee * SANE_RANGE[1]));
    const confidence = Math.round(MAX_CONFIDENCE * Math.min(1, loggedDays.length / WINDOW_DAYS) * Math.min(1, span / 14) * 100) / 100;
    const blendedTdee = Math.round(formulaTdee + confidence * (observedTdee - formulaTdee));
    const proposedTdee = Math.round(currentTdee + clamp(blendedTdee - currentTdee, -MAX_WEEKLY_CHANGE, MAX_WEEKLY_CHANGE));

    const proposedTargets = computeNutritionTargets({ ...profile, weight: bodyWeight, adaptive: { tdee: proposedTdee } });
    const notes = [...proposedTargets.notes];
    if (Math.round(rawObserved) !== observedTdee) notes.push('Your logs and weight disagree a lot, so the estimate was limited. Check that you log everything you eat.');
    if (proposedTdee !== blendedTdee) notes.push(`Changes are limited to ${MAX_WEEKLY_CHANGE} kcal a week; the rest follows at later check-ins.`);

    // Plateau: on a cut, the trend has not moved for two weeks despite steady logging.
    const goal = proposedTargets.goal;
    let plateau = false;
    const recentStart = endDay - PLATEAU_DAYS;
    const recentTrendStart = trendOn(series, recentStart);
    if (goal === 'cut' && recentTrendStart !== null && toDay(series[0].date) <= recentStart) {
        const recentLogged = loggedDays.length >= 10;
        plateau = recentLogged && trendChange > -PLATEAU_KG && trendOn(series, endDay) - recentTrendStart > -PLATEAU_KG;
        if (plateau) notes.push('Your weight trend has been flat for two weeks. The new target reflects your real maintenance.');
    }

    return {
        ...base,
        status: 'ok',
        needs: [],
        observedTdee,
        blendedTdee,
        proposedTdee,
        confidence,
        trendChangeKg: round1(trendChange),
        weeklyRateKg: Math.round((trendChange / span) * 7 * 100) / 100,
        proposedTarget: proposedTargets.targetCalories,
        proposedMacros: proposedTargets.macros,
        change: proposedTargets.targetCalories - currentTarget,
        plateau,
        notes,
    };
};
