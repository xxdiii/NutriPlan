// Ingredient catalogue: every ingredient a recipe may use.
//
// Nutrition comes from the Indian Food Composition Tables 2017 (ICMR-NIN), referenced
// by IFCT food code, and is extracted into ifct-foods.json by scripts/extract-ifct.js.
// Foods IFCT does not cover (curd, oats, sabudana, bread, ...) carry their own values
// per 100 g with the reference they came from. Carbohydrate is always *available*
// carbohydrate (total minus fibre), matching IFCT.
//
// Entry: [key, display name, source, ICMR food group, options]
//   source   IFCT code (e.g. 'B021') or a supplemental nutrient block (see sup())
//   options  allergens   allergen ids from src/utils/constants.js ALLERGENS
//            animal      'dairy' | 'egg' | 'meat' | 'fish' | 'shellfish' | 'honey'
//            flags       'root' (avoided in Jain diets), 'allium' (onion/garlic family),
//                        'mushroom', 'vrat' (allowed on common Hindu fasting days),
//                        'goitrogen' (hypothyroid caution)
//            gi          glycaemic index estimate (International GI Tables, Atkinson et al.
//                        2021, and Indian studies). Only set for carbohydrate-rich foods.
//            price       approximate retail price, ₹ per kg (₹ per litre for liquids),
//                        metro averages 2025-26. Used for cost estimates only.
//            unit        [name, grams] household unit used when displaying quantities

const sup = (ref, kcal, protein, carbs, fat, fibre = 0, sugar = 0, sodium = 0, iron = 0, calcium = 0, vitC = 0, folate = 0) =>
  ({ ref, kcal, protein, carbs, fat, fibre, sugar, sodium, iron, calcium, vitC, folate });

const VRAT = ['vrat'];

export const FOOD_GROUPS = [
  'cereal', 'pulse', 'dairy', 'egg', 'meat', 'fish', 'green_leafy', 'vegetable',
  'root_tuber', 'fruit', 'nut_seed', 'oil_fat', 'sugar', 'spice', 'other',
];

