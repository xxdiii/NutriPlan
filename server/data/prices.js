// Retail prices and seasons for cost estimates (F5).
//
// Government data: the Dept. of Consumer Affairs (DoCA) Price Monitoring Cell publishes
// all-India average retail prices for 22 essential commodities each day. The figures
// below were read from https://fcainfoweb.nic.in/ (Price Monitoring System homepage,
// "All India Average Retail Price (₹/Kg) As on 22/10/2026"). DoCA's city-wise reports sit
// behind a captcha, so metro prices for these items are the all-India average plus an
// estimated metro premium.
//
// Every other food uses the metro estimate in data/foods.js; tier-2 cities get a
// discount by food group. All of these are estimates and the app says so.

export const DOCA = {
    date: '2026-10-22',
    source: 'DoCA Price Monitoring Cell, all-India average retail price, 22 Oct 2026 (fcainfoweb.nic.in)',
    // ₹ per kg (DoCA reports oils and milk per kg as well)
    prices: {
        rice: 47.47,
        atta: 37.8,
        chana_dal: 93.17,
        toor_dal: 132.2,
        urad_dal: 125.22,
        moong_dal: 114.24,
        masoor_dal: 90.78,
        sugar: 58.32,
        milk: 61.5,
        // "Cooking oil (groundnut/sunflower)": average of DoCA groundnut 211.52 and sunflower 190.92
        oil: 201.22,
        mustard_oil: 206.18,
        jaggery: 66.73,
        salt: 22.46,
        potato: 22.7,
        onion: 52.81,
        tomato: 40.24,
    },
};

// Metro prices for DoCA items: all-India average plus this estimated premium.
export const METRO_PREMIUM = 1.1;

// Tier-2 city prices for non-DoCA foods, as a share of the metro estimate.
export const TIER2_FACTOR = {
    vegetable: 0.85, green_leafy: 0.85, root_tuber: 0.85, fruit: 0.85,
    dairy: 0.9, egg: 0.9, meat: 0.9, fish: 0.9,
};
export const DEFAULT_TIER2_FACTOR = 0.95;

export const PRICE_TIERS = ['metro', 'tier2'];

/** Metro ₹/kg for DoCA items, used for the stored (default) recipe costs. */
export const metroOverride = (foodId) => (DOCA.prices[foodId] ? Math.round(DOCA.prices[foodId] * METRO_PREMIUM * 10) / 10 : null);

// Fresh produce out of season costs more than this multiple of its usual price.
export const OFF_SEASON_MARKUP = 1.3;

// Approximate national calendar (months 1-12) for produce whose price swings with the
// season, based on typical North and Central Indian mandi arrivals. Produce not listed
// here is treated as available all year.
const WINTER = [11, 12, 1, 2];
export const SEASONS = {
    spinach: [10, 11, 12, 1, 2, 3],
    methi: WINTER,
    mustard_greens: WINTER,
    bathua: WINTER,
    cauliflower: [10, 11, 12, 1, 2, 3],
    cabbage: [10, 11, 12, 1, 2, 3],
    carrot: WINTER,
    radish: WINTER,
    beetroot: WINTER,
    green_peas: WINTER,
    broad_beans: WINTER,
    spring_onion: WINTER,
    lettuce: [11, 12, 1, 2, 3],
    sweet_potato: WINTER,
    french_beans: [10, 11, 12, 1, 2, 3],
    capsicum: [10, 11, 12, 1, 2, 3],
    yam: [10, 11, 12, 1, 2],
    colocasia: [8, 9, 10, 11],
    lauki: [3, 4, 5, 6, 7, 8, 9],
    tinda: [3, 4, 5, 6, 7],
    karela: [3, 4, 5, 6, 7, 8],
    cucumber: [3, 4, 5, 6, 7],
    ridge_gourd: [4, 5, 6, 7, 8, 9],
    snake_gourd: [4, 5, 6, 7, 8, 9],
    parwal: [3, 4, 5, 6, 7],
    bhindi: [4, 5, 6, 7, 8, 9],
    cluster_beans: [6, 7, 8, 9, 10],
    drumstick: [2, 3, 4, 5],
    raw_mango: [3, 4, 5, 6],
    raw_jackfruit: [3, 4, 5, 6],
    mango: [4, 5, 6, 7],
    watermelon: [3, 4, 5, 6],
    guava: [11, 12, 1, 2],
    orange: [12, 1, 2, 3],
    strawberry: [12, 1, 2, 3],
    amla: [11, 12, 1, 2],
    chikoo: [11, 12, 1, 2, 3],
    grapes: [1, 2, 3, 4],
    pomegranate: [9, 10, 11, 12, 1, 2],
    apple: [8, 9, 10, 11, 12],
    pear: [7, 8, 9, 10],
    pineapple: [6, 7, 8, 9],
};
