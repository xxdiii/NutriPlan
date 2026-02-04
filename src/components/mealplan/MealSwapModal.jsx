import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Flame, Target, TrendingUp, Clock, ChefHat, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { checkAllergyViolations } from '../../utils/constraints/allergyChecker';
import { getHealthConstraintFindings } from '../../utils/constraints/healthConstraints';
import { getMedicationFoodWarnings } from '../../utils/constraints/medicationInteractions';

const MealSwapModal = ({ isOpen, onClose, currentMeal, mealType, onSwap, userProfile }) => {
  const { isDark } = useTheme();
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [swappingId, setSwappingId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentMeal) {
      loadAlternatives();
      setSwappingId(null);
      setShowSuccess(false);
    }
  }, [isOpen, currentMeal]);

  const loadAlternatives = async () => {
    setIsLoading(true);

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Import recipe data based on meal type
    let recipes = [];
    try {
      if (mealType === 'breakfast') {
        const module = await import('../../data/recipes/breakfast.json');
        recipes = module.default;
      } else if (mealType === 'lunch') {
        const module = await import('../../data/recipes/lunch.json');
        recipes = module.default;
      } else if (mealType === 'dinner') {
        const module = await import('../../data/recipes/dinner.json');
        recipes = module.default;
      } else if (mealType === 'snack') {
        const module = await import('../../data/recipes/snacks.json');
        recipes = module.default;
      }

      // Filter alternatives
      const filtered = recipes.filter(recipe => {
        // Exclude current meal
        if (recipe.id === currentMeal.id) return false;

        // Check dietary preference
        if (userProfile?.dietaryPreference) {
          if (!recipe.dietaryType.includes(userProfile.dietaryPreference)) {
            // Allow some flexibility for non-veg users
            if (userProfile.dietaryPreference !== 'non_veg') return false;
          }
        }

        // Check allergies
        const allergyBlocks = checkAllergyViolations(recipe, userProfile);
        if (allergyBlocks.length > 0) return false;

        return true;
      });

      // Sort by calorie similarity
      const targetCalories = currentMeal.calories;
      const sorted = filtered.sort((a, b) => {
        const diffA = Math.abs(a.calories - targetCalories);
        const diffB = Math.abs(b.calories - targetCalories);
        return diffA - diffB;
      });

      // Get top 6 alternatives + attach explainability warnings
      const top = sorted.slice(0, 6).map((r) => ({
        ...r,
        __constraints: {
          blocked: [],
          warnings: [...getHealthConstraintFindings(r, userProfile), ...getMedicationFoodWarnings(r, userProfile)],
        },
      }));

      setAlternatives(top);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading alternatives:', error);
      setIsLoading(false);
    }
  };

  const handleSwapClick = async (newMeal) => {
    if (swappingId) return; // Prevent multiple clicks

    try {
      setSwappingId(newMeal.id);

      // Minimum loading time for better UX
      await new Promise(resolve => setTimeout(resolve, 600));

      onSwap(newMeal);
      setShowSuccess(true);

      // Show success for 1s before closing
      setTimeout(() => {
        onClose();
        // Reset state handled by useEffect on next open
      }, 1000);
    } catch (error) {
      console.error("Swap failed", error);
      // Still close or show error? For now, close to avoid stuck state
      onClose();
    }
  };

  if (!isOpen) return null;

  const getMealTypeColor = () => {
    switch (mealType) {
      case 'breakfast': return 'from-orange-500 to-amber-500';
      case 'lunch': return 'from-green-500 to-emerald-500';
      case 'snack': return 'from-purple-500 to-pink-500';
      case 'dinner': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-5xl rounded-3xl shadow-2xl transition-all ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Swap Your {mealType?.charAt(0).toUpperCase() + mealType?.slice(1)}
                </h2>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  Choose an alternative that matches your preferences
                </p>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all ${isDark
                  ? 'bg-gray-900/80 text-gray-300 hover:bg-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Current Meal */}
          <div className="p-6 border-b border-gray-700">
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              CURRENT MEAL
            </h3>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-4">
                <img
                  src={currentMeal?.imageUrl}
                  alt={currentMeal?.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentMeal?.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      <Flame className="w-4 h-4 inline mr-1" />
                      {currentMeal?.calories} cal
                    </span>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      <Target className="w-4 h-4 inline mr-1" />
                      {currentMeal?.protein}g protein
                    </span>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      <Clock className="w-4 h-4 inline mr-1" />
                      {currentMeal?.prepTime + currentMeal?.cookTime} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          <div className="p-6">
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              SWAP WITH
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Finding alternatives...
                  </p>
                </div>
              </div>
            ) : alternatives.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {alternatives.map((meal) => (
                  <div
                    key={meal.id}
                    className={`rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${isDark
                      ? 'bg-gray-700/50 border-gray-700 hover:border-emerald-600'
                      : 'bg-white border-gray-200 hover:border-emerald-600 hover:shadow-lg'
                      }`}
                    onClick={() => handleSwapClick(meal)}
                  >
                    {/* Image */}
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Calorie Diff Badge */}
                      {Math.abs(meal.calories - currentMeal.calories) <= 50 && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full">
                          Similar Calories
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {meal.name}
                      </h4>

                      {/* Constraint notes (warnings only) */}
                      {meal.__constraints?.warnings?.length > 0 && (
                        <div className={`mb-3 text-xs p-2 rounded-lg ${isDark ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          }`}>
                          {meal.__constraints.warnings[0]?.message}
                        </div>
                      )}

                      {/* Nutrition */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-50'
                          }`}>
                          <div className={`text-sm font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                            {meal.calories}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
                            cal
                          </div>
                        </div>
                        <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                          }`}>
                          <div className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                            {meal.protein}g
                          </div>
                          <div className={`text-xs ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                            protein
                          </div>
                        </div>
                        <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-100'
                          }`}>
                          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {meal.prepTime + meal.cookTime}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            min
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {meal.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded-full ${isDark
                              ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Swap Button */}
                      <button
                        className={`w-full px-3 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all duration-300 ${swappingId === meal.id
                            ? 'bg-emerald-600 text-white'
                            : isDark
                              ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                      >
                        {swappingId === meal.id ? (
                          showSuccess ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Swapped!</span>
                            </>
                          ) : (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Swapping...</span>
                            </>
                          )
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Swap to This</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <p className="mb-2">No alternatives found</p>
                <p className="text-sm">Try adjusting your dietary preferences or regenerate the meal plan</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={onClose}
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all ${isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealSwapModal;