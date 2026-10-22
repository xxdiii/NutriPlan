// Food logging: match dish names (from Gemini or a search box) to the recipe and food
// catalogue, convert household portions into servings or grams, and calculate
// nutrition from the catalogue. The AI never supplies a number used here.
import { NUTRIENTS } from './nutrition.js';

// ── Catalogue ────────────────────────────────────────────────────────────────

// Raw foods people eat as they are. Flours, dals, spices and the like are only
// ingredients, so "poha" matches the cooked Kanda Poha rather than raw flattened rice.
const LOGGABLE_GROUPS = new Set(['fruit', 'dairy', 'egg', 'nut_seed', 'other']);
const LOGGABLE_FOODS = new Set([
    'white_bread', 'brown_bread', 'cucumber', 'tomato', 'carrot', 'onion', 'beetroot', 'radish',
    'lettuce', 'sweet_corn', 'peanut_butter', 'butter', 'ghee', 'honey', 'jaggery', 'sugar', 'makhana', 'tofu',
]);
const NOT_LOGGABLE = new Set(['lemon', 'tamarind', 'khoa', 'cream', 'coconut_milk', 'dry_coconut', 'poppy_seeds']);

// Typical edible weight of one piece, for foods the catalogue gives no unit for.
// Estimates for portion conversion only.
const PIECE_GRAMS = {
    orange: 130, guava: 100, mango: 200, pear: 150, chikoo: 70, papaya: 120, pomegranate: 150,
    dates: 8, almonds: 1.2, cashews: 1.5, walnuts: 4, pistachios: 0.7, strawberry: 12, avocado: 140,
    cucumber: 200, carrot: 60, beetroot: 100, radish: 100, paneer: 25, makhana: 0.4,
};
// One "serving" of a raw food when the user gives no amount, in grams.
const SERVING_GRAMS = { fruit: 100, dairy: 150, egg: 50, nut_seed: 30, other: 200, sugar: 5, oil_fat: 5, cereal: 30, vegetable: 75 };
const SERVING_OVERRIDES = { milk: 200, coconut_water: 200, peanut_butter: 16, honey: 7, makhana: 20, sugar: 5 };

// Volume (ml, or grams for solids) of household measures. A katori is a small bowl.
export const MEASURES = { katori: 150, bowl: 250, plate: 300, glass: 250, cup: 150, jar: 250, handful: 30, tbsp: 15, tsp: 5 };
const COUNT_UNITS = new Set(['piece', 'slice']);

// ── Text normalisation ───────────────────────────────────────────────────────

// Hindi / Hinglish words and spelling variants mapped to the words the catalogue uses.
const SYNONYMS = {
    chawal: 'rice', chaawal: 'rice', chaval: 'rice', bhaat: 'rice', bhat: 'rice',
    daal: 'dal', dhal: 'dal', dahl: 'dal',
    chapati: 'roti', chapatti: 'roti', chappati: 'roti', fulka: 'roti', phulka: 'roti', rotli: 'roti',
    dahi: 'curd', yogurt: 'curd', yoghurt: 'curd',
    anda: 'egg', ande: 'egg', unda: 'egg',
    doodh: 'milk', dudh: 'milk',
    tea: 'chai', cha: 'chai',
    kela: 'banana', seb: 'apple', aam: 'mango', santra: 'orange', narangi: 'orange', amrood: 'guava', amrud: 'guava',
    papita: 'papaya', angoor: 'grape', tarbooz: 'watermelon', tarbuj: 'watermelon', anar: 'pomegranate',
    chiku: 'chikoo', sapota: 'chikoo', khajur: 'date', khajoor: 'date', kishmish: 'raisin',
    badam: 'almond', kaju: 'cashew', akhrot: 'walnut', moongphali: 'peanut', mungfali: 'peanut', groundnut: 'peanut',
    sabji: 'sabzi', subzi: 'sabzi', subji: 'sabzi', sabjee: 'sabzi', sabzee: 'sabzi',
    gobhi: 'gobi', aaloo: 'aloo', alu: 'aloo', potato: 'aloo',
    parantha: 'paratha', prantha: 'paratha', parotha: 'paratha', parathe: 'paratha',
    chhole: 'chole', idly: 'idli', dosai: 'dosa', sambhar: 'sambar', khichri: 'khichdi', khichadi: 'khichdi',
    biriyani: 'biryani', briyani: 'biryani', pulav: 'pulao', chhaach: 'chaas', chach: 'chaas', buttermilk: 'chaas',
    omelet: 'omelette', omlet: 'omelette', amlet: 'omelette', toast: 'bread', pav: 'bread',
    kheera: 'cucumber', khira: 'cucumber', gajar: 'carrot', tamatar: 'tomato', pyaaz: 'onion', pyaz: 'onion',
    ghee: 'ghee', makkhan: 'butter', shakkar: 'sugar', cheeni: 'sugar', gud: 'jaggery', shahad: 'honey',
};
const STOPWORDS = new Set([
    'with', 'and', 'the', 'a', 'an', 'of', 'in', 'ka', 'ki', 'ke', 'aur', 'plain', 'homemade', 'home', 'made',
    'ghar', 'fresh', 'some', 'thoda', 'small', 'big', 'large', 'medium', 'piece', 'pieces', 'serving', 'indian',
]);

