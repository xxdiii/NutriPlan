import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, Filter, Clock, Users, Flame, ChevronRight, ArrowLeft, Loader2, Plus, ChefHat, Trash2 } from 'lucide-react';
import RecipeDetailModal from '../components/recipe/RecipeDetailModal';
import CustomRecipeForm from '../components/recipe/CustomRecipeForm';
import { loadCustomRecipes, deleteCustomRecipe } from '../services/customRecipeService';
import breakfastRecipes from '../data/recipes/breakfast.json';
import lunchRecipes from '../data/recipes/lunch.json';
import dinnerRecipes from '../data/recipes/dinner.json';
import snackRecipes from '../data/recipes/snacks.json';

const RecipePage = ({ setCurrentPage }) => {
    const { isDark } = useTheme();
    const [recipes, setRecipes] = useState([]);
    const [customRecipes, setCustomRecipes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMealType, setSelectedMealType] = useState('all');
    const [selectedDiet, setSelectedDiet] = useState('all');
    const [showCustomOnly, setShowCustomOnly] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);

    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [displayCount, setDisplayCount] = useState(24);
    const [isLoading, setIsLoading] = useState(true);

    // Combine all built-in recipes with meal type tag
    useEffect(() => {
        const timer = setTimeout(() => {
            const rawRecipes = [
                ...breakfastRecipes.map(r => ({ ...r, mealType: 'breakfast' })),
                ...lunchRecipes.map(r => ({ ...r, mealType: 'lunch' })),
                ...dinnerRecipes.map(r => ({ ...r, mealType: 'dinner' })),
                ...snackRecipes.map(r => ({ ...r, mealType: 'snack' }))
            ];

            const uniqueRecipesMap = new Map();
            rawRecipes.forEach(recipe => {
                const normalizedName = recipe.name.replace(/\s+\d+$/, '').trim();
                if (!uniqueRecipesMap.has(normalizedName)) {
                    uniqueRecipesMap.set(normalizedName, { ...recipe, name: normalizedName });
                }
            });

            setRecipes(Array.from(uniqueRecipesMap.values()));
            setIsLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Load & refresh custom recipes
    const refreshCustomRecipes = useCallback(() => {
        const custom = loadCustomRecipes().map(r => ({
            ...r,
            // custom recipes can belong to multiple meal types; use first for display
            mealType: r.mealTypes?.[0] ?? 'snack',
            isCustom: true,
        }));
        setCustomRecipes(custom);
    }, []);

    useEffect(() => { refreshCustomRecipes(); }, [refreshCustomRecipes]);

    // All recipes: custom first (with badge), then built-in
    const allRecipes = useMemo(() => [...customRecipes, ...recipes], [customRecipes, recipes]);

    // Filter logic using useMemo
    const filteredRecipes = useMemo(() => {
        let result = showCustomOnly ? customRecipes : allRecipes;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(recipe =>
                recipe.name.toLowerCase().includes(query) ||
                (recipe.ingredients || []).some(ing => ing.toLowerCase().includes(query)) ||
                (recipe.tags || []).some(tag => tag.toLowerCase().includes(query))
            );
        }

        if (selectedMealType !== 'all') {
            result = result.filter(recipe => recipe.mealType === selectedMealType);
        }

        if (selectedDiet !== 'all') {
            if (selectedDiet === 'vegan') {
                result = result.filter(recipe => recipe.dietaryType.includes('vegan'));
            } else if (selectedDiet === 'vegetarian') {
                result = result.filter(recipe => recipe.dietaryType.includes('vegetarian') || recipe.dietaryType.includes('vegan'));
            }
        }

        return result;
    }, [searchQuery, selectedMealType, selectedDiet, recipes]);

    // Reset display count when filters change
    useEffect(() => {
        setDisplayCount(24);
    }, [searchQuery, selectedMealType, selectedDiet]);

    // Intersection Observer for infinite scrolling
    const observer = useRef();
    const lastRecipeElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && displayCount < filteredRecipes.length) {
                setDisplayCount(prev => prev + 24);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, displayCount, filteredRecipes.length]);

    const handleRecipeClick = (recipe) => {
        setSelectedRecipe(recipe);
        setIsModalOpen(true);
    };

    const categories = [
        { id: 'all', label: 'All Meals', emoji: '🍽️' },
        { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
        { id: 'lunch', label: 'Lunch', emoji: '🍱' },
        { id: 'dinner', label: 'Dinner', emoji: '🌙' },
        { id: 'snack', label: 'Snacks', emoji: '🍎' }
    ];

    const handleDeleteCustom = (e, recipeId) => {
        e.stopPropagation();
        if (window.confirm('Delete this custom recipe?')) {
            deleteCustomRecipe(recipeId);
            refreshCustomRecipes();
        }
    };

    const handleSaveRecipe = () => {
        refreshCustomRecipes();
        setShowAddForm(false);
        setEditingRecipe(null);
    };

    const displayedRecipes = filteredRecipes.slice(0, displayCount);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
            }`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 backdrop-blur-md border-b ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setCurrentPage('dashboard')}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-bold">Browse Recipes</h1>
                            {customRecipes.length > 0 && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                    ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {customRecipes.length} custom
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => { setEditingRecipe(null); setShowAddForm(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Recipe</span>
                        </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'
                                }`} />
                            <input
                                type="text"
                                placeholder="Search recipes, ingredients, tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl transition-all ${isDark
                                        ? 'bg-gray-800 border-gray-700 focus:bg-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-200 focus:bg-gray-50 text-gray-900 placeholder-gray-400 border'
                                    } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                            />
                        </div>

                        <select
                            value={selectedDiet}
                            onChange={(e) => setSelectedDiet(e.target.value)}
                            className={`px-4 py-3 rounded-xl border appearance-none cursor-pointer ${isDark
                                    ? 'bg-gray-800 border-gray-700 text-white'
                                    : 'bg-white border-gray-200 text-gray-900'
                                }`}
                        >
                            <option value="all">All Diets</option>
                            <option value="vegetarian">Vegetarian</option>
                            <option value="vegan">Vegan</option>
                        </select>
                    </div>

                    {/* Categories */}
                    <div className="flex overflow-x-auto gap-3 mt-4 pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setSelectedMealType(cat.id); setShowCustomOnly(false); }}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                                    selectedMealType === cat.id && !showCustomOnly
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                        : isDark
                                            ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                        {/* My Recipes tab */}
                        <button
                            onClick={() => setShowCustomOnly(true)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                                showCustomOnly
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-600/20'
                                    : isDark
                                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            <ChefHat className="w-4 h-4" />
                            <span>My Recipes</span>
                            {customRecipes.length > 0 && (
                                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                                    ${showCustomOnly ? 'bg-white/20 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {customRecipes.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className={`w-12 h-12 animate-spin mb-4 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
                        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading recipes...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayedRecipes.map((recipe, index) => {
                                const isLastElement = index === displayedRecipes.length - 1;
                                return (
                                    <div
                                        key={recipe.id}
                                        ref={isLastElement ? lastRecipeElementRef : null}
                                        onClick={() => handleRecipeClick(recipe)}
                                        className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                                            recipe.isCustom
                                                ? isDark ? 'bg-amber-900/20 border border-amber-700/40 hover:shadow-amber-900/20' : 'bg-amber-50 border border-amber-200 shadow-sm hover:shadow-amber-100'
                                                : isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-100'
                                        }`}
                                    >
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={recipe.imageUrl || 'https://via.placeholder.com/400x300?text=Recipe'}
                                                alt={recipe.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={e => { e.target.src = 'https://via.placeholder.com/400x300?text=Recipe'; }}
                                            />
                                            {/* Cuisine / Custom badge */}
                                            <div className="absolute top-3 left-3 flex gap-1.5">
                                                {recipe.isCustom ? (
                                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-500 text-white shadow">
                                                        ⭐ My Recipe
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                                        isDark ? 'bg-black/60 text-white backdrop-blur-sm' : 'bg-white/90 text-gray-900 shadow-sm'
                                                    }`}>
                                                        {(recipe.cuisine || '').replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Delete button for custom recipes */}
                                            {recipe.isCustom && (
                                                <button
                                                    onClick={(e) => handleDeleteCustom(e, recipe.id)}
                                                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete recipe"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-bold text-lg line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {recipe.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center space-x-4 mb-4 text-sm">
                                                <div className={`flex items-center space-x-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <Clock className="w-4 h-4" />
                                                    <span>{recipe.prepTime + recipe.cookTime}m</span>
                                                </div>
                                                <div className={`flex items-center space-x-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <Flame className="w-4 h-4" />
                                                    <span>{recipe.calories}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {recipe.dietaryType.slice(0, 2).map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`text-xs px-2 py-1 rounded-md ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                                            }`}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredRecipes.length === 0 && (
                            <div className="text-center py-20">
                                <div className={`text-6xl mb-4`}>🔍</div>
                                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    No recipes found
                                </h3>
                                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                    Try adjusting your search filters
                                </p>
                            </div>
                        )}
                        
                        {displayCount < filteredRecipes.length && displayedRecipes.length > 0 && (
                            <div className="flex justify-center mt-8 pb-8">
                                <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
                            </div>
                        )}
                    </>
                )}
            </div>

            <RecipeDetailModal
                recipe={selectedRecipe}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedRecipe(null);
                }}
                mealType={selectedRecipe?.mealType || 'snack'}
            />

            {/* Custom Recipe Form Modal */}
            {(showAddForm || editingRecipe) && (
                <CustomRecipeForm
                    recipe={editingRecipe}
                    onSave={handleSaveRecipe}
                    onClose={() => { setShowAddForm(false); setEditingRecipe(null); }}
                />
            )}
        </div>
    );
};

export default RecipePage;