export const FOODS = [
  // ── Cereals and millets ─────────────────────────────────────────────────────
  ['rice', 'Rice', 'A015', 'cereal', { gi: 73, price: 55 }],
  ['brown_rice', 'Brown rice', 'A013', 'cereal', { gi: 68, price: 110 }],
  ['parboiled_rice', 'Parboiled rice (idli rice)', 'A014', 'cereal', { gi: 62, price: 50 }],
  ['poha', 'Poha (flattened rice)', 'A011', 'cereal', { gi: 64, price: 70 }],
  ['murmura', 'Murmura (puffed rice)', 'A012', 'cereal', { gi: 82, price: 90 }],
  ['atta', 'Whole wheat atta', 'A019', 'cereal', { allergens: ['wheat'], gi: 62, price: 45 }],
  ['maida', 'Maida (refined flour)', 'A018', 'cereal', { allergens: ['wheat'], gi: 75, price: 45 }],
  ['rava', 'Rava (semolina)', 'A022', 'cereal', { allergens: ['wheat'], gi: 66, price: 55 }],
  ['vermicelli', 'Vermicelli (semiya)', 'A023', 'cereal', { allergens: ['wheat'], gi: 58, price: 120 }],
  ['dalia', 'Dalia (broken wheat)', 'A021', 'cereal', { allergens: ['wheat'], gi: 46, price: 60 }],
  ['jowar', 'Jowar flour', 'A005', 'cereal', { gi: 62, price: 60 }],
  ['bajra', 'Bajra flour', 'A003', 'cereal', { gi: 55, price: 50 }],
  ['ragi', 'Ragi flour', 'A010', 'cereal', { gi: 70, price: 70 }],
  ['makki_atta', 'Makki atta (maize flour)', 'A006', 'cereal', { gi: 60, price: 50 }],
  ['quinoa', 'Quinoa', 'A009', 'cereal', { gi: 53, price: 400 }],
  ['little_millet', 'Little millet (samai)', 'A016', 'cereal', { gi: 55, price: 120 }],
  ['kodo_millet', 'Kodo millet (varagu)', 'A017', 'cereal', { gi: 55, price: 120 }],
  ['rajgira', 'Rajgira (amaranth seed)', 'A002', 'cereal', { flags: VRAT, gi: 70, price: 200 }],
  ['sweet_corn', 'Sweet corn kernels', 'A008', 'cereal', { gi: 52, price: 90 }],
  ['oats', 'Rolled oats', sup('USDA FDC 173904', 379, 13.2, 57.6, 6.5, 10.1, 1.0, 6, 4.25, 52, 0, 32), 'cereal', { gi: 55, price: 200 }],
  ['sabudana', 'Sabudana (sago pearls)', sup('USDA FDC 169717', 358, 0.2, 87.8, 0.0, 0.9, 3.4, 1, 1.58, 20), 'cereal', { flags: VRAT, gi: 70, price: 110 }],
  ['kuttu_atta', 'Kuttu atta (buckwheat flour)', sup('USDA FDC 168877', 335, 12.6, 60.6, 3.1, 10.0, 2.6, 11, 4.06, 41, 0, 54), 'cereal', { flags: VRAT, gi: 50, price: 220 }],
  ['samak', 'Samak rice (barnyard millet)', sup('NIN, Nutritive Value of Indian Foods 2004', 307, 6.2, 65.5, 2.2, 9.8, 0, 0, 5.0, 20), 'cereal', { flags: VRAT, gi: 42, price: 150 }],
  ['white_bread', 'White bread / pav', sup('USDA FDC 172686', 266, 8.9, 46.7, 3.3, 2.7, 5.7, 490, 3.6, 151, 0, 111), 'cereal', { allergens: ['wheat'], gi: 75, price: 110, unit: ['slice', 30] }],
  ['brown_bread', 'Brown bread', sup('USDA FDC 172816', 252, 12.4, 36.7, 3.5, 6.0, 4.4, 455, 2.5, 161, 0, 42), 'cereal', { allergens: ['wheat'], gi: 70, price: 130, unit: ['slice', 30] }],
  ['ww_pasta', 'Whole wheat pasta', sup('USDA FDC 168909', 348, 14.6, 64.2, 1.4, 9.2, 2.7, 8, 3.6, 40), 'cereal', { allergens: ['wheat'], gi: 48, price: 250 }],
  ['noodles', 'Wheat noodles', sup('USDA FDC 169736', 371, 13.0, 71.5, 1.5, 3.2, 2.7, 6, 3.3, 21), 'cereal', { allergens: ['wheat'], gi: 52, price: 200 }],
  ['cornflour', 'Cornflour', sup('USDA FDC 169698', 381, 0.3, 90.4, 0.1, 0.9, 0, 9, 0.47, 2), 'cereal', { gi: 85, price: 100 }],

  // ── Pulses and legumes (weights are dry) ────────────────────────────────────
  ['toor_dal', 'Toor dal', 'B021', 'pulse', { gi: 22, price: 160 }],
  ['moong_dal', 'Moong dal (yellow)', 'B010', 'pulse', { gi: 38, price: 120 }],
  ['whole_moong', 'Whole moong', 'B011', 'pulse', { gi: 31, price: 120 }],
  ['masoor_dal', 'Masoor dal', 'B013', 'pulse', { gi: 30, price: 100 }],
  ['whole_masoor', 'Whole masoor', 'B014', 'pulse', { gi: 30, price: 110 }],
  ['urad_dal', 'Urad dal', 'B003', 'pulse', { gi: 43, price: 130 }],
  ['whole_urad', 'Whole urad', 'B004', 'pulse', { gi: 43, price: 130 }],
  ['chana_dal', 'Chana dal', 'B001', 'pulse', { gi: 11, price: 90 }],
  ['besan', 'Besan (gram flour)', 'B001', 'pulse', { gi: 35, price: 100 }],
  ['sattu', 'Sattu (roasted gram flour)', 'B001', 'pulse', { gi: 35, price: 120 }],
  ['kala_chana', 'Kala chana', 'B002', 'pulse', { gi: 28, price: 100 }],
  ['kabuli_chana', 'Kabuli chana', 'B002', 'pulse', { gi: 28, price: 130 }],
  ['rajma', 'Rajma', 'B020', 'pulse', { gi: 24, price: 150 }],
  ['lobia', 'Lobia (black-eyed beans)', 'B005', 'pulse', { gi: 42, price: 120 }],
  ['moth_beans', 'Moth beans (matki)', 'B016', 'pulse', { gi: 40, price: 120 }],
  ['kulith', 'Kulith (horse gram)', 'B012', 'pulse', { gi: 40, price: 120 }],
  ['dried_peas', 'Dried white peas', 'B017', 'pulse', { gi: 35, price: 90 }],
  ['soybean', 'Soybean', 'B025', 'pulse', { allergens: ['soy'], gi: 16, price: 90 }],
  ['soya_chunks', 'Soya chunks', sup('USDA FDC 172445 (defatted soy flour)', 327, 51.5, 16.4, 1.2, 17.5, 0, 20, 9.24, 241), 'pulse', { allergens: ['soy'], gi: 20, price: 220 }],
  ['tofu', 'Tofu (firm)', sup('USDA FDC 172475', 144, 17.3, 0.5, 8.7, 2.3, 0.6, 14, 2.66, 683, 0.2, 29), 'pulse', { allergens: ['soy'], price: 400 }],

  // ── Dairy, eggs, meat, fish ─────────────────────────────────────────────────
  ['milk', 'Milk', 'L002', 'dairy', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, gi: 39, price: 60 }],
  ['curd', 'Curd (dahi)', sup('USDA FDC 171284', 61, 3.5, 4.7, 3.3, 0, 4.7, 46, 0.05, 121, 0.5, 7), 'dairy', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, gi: 36, price: 80 }],
  ['paneer', 'Paneer', 'L003', 'dairy', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, price: 420 }],
  ['khoa', 'Khoa', 'L004', 'dairy', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, price: 400 }],
  ['butter', 'Butter', sup('USDA FDC 173410', 717, 0.9, 0.1, 81.1, 0, 0.1, 643, 0.02, 24), 'oil_fat', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, price: 560 }],
  ['cream', 'Fresh cream', sup('USDA FDC 170859', 292, 2.2, 3.0, 30.9, 0, 2.9, 34, 0.03, 69, 0.6, 4), 'dairy', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, price: 400 }],
  ['cheese', 'Cheese', sup('USDA FDC 173414', 403, 24.9, 1.3, 33.1, 0, 0.5, 621, 0.68, 721, 0, 18), 'dairy', { animal: 'dairy', allergens: ['dairy'], price: 650 }],
  ['egg', 'Egg', 'M001', 'egg', { animal: 'egg', allergens: ['eggs'], price: 130, unit: ['egg', 50] }],
  ['chicken', 'Chicken (curry cut, skinless)', 'N001', 'meat', { animal: 'meat', price: 260 }],
  ['chicken_breast', 'Chicken breast', 'N003', 'meat', { animal: 'meat', price: 350 }],
  ['mutton', 'Mutton', 'O001', 'meat', { animal: 'meat', price: 750 }],
  ['rohu', 'Rohu fish', 'S006', 'fish', { animal: 'fish', allergens: ['fish'], price: 250 }],
  ['mackerel', 'Mackerel (bangda)', 'P034', 'fish', { animal: 'fish', allergens: ['fish'], price: 280 }],
  ['pomfret', 'Pomfret', 'P057', 'fish', { animal: 'fish', allergens: ['fish'], price: 700 }],
  ['sardine', 'Sardine (mathi)', 'P071', 'fish', { animal: 'fish', allergens: ['fish'], price: 180 }],
  ['hilsa', 'Hilsa (ilish)', 'P017', 'fish', { animal: 'fish', allergens: ['fish'], price: 1200 }],
  ['prawns', 'Prawns', 'Q007', 'fish', { animal: 'shellfish', allergens: ['shellfish'], price: 550 }],

  // ── Green leafy vegetables ──────────────────────────────────────────────────
  ['spinach', 'Spinach (palak)', 'C033', 'green_leafy', { price: 50 }],
  ['methi', 'Methi leaves', 'C020', 'green_leafy', { price: 80 }],
  ['mustard_greens', 'Sarson (mustard greens)', 'C026', 'green_leafy', { price: 60 }],
  ['bathua', 'Bathua leaves', 'C008', 'green_leafy', { price: 60 }],
  ['amaranth_leaves', 'Chaulai (amaranth leaves)', 'C002', 'green_leafy', { price: 50 }],
  ['drumstick_leaves', 'Drumstick leaves', 'C019', 'green_leafy', { price: 100 }],
  ['colocasia_leaves', 'Colocasia (arbi) leaves', 'C018', 'green_leafy', { price: 80 }],
  ['cabbage', 'Cabbage', 'C015', 'green_leafy', { flags: ['goitrogen'], price: 35 }],
  ['lettuce', 'Lettuce', 'C025', 'green_leafy', { price: 150 }],
  ['coriander_leaves', 'Coriander leaves', 'G009', 'green_leafy', { flags: VRAT, price: 100 }],
  ['mint', 'Mint leaves', 'G016', 'green_leafy', { flags: VRAT, price: 120 }],
  ['curry_leaves', 'Curry leaves', 'G010', 'green_leafy', { flags: VRAT, price: 150 }],

  // ── Other vegetables ────────────────────────────────────────────────────────
  ['tomato', 'Tomato', 'D076', 'vegetable', { flags: VRAT, price: 35, unit: ['tomato', 90] }],
  ['onion', 'Onion', 'G017', 'vegetable', { flags: ['root', 'allium'], price: 35, unit: ['onion', 100] }],
  ['spring_onion', 'Spring onion', 'D058', 'vegetable', { flags: ['allium'], price: 80 }],
  ['garlic', 'Garlic', 'G011', 'vegetable', { flags: ['root', 'allium'], price: 200 }],
  ['ginger', 'Ginger', 'G014', 'vegetable', { flags: ['root', 'vrat'], price: 150 }],
  ['green_chilli', 'Green chilli', 'G008', 'vegetable', { flags: VRAT, price: 80 }],
  ['cauliflower', 'Cauliflower', 'D036', 'vegetable', { flags: ['goitrogen'], price: 50 }],
  ['broccoli', 'Broccoli', sup('USDA FDC 170379', 34, 2.8, 4.0, 0.4, 2.6, 1.7, 33, 0.73, 47, 89.2, 63), 'vegetable', { flags: ['goitrogen'], price: 200 }],
  ['capsicum', 'Capsicum', 'D033', 'vegetable', { price: 80 }],
  ['red_capsicum', 'Red/yellow capsicum', 'D034', 'vegetable', { price: 250 }],
  ['brinjal', 'Brinjal (baingan)', 'D031', 'vegetable', { price: 45 }],
  ['bhindi', 'Bhindi (okra)', 'D056', 'vegetable', { price: 60 }],
  ['lauki', 'Lauki (bottle gourd)', 'D007', 'vegetable', { flags: VRAT, price: 35 }],
  ['tinda', 'Tinda', 'D073', 'vegetable', { price: 60 }],
  ['karela', 'Karela (bitter gourd)', 'D004', 'vegetable', { price: 60 }],
  ['parwal', 'Parwal (pointed gourd)', 'D060', 'vegetable', { price: 60 }],
  ['ridge_gourd', 'Ridge gourd (turai)', 'D068', 'vegetable', { price: 50 }],
  ['snake_gourd', 'Snake gourd', 'D070', 'vegetable', { price: 45 }],
  ['ash_gourd', 'Ash gourd (petha)', 'D001', 'vegetable', { price: 35 }],
  ['pumpkin', 'Pumpkin (kaddu)', 'D066', 'vegetable', { flags: VRAT, gi: 75, price: 35 }],
  ['drumstick', 'Drumstick', 'D046', 'vegetable', { price: 80 }],
  ['french_beans', 'French beans', 'D050', 'vegetable', { price: 70 }],
  ['cluster_beans', 'Gavar (cluster beans)', 'D039', 'vegetable', { price: 70 }],
  ['broad_beans', 'Papdi (broad beans)', 'D047', 'vegetable', { price: 80 }],
  ['green_peas', 'Green peas', 'D061', 'vegetable', { gi: 51, price: 80 }],
  ['cucumber', 'Cucumber', 'D043', 'vegetable', { flags: VRAT, price: 40 }],
  ['mushroom', 'Mushroom', 'J001', 'vegetable', { flags: ['mushroom'], price: 250 }],
  ['raw_mango', 'Raw mango', 'D057', 'vegetable', { price: 70 }],
  ['raw_banana', 'Raw banana', 'D063', 'vegetable', { flags: VRAT, gi: 40, price: 50 }],
  ['banana_flower', 'Banana flower', 'D062', 'vegetable', { price: 60 }],
  ['raw_jackfruit', 'Raw jackfruit', 'D051', 'vegetable', { price: 60 }],
  ['baby_corn', 'Baby corn', 'D042', 'vegetable', { price: 200 }],
  ['zucchini', 'Zucchini', 'D077', 'vegetable', { price: 150 }],

  // ── Roots and tubers ────────────────────────────────────────────────────────
  ['potato', 'Potato', 'F006', 'root_tuber', { flags: ['root', 'vrat'], gi: 78, price: 30, unit: ['potato', 150] }],
  ['sweet_potato', 'Sweet potato', 'F013', 'root_tuber', { flags: ['root', 'vrat'], gi: 63, price: 50 }],
  ['carrot', 'Carrot', 'F002', 'root_tuber', { flags: ['root'], gi: 39, price: 50 }],
  ['beetroot', 'Beetroot', 'F001', 'root_tuber', { flags: ['root'], gi: 64, price: 45 }],
  ['radish', 'Radish (mooli)', 'F010', 'root_tuber', { flags: ['root'], price: 40 }],
  ['colocasia', 'Arbi (colocasia)', 'F004', 'root_tuber', { flags: ['root', 'vrat'], gi: 51, price: 60 }],
  ['yam', 'Suran (elephant yam)', 'F017', 'root_tuber', { flags: ['root', 'vrat'], gi: 40, price: 60 }],

  // ── Fruits ──────────────────────────────────────────────────────────────────
  ['banana', 'Banana', 'E012', 'fruit', { flags: VRAT, gi: 51, price: 50, unit: ['banana', 100] }],
  ['apple', 'Apple', 'E001', 'fruit', { flags: VRAT, gi: 36, price: 180, unit: ['apple', 150] }],
  ['papaya', 'Papaya', 'E049', 'fruit', { flags: VRAT, gi: 60, price: 40 }],
  ['guava', 'Guava', 'E028', 'fruit', { flags: VRAT, gi: 31, price: 70 }],
  ['orange', 'Orange', 'E047', 'fruit', { flags: VRAT, gi: 43, price: 80 }],
  ['pomegranate', 'Pomegranate', 'E055', 'fruit', { flags: VRAT, gi: 35, price: 180 }],
  ['mango', 'Mango', 'E039', 'fruit', { flags: VRAT, gi: 51, price: 120 }],
  ['watermelon', 'Watermelon', 'E066', 'fruit', { flags: VRAT, gi: 76, price: 25 }],
  ['grapes', 'Grapes', 'E026', 'fruit', { flags: VRAT, gi: 59, price: 100 }],
  ['pineapple', 'Pineapple', 'E053', 'fruit', { flags: VRAT, gi: 59, price: 80 }],
  ['chikoo', 'Chikoo (sapota)', 'E060', 'fruit', { flags: VRAT, gi: 55, price: 80 }],
  ['pear', 'Pear', 'E051', 'fruit', { flags: VRAT, gi: 38, price: 160 }],
  ['strawberry', 'Strawberry', 'E063', 'fruit', { flags: VRAT, gi: 40, price: 400 }],
  ['avocado', 'Avocado', 'E007', 'fruit', { price: 600 }],
  ['dates', 'Dates', 'E018', 'fruit', { flags: VRAT, gi: 42, price: 300 }],
  ['raisins', 'Raisins', 'E058', 'fruit', { flags: VRAT, gi: 64, price: 400 }],
  ['amla', 'Amla', 'E021', 'fruit', { flags: VRAT, price: 80 }],
  ['lemon', 'Lemon juice', 'E033', 'fruit', { flags: VRAT, price: 100 }],
  ['tamarind', 'Tamarind', 'E064', 'fruit', { price: 200 }],
  ['coconut_water', 'Coconut water', 'K002', 'other', { flags: VRAT, price: 100 }],

  // ── Nuts and oilseeds ───────────────────────────────────────────────────────
  ['peanuts', 'Peanuts', 'H012', 'nut_seed', { allergens: ['peanuts'], flags: VRAT, gi: 14, price: 140 }],
  ['peanut_butter', 'Peanut butter', sup('USDA FDC 172470', 588, 25.1, 13.6, 50.4, 6.0, 9.2, 426, 1.87, 43, 0, 87), 'nut_seed', { allergens: ['peanuts'], gi: 14, price: 400 }],
  ['almonds', 'Almonds', 'H001', 'nut_seed', { allergens: ['tree_nuts'], flags: VRAT, price: 850 }],
  ['cashews', 'Cashews', 'H005', 'nut_seed', { allergens: ['tree_nuts'], flags: VRAT, price: 900 }],
  ['walnuts', 'Walnuts', 'H021', 'nut_seed', { allergens: ['tree_nuts'], flags: VRAT, price: 1200 }],
  ['pistachios', 'Pistachios', 'H018', 'nut_seed', { allergens: ['tree_nuts'], flags: VRAT, price: 1500 }],
  ['coconut', 'Fresh coconut', 'H007', 'nut_seed', { flags: VRAT, price: 60 }],
  ['dry_coconut', 'Dry coconut', 'H006', 'nut_seed', { flags: VRAT, price: 250 }],
  ['coconut_milk', 'Coconut milk', sup('USDA FDC 170172', 230, 2.3, 3.3, 23.8, 2.2, 3.3, 15, 1.64, 16, 2.8, 16), 'nut_seed', { flags: VRAT, price: 300 }],
  ['sesame', 'Sesame seeds (til)', 'H011', 'nut_seed', { allergens: ['sesame'], price: 200 }],
  ['flaxseed', 'Flaxseed', 'H014', 'nut_seed', { price: 200 }],
  ['sunflower_seeds', 'Sunflower seeds', 'H020', 'nut_seed', { price: 500 }],
  ['poppy_seeds', 'Poppy seeds (posto)', 'G032', 'nut_seed', { price: 1500 }],
  ['makhana', 'Makhana (fox nut)', sup('NIN, Nutritive Value of Indian Foods 2004', 347, 9.7, 76.9, 0.1, 0.5, 0, 0, 1.4, 60), 'nut_seed', { flags: VRAT, price: 1200 }],

  // ── Oils and fats ───────────────────────────────────────────────────────────
  ['oil', 'Cooking oil (groundnut/sunflower)', 'T005', 'oil_fat', { flags: VRAT, price: 180 }],
  ['mustard_oil', 'Mustard oil', 'T006', 'oil_fat', { price: 170 }],
  ['coconut_oil', 'Coconut oil', 'T001', 'oil_fat', { price: 250 }],
  ['sesame_oil', 'Sesame (gingelly) oil', 'T004', 'oil_fat', { allergens: ['sesame'], price: 300 }],
  ['olive_oil', 'Olive oil', sup('USDA FDC 171413', 884, 0, 0, 100), 'oil_fat', { price: 900 }],
  ['ghee', 'Ghee', 'T013', 'oil_fat', { animal: 'dairy', allergens: ['dairy'], flags: VRAT, price: 650 }],

  // ── Sugars ──────────────────────────────────────────────────────────────────
  ['sugar', 'Sugar', sup('USDA FDC 169655', 387, 0, 100, 0, 0, 100, 1, 0.05, 1), 'sugar', { flags: VRAT, gi: 65, price: 45 }],
  ['jaggery', 'Jaggery', 'I001', 'sugar', { flags: VRAT, gi: 84, price: 60 }],
  ['honey', 'Honey', sup('USDA FDC 169640', 304, 0.3, 82.2, 0, 0.2, 82.1, 4, 0.42, 6, 0.5, 2), 'sugar', { animal: 'honey', flags: VRAT, gi: 61, price: 400 }],

  // ── Spices and condiments ───────────────────────────────────────────────────
  ['salt', 'Salt', sup('USDA FDC 173468', 0, 0, 0, 0, 0, 0, 38758), 'spice', { price: 25 }],
  ['rock_salt', 'Sendha namak (rock salt)', sup('Sodium chloride, ~97% NaCl', 0, 0, 0, 0, 0, 0, 37500), 'spice', { flags: VRAT, price: 60 }],
  ['turmeric', 'Turmeric powder', 'G033', 'spice', { price: 250 }],
  ['red_chilli', 'Red chilli powder', 'G022', 'spice', { price: 300 }],
  ['coriander_powder', 'Coriander powder', 'G024', 'spice', { price: 200 }],
  ['cumin', 'Cumin (jeera)', 'G025', 'spice', { flags: VRAT, price: 400 }],
  // Spice blends use their dominant spice as a nutritional proxy (amounts are tiny).
  ['garam_masala', 'Garam masala', 'G025', 'spice', { price: 800 }],
  ['sambar_powder', 'Sambar powder', 'G024', 'spice', { price: 500 }],
  ['chaat_masala', 'Chaat masala', 'G025', 'spice', { price: 500 }],
  ['mustard_seeds', 'Mustard seeds', 'H013', 'spice', { price: 150 }],
  ['fenugreek_seeds', 'Methi seeds', 'G026', 'spice', { price: 150 }],
  ['ajwain', 'Ajwain', 'G029', 'spice', { price: 300 }],
  ['black_pepper', 'Black pepper', 'G031', 'spice', { flags: VRAT, price: 900 }],
  ['cardamom', 'Cardamom', 'G020', 'spice', { flags: VRAT, price: 3000 }],
  ['cloves', 'Cloves', 'G023', 'spice', { price: 1500 }],
  ['kasuri_methi', 'Kasuri methi', 'C020', 'spice', { price: 600 }],
  // Compounded hing is cut with wheat flour, so it is treated as a wheat source.
  ['hing', 'Hing (asafoetida)', 'G019', 'spice', { allergens: ['wheat'], price: 4000 }],
  ['soy_sauce', 'Soy sauce', sup('USDA FDC 174277', 53, 8.1, 4.1, 0.6, 0.8, 0.4, 5493, 1.45, 33), 'spice', { allergens: ['soy', 'wheat'], price: 300 }],
  ['baking_soda', 'Baking soda', sup('Sodium bicarbonate, 27.4% sodium', 0, 0, 0, 0, 0, 0, 27360), 'spice', { price: 150 }],
];
