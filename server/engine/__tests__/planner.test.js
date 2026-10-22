import { describe, it, expect } from 'vitest';
import { generateWeekPlan, rankAlternatives, swapMeal, describePortion, dayTotals } from '../planner.js';
import { buildShoppingList } from '../shopping.js';
import { CATALOGUE, makeProfile, componentIds, SLOTS } from './helpers.js';

const byId = new Map(CATALOGUE.map(r => [r.id, r]));
const plan = (overrides, seed = 7) => generateWeekPlan(makeProfile(overrides), CATALOGUE, { startDate: '2026-10-22', seed });

describe('generateWeekPlan', () => {
    it('plans 7 consecutive days with all four meals', () => {
        const week = plan({});
        expect(week.map(d => d.date)).toEqual(['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
        expect(week[0].day).toBe('Thursday');
        for (const day of week) for (const slot of SLOTS) expect(day[slot], `${day.date} ${slot}`).toBeTruthy();
    });

    it.each([
        ['vegetarian maintain', { dietaryPreference: 'vegetarian' }],
        ['vegan cut', { dietaryPreference: 'vegan', goal: 'cut' }],
        ['non-veg bulk', { goal: 'bulk', activityLevel: 1.55 }],
        ['small woman', { gender: 'female', weight: 52, height: 155, age: 40 }],
        ['family of 3, batch cooking', { servings: 3, mealPrepPreference: 'batch_3' }],
    ])('keeps every day within 6%% of the calorie target (%s)', (_, overrides) => {
        const profile = makeProfile(overrides);
        const week = generateWeekPlan(profile, CATALOGUE, { startDate: '2026-10-22', seed: 3 });
        for (const day of week) {
            const ratio = day.totalCalories / profile.nutritionTargets.targetCalories;
            expect(ratio, day.date).toBeGreaterThan(0.94);
            expect(ratio, day.date).toBeLessThan(1.06);
        }
    });

    it('only uses recipes allowed by the diet', () => {
        for (const id of componentIds(plan({ dietaryPreference: 'vegetarian' }))) {
            expect(['vegan', 'vegetarian'], id).toContain(byId.get(id).dietCategory);
        }
        for (const id of componentIds(plan({ dietaryPreference: 'vegan' }))) {
            expect(byId.get(id).dietCategory, id).toBe('vegan');
        }
    });

    it('never includes an allergen the user has', () => {
        const week = plan({ allergies: ['wheat', 'dairy', 'peanuts'] });
        for (const id of componentIds(week)) {
            expect(byId.get(id).allergens, id).not.toEqual(expect.arrayContaining(['wheat']));
            expect(byId.get(id).allergens, id).not.toContain('dairy');
            expect(byId.get(id).allergens, id).not.toContain('peanuts');
        }
    });

    it('skips disliked foods and recipes', () => {
        const week = plan({ dislikedFoods: 'paneer, Brinjal', dislikedRecipes: ['kanda-poha'] });
        for (const id of componentIds(week)) {
            const foods = byId.get(id).ingredients.map(i => i.foodId);
            expect(foods, id).not.toContain('paneer');
            expect(foods, id).not.toContain('brinjal');
            expect(id).not.toBe('kanda-poha');
        }
    });

    it('keeps advanced recipes away from beginners', () => {
        for (const id of componentIds(plan({ cookingSkill: 'beginner' }))) {
            expect(byId.get(id).difficulty, id).not.toBe('advanced');
        }
    });

    it('gives a different plan for a different seed and the same plan for the same seed', () => {
        const ids = (seed) => componentIds(plan({}, seed)).join(',');
        expect(ids(1)).toBe(ids(1));
        expect(ids(1)).not.toBe(ids(2));
    });

    it('serves yesterday\'s batch-friendly dinner as lunch when batch cooking', () => {
        const week = plan({ mealPrepPreference: 'batch_3', dietaryPreference: 'vegetarian' });
        const leftovers = week.filter(day => day.lunch.leftover);
        expect(leftovers.length).toBeGreaterThan(0);
        for (const day of leftovers) {
            const yesterday = week.find(d => d.date === day.lunch.leftoverFrom);
            expect(day.lunch.recipeId).toBe(yesterday.dinner.recipeId);
        }
    });

    it('prefers lower glycaemic load for diabetes', () => {
        const avgGl = (overrides) => {
            const week = plan(overrides);
            return week.reduce((sum, d) => sum + SLOTS.reduce((s, slot) => s + d[slot].glycaemicLoad, 0), 0) / week.length;
        };
        expect(avgGl({ healthConditions: ['diabetes_t2'] })).toBeLessThan(avgGl({}));
    });

    it('reports per-person nutrition and household ingredient amounts', () => {
        const single = plan({ servings: 1 });
        const family = plan({ servings: 4 });
        expect(family[0].totalCalories).toBe(single[0].totalCalories);
        expect(family[0].breakfast.servings).toBe(4);
    });
});

describe('swaps and alternatives', () => {
    it('re-portions a swapped meal to the calories it replaces', () => {
        const profile = makeProfile({ dietaryPreference: 'vegetarian' });
        const [day] = generateWeekPlan(profile, CATALOGUE, { startDate: '2026-10-22', seed: 5 });
        const swapped = swapMeal(day, 'lunch', byId.get('rajma-masala'), profile, CATALOGUE);
        expect(swapped.lunch.recipeId).toBe('rajma-masala');
        expect(Math.abs(swapped.lunch.calories - day.lunch.calories) / day.lunch.calories).toBeLessThan(0.12);
        expect(swapped.totalCalories).toBe(dayTotals(swapped).totalCalories);
    });

    it('offers only allowed alternatives', () => {
        const profile = makeProfile({ dietaryPreference: 'vegan' });
        const [day] = generateWeekPlan(profile, CATALOGUE, { startDate: '2026-10-22', seed: 5 });
        const options = rankAlternatives(profile, CATALOGUE, 'dinner', day.dinner);
        expect(options.length).toBe(6);
        for (const meal of options) expect(meal.dietCategory).toBe('vegan');
    });
});

describe('describePortion', () => {
    it('writes portions the way people measure food', () => {
        expect(describePortion('1 katori', 1.75, 'Sambar')).toBe('1¾ katori sambar');
        expect(describePortion('1 roti', 3, 'Phulka (Roti)')).toBe('3 roti');
        expect(describePortion('2 parathas + curd', 0.5, 'Aloo Paratha')).toBe('1 paratha + curd');
        expect(describePortion('3 chillas', 5 / 3, 'Besan Chilla')).toBe('5 chillas');
    });
});

describe('buildShoppingList', () => {
    it('scales quantities to the household and prices them', () => {
        const week = plan({});
        const one = buildShoppingList(week, 1);
        const four = buildShoppingList(week, 4);
        const grams = (list, id) => list.allIngredients.find(i => i.foodId === id)?.grams;
        const someFood = one.allIngredients[0].foodId;
        expect(grams(four, someFood)).toBeCloseTo(grams(one, someFood) * 4, -1);
        expect(four.cost.total).toBeGreaterThan(one.cost.total * 3.5);
        expect(one.cost.perPersonPerDay).toBeGreaterThan(0);
    });
});
