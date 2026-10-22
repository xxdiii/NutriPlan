import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, ArrowLeft, ShoppingCart, PackageCheck } from 'lucide-react';
import ShoppingList from '../components/shopping/ShoppingList';
import PantryManager, { loadPantry, savePantry, normalisePantryName } from '../components/shopping/PantryManager';
import { generateShoppingList, estimateCost } from '../services/shoppingListGenerator';
import { api } from '../services/api';

const ShoppingPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [shoppingList, setShoppingList] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Pantry state ───────────────────────────────────────────────────────────
  const [pantryItems, setPantryItems] = useState(() => loadPantry());
  const [pantryModeActive, setPantryModeActive] = useState(false);
  const [showPantryManager, setShowPantryManager] = useState(false);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    setIsLoading(true);
    try {
      let planData = await api.getMealPlan();
      if (!planData) {
        const savedPlan = localStorage.getItem('weeklyMealPlan');
        if (savedPlan) planData = JSON.parse(savedPlan);
      }

      const userProfile = await api.getUserProfile() || JSON.parse(localStorage.getItem('userProfile') || '{}');

      if (!planData || !planData.plan) { setIsLoading(false); return; }

      const weekPlan = planData.plan;
      const list = generateShoppingList(weekPlan);
      const cost = estimateCost(list, userProfile.budget || 'medium', userProfile.servings || 1);

      setShoppingList(list);
      setCostEstimate(cost);
    } catch (error) {
      console.error('Error loading shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtered list: remove pantry items when pantry mode is ON ─────────────
  const filteredShoppingList = useMemo(() => {
    if (!shoppingList || !pantryModeActive || pantryItems.size === 0) return shoppingList;

    const filteredByCategory = {};
    let totalItems = 0;

    Object.entries(shoppingList.byCategory).forEach(([cat, items]) => {
      const remaining = items.filter(
        item => !pantryItems.has(normalisePantryName(item.name))
      );
      filteredByCategory[cat] = remaining;
      totalItems += remaining.length;
    });

    return {
      byCategory: filteredByCategory,
      allIngredients: Object.values(filteredByCategory).flat(),
      totalItems,
    };
  }, [shoppingList, pantryItems, pantryModeActive]);

  // How many items are being hidden by the pantry
  const hiddenCount = shoppingList && filteredShoppingList
    ? shoppingList.totalItems - filteredShoppingList.totalItems
    : 0;

  const handlePantryChange = useCallback((newSet) => {
    setPantryItems(new Set(newSet));
  }, []);

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} animate-bounce`} />
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Generating your shopping list...</p>
        </div>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-xl mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>No meal plan found</p>
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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
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

            <div className="flex items-center space-x-3">
              {/* ── Pantry Mode Toggle ── */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPantryManager(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <PackageCheck className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">Pantry</span>
                  {pantryItems.size > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                      {pantryItems.size}
                    </span>
                  )}
                </button>

                {/* Pantry mode on/off switch */}
                {pantryItems.size > 0 && (
                  <button
                    onClick={() => setPantryModeActive(prev => !prev)}
                    title={pantryModeActive ? 'Pantry mode ON — click to show all items' : 'Click to hide items you already have'}
                    className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none
                      ${pantryModeActive ? 'bg-emerald-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                      ${pantryModeActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Pantry mode banner */}
      {pantryModeActive && hiddenCount > 0 && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              <span className="font-semibold">{hiddenCount} items</span> hidden because you already have them in your pantry.
            </p>
            <button
              onClick={() => setPantryModeActive(false)}
              className="ml-auto text-xs text-emerald-600 hover:underline"
            >
              Show all
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ShoppingList
          shoppingList={filteredShoppingList}
          costEstimate={costEstimate}
        />
      </div>

      {/* Pantry Manager Modal */}
      {showPantryManager && (
        <PantryManager
          shoppingList={shoppingList}
          pantryItems={pantryItems}
          onPantryChange={handlePantryChange}
          onClose={() => setShowPantryManager(false)}
        />
      )}
    </div>
  );
};

export default ShoppingPage;