const singular = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

/** "2 Rotis with Chawal" -> ['roti', 'rice'] (deduplicated, synonyms applied). */
export const tokens = (text) => {
    const words = String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z ]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(w => singular(SYNONYMS[w] || SYNONYMS[singular(w)] || w))
        .filter(w => !STOPWORDS.has(w));
    return [...new Set(words)];
};

const bigrams = (s) => {
    const grams = [];
    for (let i = 0; i < s.length - 1; i++) grams.push(s.slice(i, i + 2));
    return grams;
};

/** Dice coefficient over character bigrams, 0-1. */
const charSimilarity = (a, b) => {
    if (a === b) return 1;
    const x = bigrams(a);
    const y = bigrams(b);
    if (!x.length || !y.length) return 0;
    const counts = new Map();
    x.forEach(g => counts.set(g, (counts.get(g) || 0) + 1));
    let shared = 0;
    for (const g of y) {
        if (counts.get(g) > 0) {
            shared++;
            counts.set(g, counts.get(g) - 1);
        }
    }
    return (2 * shared) / (x.length + y.length);
};

// Close spellings of one word count as nearly the same word ("parata" / "paratha").
const tokenSimilarity = (a, b) => {
    if (a === b) return 1;
    if (a.length < 4 || b.length < 4) return 0;
    return charSimilarity(a, b) >= 0.7 ? 0.85 : 0;
};

/** How well a query matches one name, 0-1. */
export const nameScore = (queryTokens, nameTokens) => {
    if (!queryTokens.length || !nameTokens.length) return 0;
    let matched = 0;
    for (const q of queryTokens) matched += Math.max(...nameTokens.map(n => tokenSimilarity(q, n)));
    const tokenDice = (2 * matched) / (queryTokens.length + nameTokens.length);
    const chars = charSimilarity(queryTokens.join(' '), nameTokens.join(' '));
    return 0.75 * tokenDice + 0.25 * chars;
};

// A bare generic word means the everyday version ("dal" is dal tadka, "chai" is masala chai).
const GENERIC_DEFAULTS = {
    rice: 'recipe:steamed-rice', roti: 'recipe:phulka', dal: 'recipe:dal-tadka', sabzi: 'recipe:mix-veg',
    chai: 'recipe:masala-chai', coffee: 'recipe:filter-coffee', curd: 'food:curd', egg: 'food:egg',
    omelette: 'recipe:plain-omelette', paratha: 'recipe:plain-paratha', khichdi: 'recipe:moong-khichdi',
    dosa: 'recipe:plain-dosa', idli: 'recipe:idli-sambar', poha: 'recipe:kanda-poha', upma: 'recipe:rava-upma',
    milk: 'food:milk', lassi: 'recipe:sweet-lassi', chaas: 'recipe:masala-chaas', chole: 'recipe:chole-masala',
    rajma: 'recipe:rajma-masala', kadhi: 'recipe:kadhi-pakora', bread: 'food:white_bread', salad: 'food:cucumber',
    'boiled egg': 'recipe:boiled-eggs', 'egg curry': 'recipe:egg-curry', 'fruit': 'recipe:fruit-bowl',
};
const GENERIC_BY_TOKENS = new Map(Object.entries(GENERIC_DEFAULTS).map(([k, v]) => [tokens(k).join(' '), v]));

