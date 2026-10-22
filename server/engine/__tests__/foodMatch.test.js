import { describe, it, expect } from 'vitest';
import { FOOD_TABLE } from '../nutrition.js';
import { buildCatalogue, matchParsedItem, parseServingUnit, portionAmount, resolveItem, searchCatalogue, sumNutrition, tokens } from '../foodMatch.js';
import { generateWeekPlan } from '../planner.js';
import { CATALOGUE, componentIds, makeProfile } from './helpers.js';

const catalogue = buildCatalogue(CATALOGUE, FOOD_TABLE.values());
const recipe = (id) => CATALOGUE.find(r => r.id === id);
const parsed = (dish, quantity, unit, extra = {}) => ({ dish, english: dish, candidates: [], quantity, unit, confidence: 0.9, ...extra });
const match = (...args) => matchParsedItem(catalogue, parsed(...args));

describe('tokens', () => {
    it('maps Hinglish words and spellings to catalogue words', () => {
        expect(tokens('Thoda chawal aur daal')).toEqual(['rice', 'dal']);
        expect(tokens('2 chapatis')).toEqual(['roti']);
        expect(tokens('Anda bhurji')).toEqual(['egg', 'bhurji']);
    });
});

describe('parseServingUnit', () => {
    it('reads counts, countable nouns and containers', () => {
        expect(parseServingUnit('1 katori')).toEqual({ count: 1, noun: 'katori', container: true });
        expect(parseServingUnit('2 parathas + curd')).toEqual({ count: 2, noun: 'paratha', container: false });
        expect(parseServingUnit('1 small handful')).toEqual({ count: 1, noun: 'handful', container: true });
        expect(parseServingUnit('4 idli + sambar')).toMatchObject({ count: 4, noun: 'idli' });
    });
});

describe('matching Hinglish and common dishes', () => {
    it.each([
        ['roti', 2, 'piece', 'phulka'],
        ['chapati', 3, 'piece', 'phulka'],
        ['dal', 1, 'katori', 'dal-tadka'],
        ['thoda chawal', 0.5, 'katori', 'steamed-rice'],
        ['bhindi ki sabzi', 1, 'katori', 'bhindi-masala'],
        ['chicken biryani', 1, 'plate', 'chicken-biryani'],
        ['masala dosa', 1, 'piece', 'masala-dosa'],
        ['sambhar', 1, 'katori', 'sambar'],
        ['chai', 1, 'cup', 'masala-chai'],
        ['samosa', 2, 'piece', 'samosa'],
    ])('"%s" matches recipe %s', (dish, quantity, unit, id) => {
        const { item } = match(dish, quantity, unit);
        expect(item).toMatchObject({ kind: 'recipe', refId: id });
    });

    it.each([
        ['dahi', 'curd'],
        ['kela', 'banana'],
        ['anda', 'egg'],
        ['badam', 'almonds'],
        ['doodh', 'milk'],
    ])('"%s" matches the raw food %s', (dish, id) => {
        expect(match(dish, 1, 'serving').item).toMatchObject({ kind: 'food', refId: id });
    });

    it('prefers an exact catalogue name suggested by the AI', () => {
        const { item } = matchParsedItem(catalogue, parsed('pindi chana', 1, 'katori', { candidates: ['Chole Masala'] }));
        expect(item.refId).toBe('chole-masala');
    });

    it('leaves unknown dishes unmatched instead of guessing', () => {
        const result = match('maggi noodles masala packet', 1, 'plate');
        expect(result.item === null || result.confidence < 0.6).toBe(true);
        expect(match('xyzzy', 1, 'plate').item).toBeNull();
    });

    it('offers alternatives', () => {
        expect(match('dal', 1, 'katori').alternatives.length).toBeGreaterThan(1);
    });
});

describe('portions and nutrition come from the catalogue', () => {
    it('counts rotis as servings of one roti', () => {
        const { item } = match('roti', 2, 'piece');
        expect(item.servings).toBe(2);
        expect(item.nutrition.kcal).toBeCloseTo(recipe('phulka').nutrition.kcal * 2, 0);
    });

    it('converts katori-equivalents between bowls and plates', () => {
        const dal = catalogue.byKey.get('recipe:dal-tadka');
        expect(portionAmount(dal, 1, 'katori').servings).toBe(1);
        expect(portionAmount(dal, 1, 'bowl').servings).toBeCloseTo(250 / 150);
        const biryani = catalogue.byKey.get('recipe:chicken-biryani');
        expect(portionAmount(biryani, 1, 'katori').servings).toBeCloseTo(0.5);
    });

    it('splits multi-piece servings ("4 idli + sambar")', () => {
        expect(match('idli', 3, 'piece').item.servings).toBe(0.75);
    });

    it('converts raw foods to grams', () => {
        const curd = match('dahi', 1, 'katori').item;
        expect(curd.grams).toBe(150);
        expect(curd.nutrition.kcal).toBeCloseTo(FOOD_TABLE.get('curd').per100.kcal * 1.5, 0);
        expect(match('anda', 2, 'piece').item.grams).toBe(100);
    });

    it('ignores any nutrition the AI might send', () => {
        const { item } = matchParsedItem(catalogue, parsed('roti', 1, 'piece', { kcal: 9999, nutrition: { kcal: 9999 } }));
        expect(item.nutrition.kcal).toBe(recipe('phulka').nutrition.kcal);
    });

    it('rejects unknown foods, bad units and absurd amounts', () => {
        expect(resolveItem(catalogue, { kind: 'recipe', refId: 'nope', quantity: 1, unit: 'serving' })).toBeNull();
        expect(resolveItem(catalogue, { kind: 'recipe', refId: 'phulka', quantity: 0, unit: 'piece' })).toBeNull();
        expect(resolveItem(catalogue, { kind: 'recipe', refId: 'phulka', quantity: 500, unit: 'piece' })).toBeNull();
        expect(resolveItem(catalogue, { kind: 'recipe', refId: 'phulka', quantity: 1, unit: 'bucket' })).toBeNull();
        expect(resolveItem(catalogue, { kind: 'food', refId: 'atta', quantity: 100, unit: 'g' })).toBeNull();
    });

    it('sums items', () => {
        const items = [match('roti', 2, 'piece').item, match('dal', 1, 'katori').item];
        expect(sumNutrition(items).kcal).toBeCloseTo(items[0].nutrition.kcal + items[1].nutrition.kcal, 1);
    });
});

describe('searchCatalogue', () => {
    it('ranks the closest names first', () => {
        const results = searchCatalogue(catalogue, 'paneer');
        expect(results[0].name).toBe('Paneer');
        expect(results.some(r => r.refId === 'palak-paneer')).toBe(true);
    });
});

describe('log-only recipes', () => {
    it('are never planned', () => {
        const logOnly = new Set(CATALOGUE.filter(r => r.tags.includes('log-only')).map(r => r.id));
        expect(logOnly.size).toBeGreaterThan(0);
        const plan = generateWeekPlan(makeProfile(), CATALOGUE, { startDate: '2026-10-19', seed: 7 });
        expect(componentIds(plan).filter(id => logOnly.has(id))).toEqual([]);
    });
});
