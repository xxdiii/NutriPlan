export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary', description: 'Little or no exercise' },
  { value: 1.375, label: 'Lightly Active', description: 'Exercise 1-3 days/week' },
  { value: 1.55, label: 'Moderately Active', description: 'Exercise 3-5 days/week' },
  { value: 1.725, label: 'Very Active', description: 'Exercise 6-7 days/week' },
  { value: 1.9, label: 'Extra Active', description: 'Physical job or training twice/day' }
];

export const GOALS = [
  { 
    value: 'cut', 
    label: 'Lose Weight (Cut)', 
    description: 'Reduce body fat while preserving muscle',
    icon: '📉',
    deficit: -500 
  },
  { 
    value: 'maintain', 
    label: 'Maintain Weight', 
    description: 'Stay at current weight and improve health',
    icon: '⚖️',
    deficit: 0 
  },
  { 
    value: 'bulk', 
    label: 'Gain Muscle (Bulk)', 
    description: 'Build muscle mass with controlled weight gain',
    icon: '📈',
    deficit: 300 
  }
];

export const HEALTH_CONDITIONS = [
  { 
    id: 'pcos', 
    name: 'PCOS/PCOD', 
    description: 'Polycystic Ovary Syndrome',
    restrictions: ['Low GI foods', 'Reduced refined carbs']
  },
  { 
    id: 'thyroid_hypo', 
    name: 'Hypothyroidism', 
    description: 'Underactive thyroid',
    restrictions: ['Avoid goitrogens when raw', 'Ensure iodine intake']
  },
  { 
    id: 'thyroid_hyper', 
    name: 'Hyperthyroidism', 
    description: 'Overactive thyroid',
    restrictions: ['Limit iodine', 'Avoid excessive caffeine']
  },
  { 
    id: 'anemia', 
    name: 'Anemia', 
    description: 'Iron deficiency',
    restrictions: ['High iron foods', 'Vitamin C for absorption']
  },
  { 
    id: 'diabetes_t1', 
    name: 'Type 1 Diabetes', 
    description: 'Insulin-dependent diabetes',
    restrictions: ['Carb counting', 'Low GI foods']
  },
  { 
    id: 'diabetes_t2', 
    name: 'Type 2 Diabetes', 
    description: 'Non-insulin dependent diabetes',
    restrictions: ['Low GI foods', 'Controlled portions']
  },
  { 
    id: 'hypertension', 
    name: 'High Blood Pressure', 
    description: 'Hypertension',
    restrictions: ['Low sodium', 'DASH diet principles']
  },
  { 
    id: 'ibs', 
    name: 'IBS', 
    description: 'Irritable Bowel Syndrome',
    restrictions: ['Low FODMAP options', 'Fiber management']
  }
];

export const ALLERGENS = [
  { id: 'dairy', name: 'Dairy', description: 'Milk, cheese, yogurt, butter' },
  { id: 'eggs', name: 'Eggs', description: 'Whole eggs and egg products' },
  { id: 'peanuts', name: 'Peanuts', description: 'Peanuts and peanut oil' },
  { id: 'tree_nuts', name: 'Tree Nuts', description: 'Almonds, cashews, walnuts, etc.' },
  { id: 'soy', name: 'Soy', description: 'Soybeans, tofu, soy milk' },
  { id: 'wheat', name: 'Wheat/Gluten', description: 'Wheat, barley, rye' },
  { id: 'fish', name: 'Fish', description: 'All fish varieties' },
  { id: 'shellfish', name: 'Shellfish', description: 'Shrimp, crab, lobster' },
  { id: 'sesame', name: 'Sesame', description: 'Sesame seeds and oil' }
];

export const DIETARY_PREFERENCES = [
  { id: 'vegetarian', name: 'Vegetarian', description: 'No meat, fish, or poultry' },
  { id: 'vegan', name: 'Vegan', description: 'No animal products' },
  { id: 'eggetarian', name: 'Eggetarian', description: 'Vegetarian + eggs' },
  { id: 'pescatarian', name: 'Pescatarian', description: 'Vegetarian + fish' },
  { id: 'non_veg', name: 'Non-Vegetarian', description: 'Includes all foods' }
];

export const CUISINES = [
  { id: 'north_indian', name: 'North Indian', flag: '🇮🇳' },
  { id: 'south_indian', name: 'South Indian', flag: '🇮🇳' },
  { id: 'bengali', name: 'Bengali', flag: '🇮🇳' },
  { id: 'gujarati', name: 'Gujarati', flag: '🇮🇳' },
  { id: 'punjabi', name: 'Punjabi', flag: '🇮🇳' },
  { id: 'maharashtrian', name: 'Maharashtrian', flag: '🇮🇳' },
  { id: 'international', name: 'International', flag: '🌍' },
  { id: 'mediterranean', name: 'Mediterranean', flag: '🇬🇷' },
  { id: 'asian', name: 'Asian', flag: '🍜' }
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Puducherry', 'Other'
];

export const BUDGET_RANGES = [
  { value: 'low', label: 'Budget-Friendly', range: '₹2000-4000/month', description: 'Simple, affordable ingredients' },
  { value: 'medium', label: 'Moderate', range: '₹4000-8000/month', description: 'Good variety and quality' },
  { value: 'high', label: 'Premium', range: '₹8000+/month', description: 'Organic and specialty items' }
];