// ── Building the catalogue ───────────────────────────────────────────────────

/** "2 parathas + curd" -> { count: 2, noun: 'paratha', container: false } */
export const parseServingUnit = (unit) => {
    const match = /^(\d+(?:\.\d+)?)\s+(.*)$/.exec(String(unit || '').trim());
    const count = match ? Number(match[1]) : 1;
    const head = (match ? match[2] : String(unit || 'serving')).split('+')[0].trim().toLowerCase();
    const container = Object.keys(MEASURES).find(m => head.split(/\s+/).includes(m));
    if (container) return { count, noun: container, container: true };
    const noun = singular(head.split(/\s+/).pop() || 'piece');
    return { count, noun, container: false };
};

// "Phulka (Roti)" is searchable as "phulka roti", "phulka" and "roti".
const nameVariants = (name) => {
    const inner = /\(([^)]+)\)/.exec(name)?.[1];
    const outer = name.replace(/\([^)]*\)/g, ' ');
    return [name, outer, ...(inner ? [inner] : [])].map(tokens).filter(t => t.length);
};

const recipeEntry = (recipe) => ({
    kind: 'recipe',
    id: recipe.id,
    key: `recipe:${recipe.id}`,
    name: recipe.name,
    variants: nameVariants(recipe.name),
    servingUnit: recipe.servingUnit,
    portion: parseServingUnit(recipe.servingUnit),
    per: recipe.nutrition,
    // Raw ingredient grams per serving, only used when someone logs a dish in grams.
    gramsPerServing: recipe.ingredients?.length
        ? recipe.ingredients.reduce((sum, i) => sum + i.grams, 0) / recipe.servings
        : null,
    dietCategory: recipe.dietCategory,
});

const foodEntry = (food) => ({
    kind: 'food',
    id: food.key,
    key: `food:${food.key}`,
    name: food.name,
    variants: nameVariants(food.name),
    group: food.group,
    unitName: food.unit?.name || null,
    pieceGrams: food.unit?.grams || PIECE_GRAMS[food.key] || null,
    servingGrams: SERVING_OVERRIDES[food.key] || food.unit?.grams || SERVING_GRAMS[food.group] || 100,
    per100: food.per100,
});

const isLoggableFood = (food) =>
    !NOT_LOGGABLE.has(food.key) && (LOGGABLE_GROUPS.has(food.group) || LOGGABLE_FOODS.has(food.key));

/**
 * @param recipes  engine-shaped recipes (curated and the user's own)
 * @param foods    FOOD_TABLE values
 */
export const buildCatalogue = (recipes, foods) => {
    const entries = [
        ...recipes.map(recipeEntry),
        ...[...foods].filter(isLoggableFood).map(foodEntry),
    ];
    return {
        entries,
        byKey: new Map(entries.map(e => [e.key, e])),
        byName: new Map(entries.map(e => [e.name.toLowerCase(), e])),
    };
};

/** Names the AI may copy into its candidates. */
export const catalogueNames = (catalogue) => catalogue.entries.map(e => e.name);

// ── Matching ─────────────────────────────────────────────────────────────────

const MATCH_THRESHOLD = 0.5;
const ALTERNATIVE_THRESHOLD = 0.3;

const entryScore = (entry, queryTokens) => Math.max(...entry.variants.map(v => nameScore(queryTokens, v)));

