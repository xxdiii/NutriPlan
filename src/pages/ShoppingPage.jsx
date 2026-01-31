import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, ArrowLeft, ShoppingCart } from 'lucide-react';
import ShoppingList from '../components/shopping/ShoppingList';
import { generateShoppingList, estimateCost } from '../services/shoppingListGenerator';

const ShoppingPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [shoppingList, setShoppingList] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = () => {
    setIsLoading(true);

    // Get meal plan from localStorage
    const savedPlan = localStorage.getItem('weeklyMealPlan');
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

    if (!savedPlan) {
      setIsLoading(false);
      return;
    }

    const planData = JSON.parse(savedPlan);
    const weekPlan = planData.plan;

    // Generate shopping list
    const list = generateShoppingList(weekPlan);
    const cost = estimateCost(list, userProfile.budget || 'medium', userProfile.servings || 1);

    setShoppingList(list);
    setCostEstimate(cost);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} animate-bounce`} />
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Generating your shopping list...
          </p>
        </div>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-xl mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No meal plan found
          </p>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Generate Meal Plan First
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('mealplan')}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  NutriPlan
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ShoppingList 
          shoppingList={shoppingList}
          costEstimate={costEstimate}
        />
      </div>
    </div>
  );
};

export default ShoppingPage;