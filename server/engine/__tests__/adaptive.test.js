import { describe, it, expect } from 'vitest';
import { adaptiveCheckIn, weightTrend, KCAL_PER_KG, MAX_WEEKLY_CHANGE } from '../adaptive.js';
import { computeNutritionTargets, calculateTDEE } from '../../../shared/targets.js';

const TODAY = '2026-10-22';
const DAY_MS = 86400000;
const dateAgo = (n) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

const makeProfile = (overrides = {}) => {
    const profile = { gender: 'male', age: 30, height: 175, weight: 80, activityLevel: 1.4, goal: 'cut', targetRate: 0.5, ...overrides };
    return { ...profile, nutritionTargets: computeNutritionTargets(profile) };
};

// Deterministic noise in [-1, 1].
const noise = (i) => Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 4.1414) * 0.5;

/**
 * Simulate `days` days ending today: the person eats `intake` kcal and really burns
 * `trueTdee`, weighing in every `weighEvery` days with `noiseKg` scale noise.
 */
const simulate = ({ days = 56, intake = 2200, trueTdee = 2700, startWeight = 82, weighEvery = 1, noiseKg = 0, slots = 4, loggedDays = days }) => {
    const weights = [];
    const log = {};
    let weight = startWeight;
    for (let i = days - 1; i >= 0; i--) {
        const date = dateAgo(i);
        if (i % weighEvery === 0) weights.push({ date, weight: Math.round((weight + noiseKg * noise(i)) * 10) / 10 });
        if (i < loggedDays) log[date] = { kcal: intake, slots: ['breakfast', 'lunch', 'snack', 'dinner'].slice(0, slots) };
        weight -= (trueTdee - intake) / KCAL_PER_KG;
    }
    return { weights, intake: log, endWeight: weight };
};

describe('weightTrend', () => {
    it('smooths noise and follows the real direction', () => {
        const { weights } = simulate({ noiseKg: 0.8 });
        const series = weightTrend(weights);
        const first = series[0].trend;
        const last = series[series.length - 1].trend;
        expect(last).toBeLessThan(first - 2);
        // The trend moves far less day to day than the raw weigh-ins do.
        const jumps = (key) => series.slice(1).reduce((s, p, i) => s + Math.abs(p[key] - series[i][key]), 0);
        expect(jumps('trend')).toBeLessThan(jumps('weight') / 3);
    });

    it('averages several weigh-ins on one day and handles weekly weigh-ins', () => {
        expect(weightTrend([{ date: '2026-10-01', weight: 80 }, { date: '2026-10-01', weight: 82 }])[0].weight).toBe(81);
        const weekly = weightTrend([{ date: '2026-10-01', weight: 80 }, { date: '2026-10-08', weight: 79 }]);
        // A week's gap moves the trend about half way (1 - 0.9^7).
        expect(weekly[1].trend).toBeCloseTo(80 - (1 - 0.9 ** 7), 2);
    });
});

