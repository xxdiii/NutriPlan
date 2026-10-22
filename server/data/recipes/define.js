// Compact recipe definition helper.
//
// R(id, name, course, cuisine, ingredients, steps, options)
//   course       'staple' | 'main' | 'complete' | 'breakfast' | 'snack'
//                staple   eaten with a main (roti, rice, bhakri); one serving = one unit
//                main     dal / sabzi / curry, served with a staple at lunch or dinner
//                complete one-dish lunch or dinner (biryani, khichdi, curd rice)
//   ingredients  "food_key grams, food_key grams, ..." for the WHOLE recipe;
//                pulses, grains and meat are raw/dry weights
//   options      serves   servings the ingredients make
//                unit     what one serving looks like ("1 katori", "2 dosa + chutney")
//                time     [prep minutes, cook minutes]
//                diff     'beginner' | 'intermediate' | 'advanced'
//                pairs    staple groups a main goes with: 'roti' | 'rice' | 'bhakri' | 'makki' | 'vrat'
//                group    for staples, which pairing group they belong to
//                meals    override the meal slots derived from the course
//                regions  Indian states where the dish is a regional staple
//                tags     free-form labels
//                batch    keeps well for 2-3 days (cook once, eat twice)

const DEFAULTS = {
    staple: { serves: 1, unit: '1 piece', time: [5, 10], diff: 'beginner' },
    main: { serves: 4, unit: '1 katori', time: [10, 25], diff: 'beginner', pairs: ['roti', 'rice'] },
    complete: { serves: 4, unit: '1 plate', time: [15, 30], diff: 'intermediate' },
    breakfast: { serves: 2, unit: '1 plate', time: [10, 15], diff: 'beginner' },
    snack: { serves: 2, unit: '1 bowl', time: [5, 10], diff: 'beginner' },
};

const MEALS = {
    staple: [],
    main: ['lunch', 'dinner'],
    complete: ['lunch', 'dinner'],
    breakfast: ['breakfast'],
    snack: ['snack'],
};

const parseIngredients = (spec, id) => spec.split(',').map(part => {
    const [food, grams] = part.trim().split(/\s+/);
    const value = Number(grams);
    if (!food || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Recipe ${id}: bad ingredient "${part.trim()}"`);
    }
    return { food, grams: value };
});

export const R = (id, name, course, cuisine, ingredients, steps, options = {}) => {
    if (!DEFAULTS[course]) throw new Error(`Recipe ${id}: unknown course ${course}`);
    const opts = { ...DEFAULTS[course], ...options };
    return {
        id,
        name,
        course,
        cuisine,
        ingredients: parseIngredients(ingredients, id),
        steps,
        serves: opts.serves,
        unit: opts.unit,
        prepTime: opts.time[0],
        cookTime: opts.time[1],
        difficulty: opts.diff,
        pairs: course === 'main' ? opts.pairs : [],
        group: opts.group || null,
        meals: opts.meals || MEALS[course],
        regions: opts.regions || [],
        tags: opts.tags || [],
        batchFriendly: Boolean(opts.batch),
    };
};
