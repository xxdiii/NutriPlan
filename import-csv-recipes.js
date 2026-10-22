import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'dataset');
const RECIPES_DIR = path.join(__dirname, 'src', 'data', 'recipes');

// Helper to parse simple CSV to array of objects natively
function parseCSV(filePath) {
  return new Promise((resolve) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return resolve([]);
    
    // basic parsing using regex to split by commas outside quotes
    const headersRe = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = lines[0].split(headersRe).map(h => h.trim().replace(/^"|"$/g, ''));
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(headersRe).map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      results.push(obj);
    }
    resolve(results);
  });
}

async function main() {
  console.log('Loading CSVs...');
  const master = await parseCSV(path.join(DATA_DIR, 'recipes_master.csv'));
  const ingredients = await parseCSV(path.join(DATA_DIR, 'recipe_ingredients.csv'));
  const nutrition = await parseCSV(path.join(DATA_DIR, 'recipe_nutrition.csv'));
  const steps = await parseCSV(path.join(DATA_DIR, 'recipe_steps.csv'));
  
  console.log(`Loaded ${master.length} recipes from master CSV.`);
  
  // Group ingredients by recipe_id
  const ingredientsMap = {};
  ingredients.forEach(row => {
    if (!ingredientsMap[row.recipe_id]) ingredientsMap[row.recipe_id] = [];
    ingredientsMap[row.recipe_id].push(row);
  });
  
  // Sort ingredients by ingredient_number
  for (const rid in ingredientsMap) {
    ingredientsMap[rid].sort((a, b) => Number(a.ingredient_number) - Number(b.ingredient_number));
  }

  // Group steps by recipe_id
  const stepsMap = {};
  steps.forEach(row => {
    if (!stepsMap[row.recipe_id]) stepsMap[row.recipe_id] = [];
    stepsMap[row.recipe_id].push(row);
  });
  
  for (const rid in stepsMap) {
    stepsMap[rid].sort((a, b) => Number(a.step_number) - Number(b.step_number));
  }

  // Nutrition map
  const nutritionMap = {};
  nutrition.forEach(row => {
    nutritionMap[row.recipe_id] = row;
  });

  // Construct JSON output arrays
  const output = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };

  master.forEach(row => {
    if (row.cuisine && row.cuisine.toLowerCase().includes('pakistani')) {
      return; // Skip Pakistani dishes
    }
    
    const rid = row.recipe_id;
    const nut = nutritionMap[rid] || {};
    const ingr = ingredientsMap[rid] || [];
    const stp = stepsMap[rid] || [];
    
    const dietaryType = [];
    if (row.is_vegetarian === 'true') dietaryType.push('vegetarian');
    if (row.is_vegan === 'true') dietaryType.push('vegan');
    
    // Some diet normalization
    if (dietaryType.length === 0) dietaryType.push('non_veg');
    
    const tags = [];
    if (row.category) tags.push(row.category.toLowerCase());
    if (row.cooking_method) tags.push(row.cooking_method.toLowerCase());
    if (row.spice_level) tags.push(row.spice_level.toLowerCase());

    const curryKeywords = /curry|gravy|masala|dal|korma|makhani|paneer|ilish|jhol|bhuna|salan|kalia|kosha|stew|aloo|chole|rajma|kofta|macher|mutton|beef|chicken tikka|butter chicken|saag|palak/i;
    const carbKeywords = /rice|roti|paratha|naan|biryani|pulao|wrap|sandwich|dosa|idli|pasta|noodles|burger|pizza/i;
    
    const isCategoryCurry = row.category && (row.category.toLowerCase().includes('curry') || row.category.toLowerCase().includes('gravy'));
    
    const isCurry = (curryKeywords.test(row.recipe_name) || isCategoryCurry) && 
                   !carbKeywords.test(row.recipe_name);

    let recipeName = row.recipe_name;
    let addedCalories = 0;
    let addedCarbs = 0;
    let addedProtein = 0;

    let ingredientsList = ingr.map(i => `${i.quantity} ${i.ingredient_name}`);

    if (isCurry) {
        recipeName = `${row.recipe_name} with Steamed Rice`;
        ingredientsList.push('1 portion (150g) Steamed Rice');
        addedCalories = 205;
        addedCarbs = 45;
        addedProtein = 4;
    }

    const recipeInfo = {
      id: rid,
      name: recipeName,
      cuisine: row.cuisine.toLowerCase().replace(' ', '_'),
      dietaryType: dietaryType,
      prepTime: Number(row.prep_time_minutes) || 0,
      cookTime: Number(row.cook_time_minutes) || 0,
      difficulty: (row.difficulty || 'medium').toLowerCase(),
      servings: Number(row.servings) || 1,
      calories: (Number(nut.calories) || Number(row.calories_per_serving) || 0) + addedCalories,
      protein: (Number(nut.protein_g) || 0) + addedProtein,
      carbs: (Number(nut.carbohydrates_g) || 0) + addedCarbs,
      fat: Number(nut.fat_g) || 0,
      ingredients: ingredientsList,
      instructions: stp.map(s => s.step_description),
      tags: tags,
      allergens: [],
      cost: row.estimated_cost_usd === 'low' ? 'low' : row.estimated_cost_usd === 'high' ? 'high' : 'medium',
      batchFriendly: true,
      imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(recipeName + ' food recipe')}&w=500&h=400&c=7`
    };

    let type = (row.meal_type || '').toLowerCase();
    
    if (type.includes('snack')) {
      output.snack.push(recipeInfo);
    } else if (type.includes('lunch')) {
      output.lunch.push(recipeInfo);
    } else if (type.includes('dinner')) {
      output.dinner.push(recipeInfo);
    } else if (type.includes('breakfast')) {
      output.breakfast.push(recipeInfo);
    } else {
      output.dinner.push(recipeInfo);
    }
  });

  // Read existing and append
  const files = [
    { key: 'breakfast', file: 'breakfast.json' },
    { key: 'lunch', file: 'lunch.json' },
    { key: 'dinner', file: 'dinner.json' },
    { key: 'snack', file: 'snacks.json' }
  ];

  for (const { key, file } of files) {
    if (output[key].length > 0) {
      const targetPath = path.join(RECIPES_DIR, file);
      let existing = [];
      if (fs.existsSync(targetPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        } catch(e) {
          console.error(`Error reading existing ${file}`, e);
        }
      }
      
      const newRecipesCount = output[key].length;
      
      // Avoid duplicate IDs
      const existingIds = new Set(existing.map(r => r.id));
      const toAdd = output[key].filter(r => !existingIds.has(r.id));
      
      existing.push(...toAdd);
      
      fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2), 'utf8');
      console.log(`Appended ${toAdd.length} new recipes into ${file} (Skipped ${newRecipesCount - toAdd.length} duplicates)`);
    }
  }
}

main().catch(console.error);
