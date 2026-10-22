// Parse ingredient string into parts
const parseIngredient = (ingredientStr) => {
  const str = ingredientStr.trim();

  // Regex for "Amount Unit Ingredient" or "Amount Ingredient"
  // Supports decimals, fractions (basic), and ranges
  const match = str.match(/^([\d\s./-]+)\s*([a-zA-Z]+)?\s+(.*)$/);

  if (match) {
    let amountStr = match[1].trim();
    let unit = match[2] ? match[2].toLowerCase() : ''; // optional unit
    let name = match[3].trim().toLowerCase();

    // Check if unit is actually part of name (e.g. "2 onions")
    // Common units whitelist
    const commonUnits = ['g', 'gram', 'grams', 'kg', 'ml', 'l', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'pcs', 'slice', 'slices', 'handful', 'pinch'];
    if (unit && !commonUnits.includes(unit) && unit.length > 2) {
      // It's likely part of the name, e.g. "2 large potatoes" -> unit='large', name='potatoes'
      // For simplicity, treat 'large' as unit-like descriptor or just append to name
      // Let's assume it's part of name if not standard unit
      name = `${unit} ${name}`;
      unit = 'pcs';
    } else if (!unit) {
      unit = 'pcs';
    }

    // Parse amount
    let amount = 0;
    try {
      if (amountStr.includes('-')) {
        // Average range: 1-2 -> 1.5
        const parts = amountStr.split('-');
        amount = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
      } else if (amountStr.includes('/')) {
        // Fraction: 1/2 -> 0.5
        const parts = amountStr.split('/');
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
      } else {
        amount = parseFloat(amountStr);
      }
    } catch (e) {
      amount = 1;
    }

    return { amount, unit, name, original: str };
  }

  // Fallback
  return { amount: 1, unit: 'pcs', name: str.toLowerCase(), original: str };
};

// Generate shopping list from weekly meal plan
export const generateShoppingList = (weekPlan) => {
  const aggregated = {};
  const categories = {
    vegetables: [],
    fruits: [],
    proteins: [],
    dairy: [],
    grains: [],
    spices: [],
    oils: [],
    others: []
  };

  // Collect all ingredients
  weekPlan.forEach(day => {
    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(mealType => {
      const meal = day[mealType];
      if (meal && meal.ingredients) {
        meal.ingredients.forEach(rawIngredient => {
          const parsed = parseIngredient(rawIngredient);
          const key = `${parsed.name}_${parsed.unit}`;

          if (aggregated[key]) {
            aggregated[key].amount += parsed.amount;
            aggregated[key].count++; // number of meals using it
            aggregated[key].meals.push(`${day.day} ${mealType}`);
          } else {
            aggregated[key] = {
              ...parsed,
              count: 1,
              meals: [`${day.day} ${mealType}`],
              category: categorizeIngredient(parsed.name)
            };
          }
        });
      }
    });
  });

  // Organize by category and format display
  Object.values(aggregated).forEach(item => {
    // Format display string
    const amountDisplay = Number.isInteger(item.amount) ? item.amount : item.amount.toFixed(1);
    const unitDisplay = item.unit === 'pcs' ? '' : item.unit;
    item.display = `${amountDisplay} ${unitDisplay} ${item.name}`.replace(/\s+/g, ' ').trim();
    item.original = item.display; // Backward compatibility for UI

    categories[item.category].push(item);
  });

  return {
    byCategory: categories,
    allIngredients: Object.values(aggregated),
    totalItems: Object.values(aggregated).length
  };
};
// Categorize ingredients
const categorizeIngredient = (ingredient) => {
  const lowerIngredient = ingredient.toLowerCase();

  // Vegetables
  const vegetables = ['onion', 'tomato', 'potato', 'carrot', 'cucumber', 'lettuce',
    'spinach', 'cabbage', 'cauliflower', 'broccoli', 'pepper', 'capsicum', 'eggplant',
    'mushroom', 'beetroot', 'radish', 'peas', 'beans', 'okra', 'gourd', 'pumpkin',
    'zucchini', 'celery', 'kale', 'chard', 'arugula', 'vegetables', 'veggies'];

  // Fruits
  const fruits = ['banana', 'apple', 'orange', 'mango', 'grape', 'berry', 'berries',
    'strawberry', 'blueberry', 'raspberry', 'lemon', 'lime', 'pomegranate', 'papaya',
    'watermelon', 'pineapple', 'kiwi', 'peach', 'plum', 'cherry', 'dates', 'raisins'];

  // Proteins
  const proteins = ['chicken', 'fish', 'prawn', 'egg', 'paneer', 'tofu', 'dal',
    'lentil', 'chickpea', 'rajma', 'chana', 'kidney beans', 'black beans', 'soy',
    'meat', 'beef', 'lamb', 'pork', 'turkey', 'cottage cheese'];

  // Dairy
  const dairy = ['milk', 'yogurt', 'curd', 'cheese', 'butter', 'ghee', 'cream',
    'paneer', 'cottage cheese', 'greek yogurt'];

  // Grains
  const grains = ['rice', 'wheat', 'flour', 'bread', 'roti', 'naan', 'paratha',
    'oats', 'quinoa', 'pasta', 'noodles', 'semolina', 'rava', 'maida', 'atta',
    'barley', 'millet', 'poha', 'idli', 'dosa batter'];

  // Spices
  const spices = ['salt', 'pepper', 'chilli', 'turmeric', 'cumin', 'coriander',
    'garam masala', 'curry', 'cardamom', 'cinnamon', 'clove', 'bay leaf',
    'mustard', 'fenugreek', 'nutmeg', 'saffron', 'paprika', 'oregano', 'basil',
    'thyme', 'rosemary', 'ginger', 'garlic', 'masala', 'powder', 'seeds'];

  // Oils
  const oils = ['oil', 'olive oil', 'coconut oil', 'ghee', 'butter', 'sesame oil',
    'mustard oil', 'vegetable oil'];

  // Check category
  if (vegetables.some(v => lowerIngredient.includes(v))) return 'vegetables';
  if (fruits.some(f => lowerIngredient.includes(f))) return 'fruits';
  if (proteins.some(p => lowerIngredient.includes(p))) return 'proteins';
  if (dairy.some(d => lowerIngredient.includes(d))) return 'dairy';
  if (grains.some(g => lowerIngredient.includes(g))) return 'grains';
  if (spices.some(s => lowerIngredient.includes(s))) return 'spices';
  if (oils.some(o => lowerIngredient.includes(o))) return 'oils';

  return 'others';
};

