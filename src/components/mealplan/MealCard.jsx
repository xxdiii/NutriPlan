import React, { useState } from 'react';
import { Clock, ChefHat, Users, Flame, Target, TrendingUp, RefreshCw, ThumbsDown, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RecipeImage from '../common/RecipeImage';
import { api } from '../../services/api';
import { formatDuration } from '../../utils/dates';

const formatCuisine = (cuisine = '') => cuisine.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const MealCard = ({ meal, mealType, onSwap, onViewRecipe }) => {
  const { isDark } = useTheme();
  const [disliked, setDisliked] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      return (profile.dislikedRecipes || []).includes(meal?.id);
    } catch { return false; }
  });

  const handleDislike = async () => {
    if (!meal) return;
    setDisliked(true);
    // Trigger swap immediately
    onSwap && onSwap(mealType);

    // Save the dislike on top of the server profile (the cached copy may be missing,
    // and saving a partial profile would wipe the rest of it).
    try {
      const profile = await api.getUserProfile();
      if (!profile) return;
      const dislikes = new Set((profile.dislikedRecipes || []).map(String));
      dislikes.add(String(meal.recipeId || meal.id));
      const updated = await api.saveUserProfile({ ...profile, dislikedRecipes: [...dislikes] });
      localStorage.setItem('userProfile', JSON.stringify(updated));
    } catch (error) {
      console.warn('Could not save dislike', error);
    }
  };

  if (!meal) {
    return (
      <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
        }`}>
        <p className={`text-center ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          No meal available
        </p>
      </div>
    );
  }

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
    <div className={`rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden cursor-pointer bg-gray-200" onClick={() => onViewRecipe && onViewRecipe(meal, mealType)}>
        <RecipeImage recipe={meal} className="w-full h-full transition-transform duration-300 hover:scale-110" emojiClassName="text-6xl" />
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-white font-semibold text-sm bg-gradient-to-r ${getMealTypeColor()}`}>
          {getMealTypeIcon()} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
        </div>
        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-900/80 text-white' : 'bg-white/90 text-gray-900'
          }`}>
          {formatCuisine(meal.cuisine)}
        </div>
        {meal.leftover && (
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
            Leftovers from yesterday's dinner
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className={`text-xl font-bold mb-1 cursor-pointer hover:text-emerald-600 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`} onClick={() => onViewRecipe && onViewRecipe(meal, mealType)}>
          {meal.name}
        </h3>
        {meal.portionLabel && (
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{meal.portionLabel}</p>
        )}

        {/* Quick Info */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatDuration(meal.prepTime + meal.cookTime)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <ChefHat className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {meal.difficulty}
            </span>
          </div>
          {meal.servings > 1 && (
            <div className="flex items-center space-x-1" title="Ingredient quantities are for the whole household; nutrition is per person">
              <Users className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Cook for {meal.servings}
              </span>
            </div>
          )}
        </div>

        {/* Nutrition Info (eating-out meals are only a calorie budget) */}
        {meal.eatingOut ? (
          <div className={`mb-4 p-2 rounded-lg text-sm ${isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-800'}`}>
            <Flame className="w-4 h-4 inline mr-1" />
            Budget about {meal.calories} kcal. Log what you actually eat.
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-50'
            }`}>
            <Flame className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            <div className={`text-sm font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              {meal.calories}
            </div>
            <div className={`text-xs ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
              cal
            </div>
          </div>

          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'
            }`}>
            <Target className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              {meal.protein}g
            </div>
            <div className={`text-xs ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
              prot
            </div>
          </div>

          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-green-900/30' : 'bg-green-50'
            }`}>
            <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            <div className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              {meal.carbs}g
            </div>
            <div className={`text-xs ${isDark ? 'text-green-500' : 'text-green-600'}`}>
              carb
            </div>
          </div>

          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'
            }`}>
            <div className={`text-lg mb-1 leading-none ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              💧
            </div>
            <div className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
              {meal.fat}g
            </div>
            <div className={`text-xs ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`}>
              fat
            </div>
          </div>
        </div>
        )}

        {/* Health notes for this user's conditions and medications */}
        {meal.warnings?.length > 0 && (
          <div className={`mb-4 p-2 rounded-lg text-xs space-y-1 ${isDark ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
            {meal.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(meal.tags || []).slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className={`text-xs px-2 py-1 rounded-full ${isDark
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-100 text-gray-700'
                }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onViewRecipe && onViewRecipe(meal, mealType)
            }}
            className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${isDark
              ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
          >
            View Recipe
          </button>
          <button
            onClick={() => onSwap && onSwap(mealType)}
            title="Swap meal"
            className={`px-3 py-2 rounded-xl font-medium transition-all ${isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDislike}
            title={disliked ? 'Already marked as disliked' : "Dislike — swap & never show again"}
            className={`px-3 py-2 rounded-xl font-medium transition-all ${
              disliked
                ? isDark ? 'bg-red-900/40 text-red-400 cursor-default' : 'bg-red-50 text-red-500 cursor-default'
                : isDark ? 'bg-gray-700 text-gray-400 hover:bg-red-900/30 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
              }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealCard;