import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, ArrowLeft, ShoppingCart, PackageCheck } from 'lucide-react';
import ShoppingList from '../components/shopping/ShoppingList';
import PantryManager from '../components/shopping/PantryManager';
import { importLegacyPantry } from '../services/pantryService';
import BudgetCard, { ProteinForMoney } from '../components/shopping/BudgetCard';
import { api } from '../services/api';

const ShoppingPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [shoppingList, setShoppingList] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Items fully covered by the pantry are hidden unless the user asks to see them.
  const [hidePantry, setHidePantry] = useState(true);
  const [showPantryManager, setShowPantryManager] = useState(false);

  // Built on the server from the plan's weighed ingredients for the household, minus the
  // pantry, rounded to packs and priced for the user's city tier and the month.
  const loadShoppingList = async () => {
    try {
      const [list, savedProfile] = await Promise.all([api.getShoppingList(), api.getUserProfile()]);
      setShoppingList(list);
      setProfile(savedProfile);
    } catch (error) {
      console.error('Error loading shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    importLegacyPantry().finally(loadShoppingList);
  }, []);

  const haveIt = async (item) => {
    try {
      await api.savePantryItem(item.foodId, { grams: null });
      await loadShoppingList();
    } catch (error) {
      alert(error.message);
    }
  };

  const visibleList = useMemo(() => {
    if (!shoppingList || !hidePantry) return shoppingList;
    const byCategory = Object.fromEntries(Object.entries(shoppingList.byCategory).map(([cat, items]) => [cat, items.filter(i => i.status !== 'in_pantry')]));
    const allIngredients = Object.values(byCategory).flat();
    return { ...shoppingList, byCategory, allIngredients, totalItems: allIngredients.length };
  }, [shoppingList, hidePantry]);

  const pantryCount = shoppingList ? shoppingList.totalItems - shoppingList.toBuy : 0;

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
              </button>

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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BudgetCard
          key={`${profile?.weeklyBudget}-${profile?.priceTier}`}
          budget={shoppingList.budget}
          cost={shoppingList.cost}
          priceTier={shoppingList.priceTier}
          profile={profile}
          onUpdated={loadShoppingList}
        />
        <ProteinForMoney foods={shoppingList.proteinForMoney} />

        {pantryCount > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <PackageCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{pantryCount} item{pantryCount === 1 ? '' : 's'} already in your pantry {hidePantry ? 'are hidden' : 'are shown'}.</span>
            <button onClick={() => setHidePantry(h => !h)} className="ml-auto text-xs text-emerald-600 hover:underline">
              {hidePantry ? 'Show them' : 'Hide them'}
            </button>
          </div>
        )}

        <ShoppingList shoppingList={visibleList} costEstimate={shoppingList.cost} onHaveIt={haveIt} />
      </div>

      {/* Pantry Manager Modal */}
      {showPantryManager && (
        <PantryManager onClose={() => setShowPantryManager(false)} onChanged={loadShoppingList} />
      )}
    </div>
  );
};

export default ShoppingPage;
