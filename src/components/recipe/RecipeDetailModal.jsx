import React, { useState } from 'react';
import { X, Clock, ChefHat, Users, Flame, Target, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const RecipeDetailModal = ({ recipe, isOpen, onClose, mealType }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('ingredients'); // ingredients, instructions, nutrition
  console.log('RecipeDetailModal render:', { recipe: recipe?.name, isOpen, mealType });
  if (!isOpen || !recipe) return null;

  const getMealTypeColor = () => {
    switch (mealType) {
      case 'breakfast': return 'from-orange-500 to-amber-500';
      case 'lunch': return 'from-green-500 to-emerald-500';
      case 'snack': return 'from-purple-500 to-pink-500';
      case 'dinner': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getMealTypeIcon = () => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🍽️';
      case 'snack': return '🍎';
      case 'dinner': return '🌙';
      default: return '🍴';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className={`relative w-full max-w-4xl max-h-[95vh] md:max-h-[85vh] flex flex-col rounded-3xl shadow-2xl transition-all ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-md transition-all ${isDark
            ? 'bg-black/20 text-white hover:bg-black/40'
            : 'bg-white/30 text-gray-900 hover:bg-white/50'
            }`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Hero Image */}
        <div className="relative h-56 md:h-80 overflow-hidden rounded-t-3xl flex-shrink-0 group">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${getMealTypeColor()} mb-3 shadow-lg`}>
              <span className="mr-2">{getMealTypeIcon()}</span>
              {mealType}
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight">{recipe.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm font-medium">
              <span className="flex items-center space-x-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                <Clock className="w-4 h-4" />
                <span>{recipe.prepTime + recipe.cookTime}m</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                <ChefHat className="w-4 h-4" />
                <span>{recipe.difficulty}</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                <Users className="w-4 h-4" />
                <span>{recipe.scaledServings || recipe.servings} ppl</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {/* Nutrition Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div className={`p-4 rounded-2xl text-center transform transition-transform hover:scale-105 ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-orange-900/10 border border-orange-800/30' : 'bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100'
              }`}>
              <Flame className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
              <div className={`text-xl font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                {recipe.calories}
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
                Calories
              </div>
            </div>

            <div className={`p-4 rounded-2xl text-center transform transition-transform hover:scale-105 ${isDark ? 'bg-gradient-to-br from-blue-900/40 to-blue-900/10 border border-blue-800/30' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100'
              }`}>
              <Target className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className={`text-xl font-black ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                {recipe.protein}g
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                Protein
              </div>
            </div>

            <div className={`p-4 rounded-2xl text-center transform transition-transform hover:scale-105 ${isDark ? 'bg-gradient-to-br from-green-900/40 to-green-900/10 border border-green-800/30' : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100'
              }`}>
              <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
              <div className={`text-xl font-black ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                {recipe.carbs}g
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                Carbs
              </div>
            </div>

            <div className={`p-4 rounded-2xl text-center transform transition-transform hover:scale-105 ${isDark ? 'bg-gradient-to-br from-yellow-900/40 to-yellow-900/10 border border-yellow-800/30' : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-100'
              }`}>
              <div className="text-2xl mb-2">💧</div>
              <div className={`text-xl font-black ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                {recipe.fat}g
              </div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`}>
                Fat
              </div>
            </div>
          </div>

          {/* Time Breakdown */}
          <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Prep Time
                </div>
                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.prepTime} min
                </div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cook Time
                </div>
                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.cookTime} min
                </div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Time
                </div>
                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.prepTime + recipe.cookTime} min
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags.map((tag, idx) => (
              <span
                key={idx}
                className={`text-xs px-3 py-1 rounded-full ${isDark
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-emerald-100 text-emerald-700'
                  }`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-6`}>
            {['ingredients', 'instructions', 'nutrition'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-all ${activeTab === tab
                  ? isDark
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-emerald-700 border-b-2 border-emerald-600'
                  : isDark
                    ? 'text-gray-500 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === 'ingredients' && (
              <div>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Ingredients
                </h3>
                <div className="space-y-3">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isDark ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                        <Check className="w-3 h-3 text-emerald-600 opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {ingredient}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'instructions' && (
              <div>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Cooking Instructions
                </h3>
                <div className="space-y-4">
                  {recipe.instructions.map((instruction, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-4 p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${isDark
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {idx + 1}
                      </div>
                      <p className={`flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Nutritional Information
                </h3>

                <div className="space-y-4">
                  {/* Macronutrients */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Macronutrients (per serving)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Calories
                        </span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {recipe.calories} kcal
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Protein
                        </span>
                        <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {recipe.protein}g ({Math.round((recipe.protein * 4 / recipe.calories) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Carbohydrates
                        </span>
                        <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          {recipe.carbs}g ({Math.round((recipe.carbs * 4 / recipe.calories) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Fat
                        </span>
                        <span className={`font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          {recipe.fat}g ({Math.round((recipe.fat * 9 / recipe.calories) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Additional Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Difficulty
                        </span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Cost Level
                        </span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {recipe.cost.charAt(0).toUpperCase() + recipe.cost.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Batch Friendly
                        </span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {recipe.batchFriendly ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          Cuisine
                        </span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {recipe.cuisine.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Allergen Warning */}
                  {recipe.allergens && recipe.allergens.length > 0 && (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                      }`}>
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className={`font-semibold mb-1 ${isDark ? 'text-red-300' : 'text-red-900'}`}>
                            Allergen Warning
                          </h4>
                          <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                            Contains: {recipe.allergens.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Close
            </button>
            <button className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
              Add to Favorites
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default RecipeDetailModal;