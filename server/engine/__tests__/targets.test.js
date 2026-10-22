import { describe, it, expect } from 'vitest';
import { calculateBMR, computeNutritionTargets, normaliseGoal } from '../../../shared/targets.js';

const base = { gender: 'male', age: 25, height: 170, weight: 70, activityLevel: 1.2, goal: 'maintain' };

describe('computeNutritionTargets', () => {
    it('uses Mifflin-St Jeor for BMR', () => {
        expect(calculateBMR(70, 170, 25, 'male')).toBeCloseTo(1642.5, 1);
        expect(calculateBMR(60, 160, 30, 'female')).toBeCloseTo(1289, 0);
        expect(computeNutritionTargets(base).tdee).toBe(1971);
    });

    it('turns the weekly rate into a daily deficit, capped at 25% of TDEE', () => {
        const active = { ...base, activityLevel: 1.725 };
        const tdee = computeNutritionTargets(active).tdee;
        expect(computeNutritionTargets({ ...active, goal: 'cut', targetRate: 0.25 }).adjustment).toBe(-275);
        expect(computeNutritionTargets({ ...active, goal: 'cut', targetRate: 1 }).adjustment).toBe(-Math.round(tdee * 0.25));
    });

    it('never targets less than the calorie floor', () => {
        const t = computeNutritionTargets({ ...base, goal: 'cut', targetRate: 1 });
        expect(t.targetCalories).toBe(1500);
        expect(t.notes.length).toBe(1);
    });

    it('pauses weight loss during pregnancy and adds ICMR extra energy', () => {
        const t = computeNutritionTargets({ ...base, gender: 'female', weight: 60, height: 160, age: 30, goal: 'cut', isPregnant: true });
        expect(t.goal).toBe('maintain');
        expect(t.adjustment).toBe(350);
    });

    it('applies macro profiles', () => {
        const balanced = computeNutritionTargets(base);
        const highProtein = computeNutritionTargets({ ...base, macroProfile: 'high_protein' });
        const lowCarb = computeNutritionTargets({ ...base, macroProfile: 'low_carb' });
        expect(balanced.macros.protein).toBe(84);
        expect(highProtein.macros.protein).toBeGreaterThan(balanced.macros.protein);
        expect(lowCarb.macros.carbs * 4).toBeLessThanOrEqual(lowCarb.targetCalories * 0.25 + 4);
    });

    it('accepts the goal names older screens used', () => {
        expect(normaliseGoal('lose')).toBe('cut');
        expect(normaliseGoal('gain')).toBe('bulk');
        expect(normaliseGoal(undefined)).toBe('maintain');
        expect(computeNutritionTargets({ ...base, goal: 'lose' }).goal).toBe('cut');
    });
});
