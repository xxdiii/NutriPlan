// Pack sizes people can buy, in grams (millilitres for liquids), smallest first.
// Loose produce, meat and fish are bought by weight in LOOSE_STEP increments.
// Eggs are counted (grams per egg come from the food catalogue).

export const LOOSE_STEP = 250;
export const LOOSE_GROUPS = new Set(['vegetable', 'green_leafy', 'root_tuber', 'fruit', 'meat', 'fish']);

const BY_GROUP = {
    cereal: [500, 1000],
    pulse: [500, 1000],
    dairy: [500, 1000],
    nut_seed: [100, 250, 500],
    oil_fat: [500, 1000],
    sugar: [500, 1000],
    spice: [50, 100, 200],
    other: [200, 500, 1000],
};

const BY_FOOD = {
    rice: [1000, 5000],
    atta: [1000, 5000],
    parboiled_rice: [1000, 5000],
    white_bread: [400],
    brown_bread: [400],
    milk: [500, 1000],
    curd: [400, 1000],
    paneer: [200, 500],
    butter: [100, 500],
    cheese: [200],
    cream: [200],
    khoa: [250],
    ghee: [200, 500, 1000],
    tofu: [200],
    soya_chunks: [200, 500],
    salt: [1000],
    rock_salt: [200],
    oats: [500, 1000],
    makhana: [100, 250],
    peanut_butter: [350],
    coconut_milk: [200],
    coconut_water: [200],
    noodles: [400],
    ww_pasta: [500],
};

// Foods bought by count: pack sizes in pieces (eggs) or single pieces (lemons).
export const COUNTED = {
    egg: { packs: [6, 12, 30], gramsEach: 50, name: 'egg' },
    // recipes use lemon juice; one lemon gives about 20 ml
    lemon: { packs: [1], gramsEach: 20, name: 'lemon' },
};

/** Pack sizes for a food, or null for loose items. */
export const packSizes = (foodId, group) => BY_FOOD[foodId] || (LOOSE_GROUPS.has(group) ? null : BY_GROUP[group] || [250, 500, 1000]);