describe('adaptiveCheckIn', () => {
    const profile = makeProfile({ weight: 80 });
    const formula = calculateTDEE(80, 175, 30, 'male', 1.4);

    it('estimates the real maintenance from intake and the weight trend', () => {
        const { weights, intake } = simulate({ trueTdee: 2700 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(result.status).toBe('ok');
        expect(result.formulaTdee).toBe(formula);
        expect(Math.abs(result.observedTdee - 2700)).toBeLessThan(60);
        expect(result.confidence).toBeCloseTo(0.9);
        expect(result.weeklyRateKg).toBeCloseTo(-(500 / KCAL_PER_KG) * 7, 1);
        expect(result.notes.join(' ')).not.toMatch(/disagree/);
    });

    it('is accurate for a new user with only three weeks of data', () => {
        const { weights, intake } = simulate({ days: 21, trueTdee: 2700 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(Math.abs(result.observedTdee - 2700)).toBeLessThan(30);
    });

    it(`limits a check-in to ±${MAX_WEEKLY_CHANGE} kcal`, () => {
        const { weights, intake } = simulate({ trueTdee: 3200 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(result.proposedTdee).toBe(formula + MAX_WEEKLY_CHANGE);
        expect(result.change).toBe(MAX_WEEKLY_CHANGE);
        expect(result.notes.join(' ')).toMatch(/limited to 150/);
    });

    it('starts from the previously applied value', () => {
        const { weights, intake } = simulate({ trueTdee: 3200 });
        const adapted = makeProfile({ weight: 80, adaptive: { tdee: formula + 150 } });
        const result = adaptiveCheckIn({ profile: adapted, weights, intake, today: TODAY, lastCheckInDate: dateAgo(7) });
        expect(result.currentTdee).toBe(formula + 150);
        expect(result.proposedTdee).toBe(formula + 300);
    });

    it('stays close to the truth with noisy weigh-ins', () => {
        const { weights, intake } = simulate({ trueTdee: 2500, noiseKg: 0.8 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(Math.abs(result.observedTdee - 2500)).toBeLessThan(250);
    });

    it('detects a plateau on a cut and lowers the estimate', () => {
        const { weights, intake } = simulate({ intake: 2200, trueTdee: 2200 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(result.plateau).toBe(true);
        expect(result.proposedTdee).toBe(formula - MAX_WEEKLY_CHANGE);
        expect(result.change).toBeLessThan(0);
    });

    it('keeps the formula when there is too little data', () => {
        const { weights, intake } = simulate({ loggedDays: 3 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(result.status).toBe('not_enough_data');
        expect(result.proposedTdee).toBe(formula);
        expect(result.needs.join(' ')).toMatch(/3 so far/);

        const noWeights = adaptiveCheckIn({ profile, weights: [], intake, today: TODAY });
        expect(noWeights.status).toBe('not_enough_data');
    });

    it('does not count days with only one meal logged', () => {
        const { weights, intake } = simulate({ slots: 1 });
        expect(adaptiveCheckIn({ profile, weights, intake, today: TODAY }).loggedDays).toBe(0);
    });

    it('ignores impossible estimates from incomplete logging', () => {
        // Logging 600 kcal a day while weight is stable means most food is not logged.
        const { weights, intake } = simulate({ intake: 600, trueTdee: 600 });
        const result = adaptiveCheckIn({ profile, weights, intake, today: TODAY });
        expect(result.observedTdee).toBe(Math.round(formula * 0.6));
        expect(result.notes.join(' ')).toMatch(/disagree/);
    });

    it('never targets below the calorie floor', () => {
        const small = makeProfile({ gender: 'female', weight: 50, height: 152, age: 45, activityLevel: 1.2, targetRate: 1 });
        const { weights, intake } = simulate({ startWeight: 50, intake: 1100, trueTdee: 1100 });
        const result = adaptiveCheckIn({ profile: small, weights, intake, today: TODAY });
        expect(result.proposedTarget).toBeGreaterThanOrEqual(1200);
    });

    it('is only due once a week', () => {
        const { weights, intake } = simulate({});
        expect(adaptiveCheckIn({ profile, weights, intake, today: TODAY, lastCheckInDate: dateAgo(3) }).due).toBe(false);
        expect(adaptiveCheckIn({ profile, weights, intake, today: TODAY, lastCheckInDate: dateAgo(7) }).due).toBe(true);
    });
});

describe('computeNutritionTargets with adaptive TDEE', () => {
    it('uses the adaptive TDEE when set and keeps the formula value for reference', () => {
        const base = { gender: 'male', age: 30, height: 175, weight: 80, activityLevel: 1.4, goal: 'maintain' };
        const t = computeNutritionTargets({ ...base, adaptive: { tdee: 2600 } });
        expect(t.tdee).toBe(2600);
        expect(t.targetCalories).toBe(2600);
        expect(t.tdeeSource).toBe('adaptive');
        expect(t.formulaTdee).toBe(calculateTDEE(80, 175, 30, 'male', 1.4));
    });

    it('never plans weight loss faster than 1% of body weight a week', () => {
        const t = computeNutritionTargets({ gender: 'male', age: 30, height: 180, weight: 60, activityLevel: 1.9, goal: 'cut', targetRate: 1 });
        expect(-t.adjustment).toBeLessThanOrEqual(Math.round(60 * 0.01 * KCAL_PER_KG / 7));
    });
});