// Estimate cost per ingredient based on category and budget
const getIngredientCost = (ingredient, category, budgetLevel) => {
  const lowerIngredient = ingredient.toLowerCase();

  // Base cost multipliers per budget level
  const multipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.5
  };

  const multiplier = multipliers[budgetLevel] || 1.0;

  // Per-category base costs (per unit/standard serving)
  const categoryBaseCosts = {
    vegetables: {
      base: 25,
      premium: ['broccoli', 'mushroom', 'asparagus', 'bell pepper', 'capsicum'],
      common: ['onion', 'tomato', 'potato', 'carrot']
    },
    fruits: {
      base: 35,
      premium: ['berries', 'kiwi', 'pomegranate', 'avocado'],
      common: ['banana', 'apple', 'orange']
    },
    proteins: {
      base: 200,
      premium: ['chicken breast', 'salmon', 'prawn', 'turkey'],
      common: ['egg', 'dal', 'lentil', 'chickpea', 'paneer', 'tofu']
    },
    dairy: {
      base: 100,
      premium: ['cheese', 'greek yogurt', 'cream'],
      common: ['milk', 'yogurt', 'curd', 'butter']
    },
    grains: {
      base: 60,
      premium: ['quinoa', 'brown rice', 'oats'],
      common: ['rice', 'wheat', 'flour', 'bread']
    },
    spices: {
      base: 30,
      premium: ['saffron', 'cardamom', 'cinnamon'],
      common: ['salt', 'pepper', 'turmeric', 'cumin', 'coriander']
    },
    oils: {
      base: 50,
      premium: ['olive oil', 'coconut oil'],
      common: ['oil', 'ghee', 'butter']
    },
    others: {
      base: 40,
      premium: [],
      common: []
    }
  };

  const categoryCosts = categoryBaseCosts[category] || categoryBaseCosts.others;
  let baseCost = categoryCosts.base;

  // Adjust for premium/common ingredients
  if (categoryCosts.premium.some(p => lowerIngredient.includes(p))) {
    baseCost *= 1.5;
  } else if (categoryCosts.common.some(c => lowerIngredient.includes(c))) {
    baseCost *= 0.8;
  }

  // Estimate quantity multiplier (basic heuristic)
  // Ingredients with numbers or measurements get higher cost
  const hasQuantity = /\d+/.test(ingredient);
  const quantityMultiplier = hasQuantity ? 1.2 : 1.0;

  return Math.round(baseCost * multiplier * quantityMultiplier);
};

// Estimate cost (improved with ingredient-level pricing)
export const estimateCost = (shoppingList, budgetLevel = 'medium', servings = 1) => {
  let totalCost = 0;
  const breakdown = {};
  const itemDetails = {};

  // Calculate cost per category
  Object.keys(shoppingList.byCategory).forEach(category => {
    const items = shoppingList.byCategory[category];
    let categoryCost = 0;

    items.forEach(item => {
      // Cost per ingredient instance (accounts for frequency across meals)
      const itemCost = getIngredientCost(item.original, category, budgetLevel);
      // Multiply by count (how many meals need this ingredient)
      const totalItemCost = itemCost * item.count;
      categoryCost += totalItemCost;

      // Store item details for breakdown
      if (!itemDetails[category]) {
        itemDetails[category] = [];
      }
      itemDetails[category].push({
        name: item.original,
        count: item.count,
        unitCost: itemCost,
        totalCost: totalItemCost
      });
    });

    breakdown[category] = Math.round(categoryCost);
    totalCost += categoryCost;
  });

  // Adjust for servings (if cooking for more people, cost scales)
  const servingMultiplier = servings > 1 ? 1 + (servings - 1) * 0.7 : 1;
  totalCost = Math.round(totalCost * servingMultiplier);

  // Round breakdown categories
  Object.keys(breakdown).forEach(cat => {
    breakdown[cat] = Math.round(breakdown[cat] * servingMultiplier);
  });

  return {
    total: totalCost,
    breakdown,
    budgetLevel,
    servings,
    itemDetails, // Detailed breakdown for display
    estimatedPerPerson: servings > 1 ? Math.round(totalCost / servings) : totalCost
  };
};