/**
 * Catalogue entries ranked against one or more query strings.
 * @param queries [{ text, weight }]
 */
const rank = (catalogue, queries) => {
    const scores = new Map();
    const bump = (entry, score) => {
        if (score > (scores.get(entry.key)?.score ?? 0)) scores.set(entry.key, { entry, score });
    };
    for (const { text, weight = 1 } of queries) {
        const exact = catalogue.byName.get(String(text || '').trim().toLowerCase());
        if (exact) bump(exact, weight);
        const q = tokens(text);
        if (!q.length) continue;
        const generic = GENERIC_BY_TOKENS.get(q.join(' '));
        if (generic && catalogue.byKey.has(generic)) bump(catalogue.byKey.get(generic), 0.97 * weight);
        for (const entry of catalogue.entries) bump(entry, entryScore(entry, q) * weight);
    }
    return [...scores.values()].sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
};

export const searchCatalogue = (catalogue, query, limit = 8) =>
    rank(catalogue, [{ text: query }])
        .filter(r => r.score >= ALTERNATIVE_THRESHOLD)
        .slice(0, limit)
        .map(({ entry, score }) => ({ ...summary(entry), score: Math.round(score * 100) / 100 }));

const summary = (entry) => ({
    kind: entry.kind,
    refId: entry.id,
    name: entry.name,
    portion: entry.kind === 'recipe' ? entry.servingUnit : entry.unitName ? `1 ${entry.unitName}` : '100 g',
});

// ── Portions ─────────────────────────────────────────────────────────────────

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Convert a logged portion into recipe servings or food grams.
 * @returns { servings } for recipes, { grams } for foods, plus `approximate` when the
 *          unit had to be guessed (e.g. a countable dish logged in grams)
 */
export const portionAmount = (entry, quantity, unit) => {
    const q = Number(quantity);
    if (entry.kind === 'recipe') {
        const { count, noun, container } = entry.portion;
        if (unit === 'serving') return { servings: q, approximate: false };
        if (container) {
            if (MEASURES[unit]) return { servings: (q * MEASURES[unit]) / (count * MEASURES[noun]), approximate: false };
            if (unit === 'g' || unit === 'ml') return { servings: q / (count * MEASURES[noun]), approximate: true };
            return { servings: q, approximate: true };
        }
        if (COUNT_UNITS.has(unit) || unit === noun) return { servings: q / count, approximate: false };
        if ((unit === 'g' || unit === 'ml') && entry.gramsPerServing) return { servings: q / entry.gramsPerServing, approximate: true };
        return { servings: q, approximate: true };
    }
    if (unit === 'g' || unit === 'ml') return { grams: q, approximate: false };
    if (unit === 'serving') return { grams: q * entry.servingGrams, approximate: false };
    if (COUNT_UNITS.has(unit) || unit === entry.unitName) {
        return entry.pieceGrams ? { grams: q * entry.pieceGrams, approximate: false } : { grams: q * entry.servingGrams, approximate: true };
    }
    if (MEASURES[unit]) return { grams: q * MEASURES[unit], approximate: false };
    return { grams: q * entry.servingGrams, approximate: true };
};

/** Nutrition of a portion, from the catalogue values. */
export const portionNutrition = (entry, amount) => {
    const factor = entry.kind === 'recipe' ? amount.servings : amount.grams / 100;
    const per = entry.kind === 'recipe' ? entry.per : entry.per100;
    return Object.fromEntries(NUTRIENTS.map(n => [n, round1((per[n] || 0) * factor)]));
};

const FOOD_UNITS = {
    fruit: ['piece', 'katori', 'bowl', 'g'],
    dairy: ['glass', 'cup', 'katori', 'tbsp', 'g'],
    egg: ['piece', 'g'],
    nut_seed: ['handful', 'piece', 'tbsp', 'g'],
    other: ['glass', 'cup', 'ml'],
    sugar: ['tsp', 'tbsp', 'g'],
    oil_fat: ['tsp', 'tbsp', 'g'],
    cereal: ['slice', 'g'],
};

/** Units the confirmation card offers for an entry: [{ value, label }]. */
export const unitOptions = (entry) => {
    if (entry.kind === 'recipe') {
        const { noun, container } = entry.portion;
        const serving = { value: 'serving', label: `serving (${entry.servingUnit})` };
        if (!container) return [{ value: 'piece', label: noun }, serving, { value: 'g', label: 'g' }];
        const measures = noun === 'glass' || noun === 'cup' ? ['glass', 'cup', 'ml'] : ['katori', 'bowl', 'plate', 'g'];
        return [...measures.map(m => ({ value: m, label: m })), serving];
    }
    const units = FOOD_UNITS[entry.group] || ['piece', 'katori', 'g'];
    return units
        .filter(u => u !== 'piece' || entry.pieceGrams)
        .map(u => ({ value: u, label: u === 'piece' && entry.unitName ? entry.unitName : u }))
        .concat({ value: 'serving', label: `serving (${entry.servingGrams} g)` });
};

const MAX_QUANTITY = { g: 3000, ml: 3000 };

/**
 * Validate one logged item and calculate its nutrition.
 * @param item { kind, refId, quantity, unit }
 * @returns resolved item, or null when the entry or amount is invalid
 */
export const resolveItem = (catalogue, item) => {
    const entry = catalogue.byKey.get(`${item?.kind}:${item?.refId}`);
    const quantity = Number(item?.quantity);
    const unit = String(item?.unit || 'serving');
    const valid = entry && quantity > 0 && quantity <= (MAX_QUANTITY[unit] || 30)
        && (unit === 'serving' || unit === 'g' || unit === 'ml' || COUNT_UNITS.has(unit) || MEASURES[unit]);
    if (!valid) return null;
    const amount = portionAmount(entry, quantity, unit);
    const options = unitOptions(entry);
    return {
        kind: entry.kind,
        refId: entry.id,
        name: entry.name,
        quantity,
        unit,
        ...(amount.servings !== undefined ? { servings: Math.round(amount.servings * 100) / 100 } : { grams: Math.round(amount.grams) }),
        approximate: amount.approximate,
        nutrition: portionNutrition(entry, amount),
        unitOptions: options.some(o => o.value === unit) ? options : [...options, { value: unit, label: unit }],
    };
};

/**
 * Match one AI-parsed item to the catalogue.
 * @param parsed { dish, english, candidates[], quantity, unit, confidence }
 */
export const matchParsedItem = (catalogue, parsed) => {
    const ranked = rank(catalogue, [
        { text: parsed.dish },
        { text: parsed.english },
        ...(parsed.candidates || []).map(text => ({ text, weight: 0.95 })),
    ]);
    const best = ranked[0];
    const matched = best && best.score >= MATCH_THRESHOLD ? best.entry : null;
    const alternatives = ranked
        .filter(r => r.score >= ALTERNATIVE_THRESHOLD && r.entry !== matched)
        .slice(0, 4)
        .map(r => summary(r.entry));

    let resolved = null;
    if (matched) {
        resolved = resolveItem(catalogue, { kind: matched.kind, refId: matched.id, quantity: parsed.quantity, unit: parsed.unit })
            || resolveItem(catalogue, { kind: matched.kind, refId: matched.id, quantity: 1, unit: 'serving' });
    }
    return {
        dish: parsed.dish,
        // Shown to the user: the AI's confidence in what it saw, lowered when the name match is loose.
        confidence: Math.round(parsed.confidence * Math.min(1, (best?.score || 0) / 0.8) * 100) / 100,
        item: resolved,
        alternatives,
    };
};

/** Sum of item nutrition, rounded for storage. */
export const sumNutrition = (items) => {
    const totals = Object.fromEntries(NUTRIENTS.map(n => [n, 0]));
    for (const item of items) for (const n of NUTRIENTS) totals[n] += item.nutrition?.[n] || 0;
    return Object.fromEntries(NUTRIENTS.map(n => [n, round1(totals[n])]));
};
