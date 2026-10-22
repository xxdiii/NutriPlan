import { describe, it, expect } from 'vitest';
import { applyPrices, buildPriceRows, costPer10gProtein, inSeason, priceTable, proteinForMoney, recipeCost } from '../cost.js';
import { budgetSummary, fitToBudget, planCost, planWeek } from '../budget.js';
import { buyFor, buildShoppingList, choosePacks, shoppingListText } from '../shopping.js';
import { budgetPerPersonPerDay, generateWeekPlan, SLOTS } from '../planner.js';
import { getFood } from '../nutrition.js';
import { DOCA, METRO_PREMIUM } from '../../data/prices.js';
import { CATALOGUE, componentIds, makeProfile } from './helpers.js';

const OCTOBER = priceTable({ tier: 'metro', month: 10 });
const priced = applyPrices(CATALOGUE, OCTOBER);
const byId = new Map(priced.map(r => [r.id, r]));
const START = '2026-10-19';

describe('prices', () => {
    it('uses government averages for tier-2 and a metro premium on top', () => {
        const rows = buildPriceRows();
        const dal = (tier) => rows.find(r => r.foodId === 'toor_dal' && r.tier === tier);
        expect(dal('tier2').priceInr).toBe(DOCA.prices.toor_dal);
        expect(dal('metro').priceInr).toBeCloseTo(DOCA.prices.toor_dal * METRO_PREMIUM, 1);
        expect(dal('tier2').source).toMatch(/DoCA/);
        const paneer = (tier) => rows.find(r => r.foodId === 'paneer' && r.tier === tier);
        expect(paneer('tier2').priceInr).toBeLessThan(paneer('metro').priceInr);
        expect(paneer('metro').source).toMatch(/Estimate/);
    });

    it('charges more for produce out of season', () => {
        expect(inSeason('green_peas', 1)).toBe(true);
        expect(inSeason('green_peas', 6)).toBe(false);
        expect(inSeason('rice', 6)).toBe(true);
        const june = priceTable({ month: 6 });
        const january = priceTable({ month: 1 });
        expect(june.get('green_peas').price).toBeGreaterThan(january.get('green_peas').price);
        expect(june.get('green_peas').inSeason).toBe(false);
    });

    it('costs a recipe as the sum of its ingredients', () => {
        const dal = CATALOGUE.find(r => r.id === 'dal-tadka');
        const expected = dal.ingredients.reduce((sum, i) => sum + (i.grams / 1000) * OCTOBER.get(i.foodId).price, 0) / dal.servings;
        expect(recipeCost(dal, OCTOBER)).toBeCloseTo(expected, 6);
        expect(byId.get('dal-tadka').costInr).toBeCloseTo(expected, 1);
        // Tier-2 prices make the same recipe cheaper.
        expect(recipeCost(dal, priceTable({ tier: 'tier2', month: 10 }))).toBeLessThan(expected);
    });

    it('ranks protein for money and respects the diet', () => {
        const list = proteinForMoney(OCTOBER, { dietaryPreference: 'vegetarian' });
        const rank = (id) => list.findIndex(f => f.foodId === id);
        expect(rank('soya_chunks')).toBeLessThan(rank('paneer'));
        expect(rank('masoor_dal')).toBeLessThan(rank('paneer'));
        expect(list.some(f => ['chicken', 'egg', 'rohu'].includes(f.foodId))).toBe(false);
        expect(proteinForMoney(OCTOBER, { dietaryPreference: 'vegan', allergies: ['soy'] }).some(f => f.foodId === 'soya_chunks')).toBe(false);
        expect(costPer10gProtein(30, 15)).toBe(20);
        expect(costPer10gProtein(30, 1)).toBeNull();
    });
});

describe('budgets', () => {
    it('uses a weekly household budget when set', () => {
        expect(budgetPerPersonPerDay({ budget: 'low' })).toBe(100);
        expect(budgetPerPersonPerDay({ weeklyBudget: 1400, servings: 2 })).toBe(100);
    });

    it('brings a plan within a tight budget without breaking nutrition or diet', () => {
        const profile = makeProfile({ dietaryPreference: 'vegetarian', allergies: ['peanuts'], weeklyBudget: 420 });
        const raw = generateWeekPlan(profile, priced, { startDate: START, seed: 3 });
        const { plan, cost, budget, fits, swaps } = fitToBudget(raw, profile, priced);

        expect(planCost(raw)).toBeGreaterThan(budget);
        expect(fits).toBe(true);
        expect(cost).toBeLessThanOrEqual(budget);
        expect(swaps).toBeGreaterThan(0);
        const target = profile.nutritionTargets.targetCalories;
        for (const day of plan) expect(Math.abs(day.totalCalories - target) / target).toBeLessThan(0.05);
        for (const id of componentIds(plan)) {
            expect(['vegan', 'vegetarian']).toContain(byId.get(id).dietCategory);
            expect(byId.get(id).allergens).not.toContain('peanuts');
        }
    });

    it('leaves a plan alone when it already fits', () => {
        const profile = makeProfile({ budget: 'high' });
        const raw = generateWeekPlan(profile, priced, { startDate: START, seed: 3 });
        const result = fitToBudget(raw, profile, priced);
        expect(result.swaps).toBe(0);
        expect(componentIds(result.plan)).toEqual(componentIds(raw));
    });

    it('reports when the budget cannot be met', () => {
        const profile = makeProfile({ weeklyBudget: 50 });
        const result = planWeek(profile, priced, { startDate: START, seed: 3 });
        expect(result.fits).toBe(false);
        expect(result.cost).toBeGreaterThan(result.budget);
    });

    it('never swaps eating-out meals or batch-cooked leftovers', () => {
        const profile = makeProfile({ weeklyBudget: 300, mealPrepPreference: 'batch_3' });
        const raw = generateWeekPlan(profile, priced, { startDate: START, seed: 4 });
        raw[1] = { ...raw[1], dinner: { ...raw[1].dinner, eatingOut: true, components: [], costInr: 0 } };
        const { plan } = fitToBudget(raw, profile, priced);
        expect(plan[1].dinner.eatingOut).toBe(true);
        raw.forEach((day, d) => {
            if (day.lunch?.leftover) expect(plan[d].lunch.components.map(c => c.id)).toEqual(day.lunch.components.map(c => c.id));
        });
    });

    it('summarises the budget for the household', () => {
        const profile = makeProfile({ weeklyBudget: 2800, servings: 2 });
        const { plan } = planWeek(profile, priced, { startDate: START, seed: 3 });
        const summary = budgetSummary(plan, profile);
        expect(summary).toMatchObject({ source: 'custom', people: 2, weeklyBudget: 2800, budgetPerPersonPerDay: 200, fits: true });
        expect(summary.planCost).toBe(Math.round(planCost(plan) * 2));
    });
});

