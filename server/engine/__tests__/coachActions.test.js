import { describe, it, expect } from 'vitest';
import { generateWeekPlan, SLOTS } from '../planner.js';
import { buildShoppingList } from '../shopping.js';
import { diffDays, findRecipes, planEatOutDays, planEventDay, planFreshDays, planSwap } from '../coachActions.js';
import { CATALOGUE, makeProfile, componentIds } from './helpers.js';

const START = '2026-10-19';
const vegetarian = makeProfile({ dietaryPreference: 'vegetarian', allergies: ['peanuts'] });
const plan = generateWeekPlan(vegetarian, CATALOGUE, { startDate: START, seed: 11 });
const target = vegetarian.nutritionTargets.targetCalories;
const byId = new Map(CATALOGUE.map(r => [r.id, r]));

describe('planEventDay', () => {
    const day = planEventDay(plan[2], 'dinner', 'cousin’s wedding', vegetarian, CATALOGUE);

    it('turns the meal into an eating-out budget bigger than the usual dinner', () => {
        expect(day.dinner.eatingOut).toBe(true);
        expect(day.dinner.name).toBe('Eating out: cousin’s wedding');
        expect(day.dinner.calories).toBeGreaterThan(target * 0.3);
        expect(day.dinner.calories).toBeLessThanOrEqual(target * 0.5 + 10);
    });

    it('makes the other meals lighter and keeps the day near the target', () => {
        const before = SLOTS.filter(s => s !== 'dinner').reduce((sum, s) => sum + plan[2][s].calories, 0);
        const after = SLOTS.filter(s => s !== 'dinner').reduce((sum, s) => sum + day[s].calories, 0);
        expect(after).toBeLessThan(before);
        expect(Math.abs(day.totalCalories - target) / target).toBeLessThan(0.06);
    });

    it('keeps meals already eaten exactly as they are', () => {
        const withBreakfastEaten = planEventDay(plan[2], 'dinner', 'wedding', vegetarian, CATALOGUE, ['breakfast']);
        expect(withBreakfastEaten.breakfast).toEqual(plan[2].breakfast);
        expect(Math.abs(withBreakfastEaten.totalCalories - target) / target).toBeLessThan(0.06);
        expect(() => planEventDay(plan[2], 'dinner', 'wedding', vegetarian, CATALOGUE, ['dinner'])).toThrow(/already/);
        const fresh = planFreshDays([plan[2]], vegetarian, CATALOGUE, 5, { [plan[2].date]: ['lunch'] });
        expect(fresh[0].lunch).toEqual(plan[2].lunch);
        const eatOut = planEatOutDays([plan[2]], vegetarian, CATALOGUE, 'trip', { [plan[2].date]: ['breakfast'] });
        expect(eatOut[0].breakfast).toEqual(plan[2].breakfast);
        expect(eatOut[0].lunch.eatingOut).toBe(true);
    });

    it('lists allergies in the eating-out tips', () => {
        expect(day.dinner.instructions.join(' ')).toMatch(/peanuts/);
    });
});

describe('planEatOutDays', () => {
    const days = planEatOutDays(plan.slice(0, 2), vegetarian, CATALOGUE, 'Work trip to Pune');

    it('gives every meal a budget that adds up to the target', () => {
        for (const day of days) {
            expect(SLOTS.every(s => day[s].eatingOut)).toBe(true);
            expect(Math.abs(day.totalCalories - target)).toBeLessThanOrEqual(20);
        }
    });

    it('adds nothing to the shopping list', () => {
        expect(buildShoppingList(days, 1).totalItems).toBe(0);
    });
});

describe('planFreshDays', () => {
    it('replans only the given days with recipes that fit the profile', () => {
        const fresh = planFreshDays(plan.slice(3, 5), vegetarian, CATALOGUE, 99);
        expect(fresh.map(d => d.date)).toEqual([plan[3].date, plan[4].date]);
        for (const id of componentIds(fresh)) {
            const recipe = byId.get(id);
            expect(['vegan', 'vegetarian']).toContain(recipe.dietCategory);
            expect(recipe.allergens).not.toContain('peanuts');
        }
        expect(JSON.stringify(fresh)).not.toBe(JSON.stringify(plan.slice(3, 5)));
    });
});

describe('findRecipes', () => {
    it('ranks recipes by the request and respects diet and allergies', () => {
        const results = findRecipes(vegetarian, CATALOGUE, 'something with paneer', 'dinner');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name.toLowerCase()).toContain('paneer');
        expect(findRecipes(vegetarian, CATALOGUE, 'chicken curry', 'dinner').some(r => r.dietCategory === 'non_veg')).toBe(false);
        expect(findRecipes(vegetarian, CATALOGUE, 'peanut chaat', 'snack').some(r => r.allergens.includes('peanuts'))).toBe(false);
    });

    it('never offers log-only recipes or staples', () => {
        const ids = findRecipes(makeProfile(), CATALOGUE, 'chai samosa roti', null, 20).map(r => r.id);
        expect(ids).not.toContain('masala-chai');
        expect(ids).not.toContain('phulka');
    });
});

describe('diffDays', () => {
    it('lists only the meals that changed', () => {
        const recipe = findRecipes(vegetarian, CATALOGUE, 'paneer', 'lunch')[0];
        const swapped = planSwap(plan[0], 'lunch', recipe, vegetarian, CATALOGUE);
        const diff = diffDays([plan[0]], [swapped]);
        expect(diff).toHaveLength(1);
        expect(diff[0].meals.map(m => m.slot)).toEqual(['lunch']);
        expect(diff[0].meals[0].after.name).toContain(recipe.name.split(' ')[0]);
        expect(diffDays([plan[0]], [plan[0]])).toEqual([]);
    });
});
