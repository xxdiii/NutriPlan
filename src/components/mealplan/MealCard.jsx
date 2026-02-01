import React from 'react';
import { Clock, ChefHat, Users, Flame, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const MealCard = ({ meal, mealType, onSwap, onViewRecipe }) => {
  const { isDark } = useTheme();

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
      <div className="relative h-48 overflow-hidden cursor-pointer bg-gray-200" onClick={() => {
        console.log('Image clicked', meal, mealType);
        onViewRecipe && onViewRecipe(meal, mealType)
      }}>
        <img
          src={meal.imageUrl || `https://via.placeholder.com/500x300?text=${meal.name.replace(/\s+/g, '+')}`}
          alt={meal.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://via.placeholder.com/500x300?text=${meal.name.replace(/\s+/g, '+')}`;
          }}
        />
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-white font-semibold text-sm bg-gradient-to-r ${getMealTypeColor()}`}>
          {getMealTypeIcon()} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
        </div>
        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-900/80 text-white' : 'bg-white/90 text-gray-900'
          }`}>
          {meal.cuisine.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className={`text-xl font-bold mb-3 cursor-pointer hover:text-emerald-600 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`} onClick={() => onViewRecipe && onViewRecipe(meal, mealType)}>
          {meal.name}
        </h3>

        {/* Quick Info */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {meal.prepTime + meal.cookTime} min
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <ChefHat className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {meal.difficulty}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {meal.scaledServings || meal.servings} servings
            </span>
          </div>
        </div>

        {/* Nutrition Info */}
        <div className="grid grid-cols-4 gap-2 mb-4">
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
              protein
            </div>
          </div>

          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-green-900/30' : 'bg-green-50'
            }`}>
            <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            <div className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              {meal.carbs}g
            </div>
            <div className={`text-xs ${isDark ? 'text-green-500' : 'text-green-600'}`}>
              carbs
            </div>
          </div>

          <div className={`p-2 rounded-lg text-center ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'
            }`}>
            <div className={`text-lg mb-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
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

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {meal.tags.slice(0, 3).map((tag, idx) => (
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
              console.log('View Recipe clicked', meal, mealType);
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
            className={`px-4 py-2 rounded-xl font-medium transition-all ${isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealCard;