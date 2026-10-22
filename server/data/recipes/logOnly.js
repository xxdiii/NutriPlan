// Everyday foods people log but the planner should not plan: tea, coffee, street food
// and sweets. `meals: []` keeps them out of every meal slot; they exist so that food
// logging can match them and calculate their nutrition from the ingredients.
// Tea leaves and coffee powder add almost no energy and are left out of the weights.
import { R } from './define.js';

const LOG_ONLY = { meals: [], tags: ['log-only'] };

export default [
    R('masala-chai', 'Masala Chai', 'snack', 'north_indian', 'milk 100, sugar 8, ginger 2, cardamom 0.3',
        ['Boil water with crushed ginger, cardamom and tea leaves.', 'Add milk and sugar and simmer for 2 minutes.', 'Strain.'],
        { ...LOG_ONLY, serves: 1, unit: '1 cup', time: [2, 5] }),
    R('filter-coffee', 'Filter Coffee', 'snack', 'south_indian', 'milk 120, sugar 6',
        ['Brew coffee decoction.', 'Mix with hot milk and sugar and froth by pouring between tumblers.'],
        { ...LOG_ONLY, serves: 1, unit: '1 cup', time: [2, 10] }),
    R('samosa', 'Samosa', 'snack', 'north_indian', 'maida 30, potato 50, green_peas 8, oil 12, cumin 0.5, green_chilli 2, salt 0.5',
        ['Make a stiff maida dough with a little oil.', 'Fill cones with spiced potato and peas.', 'Deep fry on low heat until golden.'],
        { ...LOG_ONLY, serves: 1, unit: '1 samosa', time: [30, 20] }),
    R('vada-pav', 'Vada Pav', 'snack', 'maharashtrian', 'white_bread 45, potato 70, besan 15, oil 12, garlic 2, green_chilli 2, mustard_seeds 0.5, curry_leaves 0.5, salt 0.5',
        ['Make a spiced potato filling and shape into balls.', 'Dip in besan batter and deep fry.', 'Serve inside a pav with chutney.'],
        { ...LOG_ONLY, serves: 1, unit: '1 vada pav', time: [20, 15], regions: ['Maharashtra'] }),
    R('medu-vada', 'Medu Vada', 'snack', 'south_indian', 'urad_dal 25, oil 7, green_chilli 1, curry_leaves 0.5, salt 0.4',
        ['Soak urad dal and grind to a fluffy batter.', 'Shape into rings and deep fry until crisp.'],
        { ...LOG_ONLY, serves: 1, unit: '1 vada', time: [240, 15] }),
    R('plain-omelette', 'Plain Omelette', 'snack', 'international', 'egg 100, onion 15, oil 4, green_chilli 1, salt 0.5',
        ['Beat eggs with onion, chilli and salt.', 'Cook in a hot oiled pan and fold.'],
        { ...LOG_ONLY, serves: 1, unit: '1 omelette', time: [3, 4] }),
    R('bread-butter', 'Bread Butter', 'snack', 'international', 'white_bread 60, butter 8',
        ['Toast the bread if you like and spread with butter.'],
        { ...LOG_ONLY, serves: 1, unit: '2 slices', time: [1, 2] }),
    R('gulab-jamun', 'Gulab Jamun', 'snack', 'north_indian', 'khoa 15, maida 3, ghee 5, sugar 18, cardamom 0.1',
        ['Knead khoa with maida into smooth balls.', 'Fry slowly in ghee until dark brown.', 'Soak in warm cardamom sugar syrup.'],
        { ...LOG_ONLY, serves: 1, unit: '1 piece', time: [15, 20] }),
];
