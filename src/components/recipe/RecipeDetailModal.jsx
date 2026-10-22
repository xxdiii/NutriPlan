import React, { useState, useEffect } from 'react';
import { X, Clock, ChefHat, Users, Flame, Target, TrendingUp, Check, AlertCircle, Heart, ChevronRight, Play } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import RecipeImage from '../common/RecipeImage';
import { formatDuration } from '../../utils/dates';

const RecipeDetailModal = ({ recipe, isOpen, onClose, mealType }) => {
  const { isDark } = useTheme();
  // Meals from a plan carry portion details; recipes from the browser are per serving.
  const isPlannedMeal = Boolean(recipe?.components);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimateIn(true);
      if (recipe) checkFavoriteStatus();
    } else {
      setAnimateIn(false);
    }
  }, [isOpen, recipe]);

  const checkFavoriteStatus = async () => {
    try {
      const favorites = await api.getFavorites();
      const exists = favorites.some(f => f.recipeId === String(recipe.id));
      setIsFavorite(exists);
    } catch (err) {
      console.error('Error checking favorite:', err);
    }
  };

  const toggleFavorite = async () => {
    setLoadingFav(true);
    try {
      if (isFavorite) {
        await api.removeFavorite(String(recipe.id));
        setIsFavorite(false);
      } else {
        await api.addFavorite(recipe);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // If error is "Recipe already favorited", sync state to true
      if (err.message && err.message.includes('Recipe already favorited')) {
        setIsFavorite(true);
      } else {
        // Show actual error to user for debugging
        alert(`Failed to save favorite: ${err.message}`);
      }
    } finally {
      setLoadingFav(false);
    }
  };

  if (!isOpen || !recipe) return null;

  const bgClasses = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const cardClasses = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-xl';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // Tab indicator position calculation
  const getTabPosition = () => {
    switch (activeTab) {
      case 'ingredients': return 'translate-x-0';
      case 'instructions': return 'translate-x-full';
      case 'nutrition': return 'translate-x-[200%]';
      default: return 'translate-x-0';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className={`relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'} ${bgClasses} will-change-transform`}>

        {/* Hero Section - Parallax style */}
        <div className="relative h-64 md:h-80 shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gray-900 z-0">
            <RecipeImage recipe={recipe} className="w-full h-full opacity-90" emojiClassName="text-8xl" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10" />

          {/* Top Actions */}
          <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-start">
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                {mealType}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                {(recipe.cuisine || 'classic').replace(/_/g, ' ')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-white/20 transition-all border border-white/10 group top-4 right-4 active:scale-95"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-sm">
              {recipe.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-sm">{formatDuration(recipe.prepTime + recipe.cookTime)}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="font-medium text-sm">{recipe.calories} kcal</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                <ChefHat className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-sm capitalize">{recipe.difficulty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col min-h-0 md:flex-row">

          {/* Sidebar / Top Bar actions */}
          <div className={`shrink-0 md:w-64 p-4 md:p-6 md:border-r ${isDark ? 'border-gray-700' : 'border-gray-100'} flex flex-col gap-4`}>

            {/* Quick Actions */}
            <button
              onClick={toggleFavorite}
              disabled={loadingFav}
              className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-transform active:scale-95 duration-100 ${isFavorite
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                : `${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} ${textMuted}`
                }`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="font-bold">{isFavorite ? 'Saved' : 'Save Recipe'}</span>
            </button>

            {/* Macro Rings (Mini) */}
            <div className={`p-5 rounded-2xl ${cardClasses}`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${textMuted}`}>
                {isPlannedMeal ? 'Your portion' : 'Macros per serving'}
              </h4>
              <p className={`text-xs mb-4 ${textMuted}`}>{recipe.portionLabel || recipe.servingUnit}</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm font-bold text-blue-500">{recipe.protein}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Carbs</span>
                  <span className="text-sm font-bold text-emerald-500">{recipe.carbs}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm font-bold text-amber-500">{recipe.fat}g</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {(recipe.tags || []).slice(0, 5).map((tag, i) => (
                <span key={i} className={`text-[10px] px-2.5 py-1 rounded-lg font-medium uppercase tracking-wide opacity-70 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-opacity-50">

            {/* Sticky Tabs */}
            <div className={`sticky top-0 z-30 px-4 pt-4 pb-2 backdrop-blur-md bg-opacity-90 ${isDark ? 'bg-gray-900/90' : 'bg-white/90'}`}>
              <div className={`relative flex p-1 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {/* Animated Slider */}
                <div
                  className={`absolute inset-y-1 w-1/3 rounded-lg shadow-sm transition-transform duration-200 ease-out ${isDark ? 'bg-gray-700' : 'bg-white'}`}
                  style={{ transform: `translateX(${['ingredients', 'instructions', 'nutrition'].indexOf(activeTab) * 100}%)` }}
                />

                {['ingredients', 'instructions', 'nutrition'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative z-10 flex-1 py-3 text-sm font-bold capitalize transition-colors duration-200 ${activeTab === tab
                      ? (isDark ? 'text-white' : 'text-gray-900')
                      : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-10 pb-20">
              {/* INGREDIENTS TAB */}
              {activeTab === 'ingredients' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">What you need</h3>
                    <span className={`text-sm ${textMuted}`}>
                      {isPlannedMeal
                        ? recipe.servings > 1 ? `For ${recipe.servings} people` : 'For your portion'
                        : `Makes ${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recipe.ingredients.map((item, idx) => (
                      <div
                        key={idx}
                        className={`group flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer ${isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-50 hover:bg-emerald-50/50'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${isDark ? 'border-gray-600 group-hover:border-emerald-500' : 'border-gray-300 group-hover:border-emerald-500'}`}>
                          <Check className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 group-hover:bg-emerald-500 rounded-full transition-all" />
                        </div>
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INSTRUCTIONS TAB */}
              {activeTab === 'instructions' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">Let's Cook</h3>
                    <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center">
                      <Play className="w-3 h-3 mr-1 fill-emerald-700" />
                      {recipe.instructions.length} Steps
                    </div>
                  </div>

                  <div className="relative pl-4 space-y-8 before:absolute before:left-0 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:to-transparent before:opacity-30">
                    {recipe.instructions.map((step, idx) => (
                      <div key={idx} className="relative pl-8">
                        {/* Step Number Bubble */}
                        <div className={`absolute left-[-13px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-4 ${isDark ? 'bg-gray-800 border-gray-900 text-emerald-400' : 'bg-white border-white text-emerald-600'}`}>
                          {idx + 1}
                        </div>

                        <div className={`p-5 rounded-2xl transition-all hover:translate-x-1 hover:shadow-md ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-white border border-gray-100 shadow-sm text-gray-700'}`}>
                          <p className="leading-relaxed">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NUTRITION TAB */}
              {activeTab === 'nutrition' && (
                <div className="space-y-8 animate-fadeIn">
                  <h3 className="text-2xl font-bold mb-4">Nutritional Breakdown</h3>

                  {/* Detailed Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center ${isDark ? 'bg-gray-800' : 'bg-orange-50'}`}>
                      <Flame className="w-8 h-8 text-orange-500 mb-2" />
                      <span className="text-3xl font-black text-orange-500">{recipe.calories}</span>
                      <span className={`text-xs font-bold uppercase ${textMuted}`}>Calories</span>
                    </div>
                    <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
                      <Target className="w-8 h-8 text-blue-500 mb-2" />
                      <span className="text-3xl font-black text-blue-500">{recipe.protein}g</span>
                      <span className={`text-xs font-bold uppercase ${textMuted}`}>Protein</span>
                    </div>
                    <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center ${isDark ? 'bg-gray-800' : 'bg-emerald-50'}`}>
                      <TrendingUp className="w-8 h-8 text-emerald-500 mb-2" />
                      <span className="text-3xl font-black text-emerald-500">{recipe.carbs}g</span>
                      <span className={`text-xs font-bold uppercase ${textMuted}`}>Carbs</span>
                    </div>
                    <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center ${isDark ? 'bg-gray-800' : 'bg-amber-50'}`}>
                      <span className="text-2xl mb-2">💧</span>
                      <span className="text-3xl font-black text-amber-500">{recipe.fat}g</span>
                      <span className={`text-xs font-bold uppercase ${textMuted}`}>Fat</span>
                    </div>
                  </div>

                  {/* Micronutrients and more, calculated from the ingredients */}
                  {recipe.nutrition && (
                    <div className={`p-5 rounded-2xl ${cardClasses}`}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                        {[
                          ['Fibre', `${Math.round(recipe.nutrition.fibre)} g`],
                          ['Sugar', `${Math.round(recipe.nutrition.sugar)} g`],
                          ['Sodium', `${Math.round(recipe.nutrition.sodium)} mg`],
                          ['Iron', `${recipe.nutrition.iron.toFixed(1)} mg`],
                          ['Calcium', `${Math.round(recipe.nutrition.calcium)} mg`],
                          ['Vitamin C', `${Math.round(recipe.nutrition.vitC)} mg`],
                          ['Glycaemic load', Math.round(recipe.glycaemicLoad)],
                          ...(recipe.costInr ? [['Approx. cost', `₹${Math.round(recipe.costInr)}`]] : []),
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between">
                            <span className={textMuted}>{label}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                      {!recipe.isCustom && (
                        <p className={`mt-4 text-xs ${textMuted}`}>
                          Calculated from ingredient weights using the Indian Food Composition Tables 2017 (ICMR-NIN). Glycaemic load and cost are estimates.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Health notes for this user */}
                  {recipe.warnings?.length > 0 && (
                    <div className={`p-4 rounded-xl border space-y-1 text-sm ${isDark ? 'bg-yellow-900/10 border-yellow-900/30 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                      {recipe.warnings.map((w, i) => <p key={i}>{w.message}</p>)}
                    </div>
                  )}

                  {/* Warnings */}
                  {recipe.allergens && recipe.allergens.length > 0 && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDark ? 'bg-red-900/10 border-red-900/30 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wide mb-1">Allergens</h4>
                        <p className="text-sm">Contains: {recipe.allergens.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;