describe('use it up first', () => {
    it('schedules pantry items that expire soon early in the week', () => {
        const profile = makeProfile({ dietaryPreference: 'vegetarian' });
        const uses = (plan, foodId, lastDay) => plan.slice(0, lastDay + 1)
            .flatMap(day => SLOTS.flatMap(slot => day[slot]?.ingredientItems || []))
            .filter(i => i.foodId === foodId).length;
        let withUseUp = 0;
        let without = 0;
        for (const seed of [1, 2, 3, 4, 5]) {
            without += uses(generateWeekPlan(profile, priced, { startDate: START, seed }), 'paneer', 1);
            withUseUp += uses(generateWeekPlan(profile, priced, { startDate: START, seed, useUp: new Map([['paneer', 1]]) }), 'paneer', 1);
        }
        expect(withUseUp).toBeGreaterThan(without);
    });
});

describe('shopping packs and pantry', () => {
    it('chooses packs with the least waste, then the fewest packs', () => {
        expect(choosePacks([500, 1000], 820)).toEqual([{ size: 1000, count: 1 }]);
        expect(choosePacks([500, 1000], 1300)).toEqual([{ size: 1000, count: 1 }, { size: 500, count: 1 }]);
        expect(choosePacks([1000, 5000], 4200)).toEqual([{ size: 5000, count: 1 }]);
        expect(choosePacks([200, 500], 0)).toEqual([]);
    });

    it('describes what to buy', () => {
        expect(buyFor('toor_dal', 820)).toEqual({ label: '1 kg', grams: 1000, leftover: 180 });
        expect(buyFor('egg', 400).label).toBe('12 eggs');
        expect(buyFor('lemon', 45).label).toBe('3 lemons');
        expect(buyFor('spinach', 130)).toMatchObject({ label: '250 g', grams: 250 });
        expect(buyFor('milk', 3100).label).toBe('3 × 1 L + 500 ml');
    });

    it('subtracts the pantry and prices what you buy', () => {
        const week = generateWeekPlan(makeProfile(), priced, { startDate: START, seed: 2 });
        const full = buildShoppingList(week, 1, { prices: OCTOBER });
        const [first, second] = full.allIngredients;
        const pantry = new Map([[first.foodId, { grams: null }], [second.foodId, { grams: second.grams / 2, expiresOn: '2026-10-21' }]]);
        const list = buildShoppingList(week, 1, { prices: OCTOBER, pantry });
        const item = (id) => list.allIngredients.find(i => i.foodId === id);

        expect(item(first.foodId)).toMatchObject({ status: 'in_pantry', buy: null, needGrams: 0 });
        expect(item(second.foodId).status).toBe('partial');
        expect(item(second.foodId).needGrams).toBe(Math.round(second.grams - second.grams / 2));
        expect(list.toBuy).toBe(full.toBuy - 1);
        expect(list.cost.total).toBeLessThan(full.cost.total);
        const anyBuy = list.allIngredients.find(i => i.buy);
        expect(anyBuy.buy.costInr).toBe(Math.round((anyBuy.buy.grams / 1000) * OCTOBER.get(anyBuy.foodId).price));
    });

    it('shares as text without pantry items', () => {
        const week = generateWeekPlan(makeProfile(), priced, { startDate: START, seed: 2 });
        const full = buildShoppingList(week, 1, { prices: OCTOBER });
        const first = full.allIngredients[0];
        const list = buildShoppingList(week, 1, { prices: OCTOBER, pantry: new Map([[first.foodId, { grams: null }]]) });
        const text = shoppingListText(list);
        expect(text).toMatch(/^\*NutriPlan shopping list\*/);
        expect(text).not.toContain(getFood(first.foodId).name);
        expect(text).toMatch(/Approx\. ₹/);
    });
});
