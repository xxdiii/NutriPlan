import { describe, it, expect } from 'vitest';
import { analyseRecipe, allowedDietCategories, formatQuantity, getFood, FOOD_TABLE } from '../nutrition.js';
import { RECIPES } from '../../data/recipes/index.js';
import { CATALOGUE } from './helpers.js';

describe('analyseRecipe', () => {
    it('sums ingredient nutrients and divides by servings', () => {
        const items = [{ food: 'toor_dal', grams: 100 }, { food: 'ghee', grams: 10 }];
        const { nutrition } = analyseRecipe(items, 2);
        const dal = getFood('toor_dal').per100;
        // Per-serving values are rounded to one decimal.
        expect(Math.abs(nutrition.protein - dal.protein / 2)).toBeLessThanOrEqual(0.05 + 1e-9);
        expect(nutrition.kcal).toBe(Math.round((dal.kcal + 90) / 2));
    });

    it('derives allergens and diet from ingredients', () => {
        const paneer = analyseRecipe([{ food: 'paneer', grams: 100 }, { food: 'atta', grams: 50 }], 1);
        expect(paneer.allergens).toEqual(['dairy', 'wheat']);
        expect(paneer.dietCategory).toBe('vegetarian');

        expect(analyseRecipe([{ food: 'egg', grams: 50 }], 1).dietCategory).toBe('eggetarian');
        expect(analyseRecipe([{ food: 'rohu', grams: 100 }], 1).dietCategory).toBe('pescatarian');
        expect(analyseRecipe([{ food: 'chicken', grams: 100 }, { food: 'rohu', grams: 50 }], 1).dietCategory).toBe('non_veg');
        expect(analyseRecipe([{ food: 'toor_dal', grams: 100 }], 1).dietCategory).toBe('vegan');
    });

    it('flags Jain, onion-garlic-free and fasting-safe recipes', () => {
        const withOnion = analyseRecipe([{ food: 'moong_dal', grams: 100 }, { food: 'onion', grams: 50 }], 1).flags;
        expect(withOnion.jainSafe).toBe(false);
        expect(withOnion.noOnionGarlic).toBe(false);

        const vrat = analyseRecipe([{ food: 'sabudana', grams: 100 }, { food: 'peanuts', grams: 20 }, { food: 'rock_salt', grams: 2 }], 1).flags;
        expect(vrat.vratSafe).toBe(true);
        // Ordinary salt is not used on fasting days.
        expect(analyseRecipe([{ food: 'sabudana', grams: 100 }, { food: 'salt', grams: 2 }], 1).flags.vratSafe).toBe(false);
    });

    it('allows the right diets for each preference', () => {
        expect(allowedDietCategories('vegan')).toEqual(['vegan']);
        expect(allowedDietCategories('vegetarian')).toEqual(['vegan', 'vegetarian']);
        expect(allowedDietCategories('non_veg')).toContain('non_veg');
    });
});

describe('food catalogue', () => {
    it('has nutrient data for every food, with energy consistent with the macros', () => {
        for (const food of FOOD_TABLE.values()) {
            const { kcal, protein, carbs, fat, fibre } = food.per100;
            const atwater = 4 * protein + 9 * fat + 4 * carbs + 2 * fibre;
            if (atwater > 20) expect(Math.abs(kcal - atwater) / atwater, food.key).toBeLessThan(0.25);
        }
    });

    it('formats household quantities', () => {
        expect(formatQuantity('egg', 100)).toBe('2 eggs');
        expect(formatQuantity('tomato', 180)).toBe('2 tomatoes');
        expect(formatQuantity('white_bread', 60)).toBe('2 slices white bread / pav');
        expect(formatQuantity('toor_dal', 160)).toBe('160 g toor dal');
    });
});

describe('curated recipes', () => {
    it('have unique ids and only known ingredients', () => {
        const ids = RECIPES.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        // analyseRecipe throws on unknown foods; building the catalogue ran it for every recipe.
        expect(CATALOGUE.length).toBe(RECIPES.length);
    });

    it('cover every meal slot for vegetarians with at least 30 options', () => {
        const allowed = allowedDietCategories('vegetarian');
        for (const slot of ['breakfast', 'lunch', 'snack', 'dinner']) {
            const count = CATALOGUE.filter(r => r.course !== 'staple' && r.meals.includes(slot) && allowed.includes(r.dietCategory)).length;
            expect(count, slot).toBeGreaterThanOrEqual(30);
        }
    });

    it('have plausible per-serving nutrition', () => {
        for (const r of CATALOGUE) {
            expect(r.nutrition.kcal, r.id).toBeGreaterThan(40);
            expect(r.nutrition.kcal, r.id).toBeLessThan(800);
        }
    });
});
