import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, Filter, Clock, Users, Flame, ChevronRight, ArrowLeft } from 'lucide-react';
import RecipeDetailModal from '../components/recipe/RecipeDetailModal';
import breakfastRecipes from '../data/recipes/breakfast.json';
import lunchRecipes from '../data/recipes/lunch.json';
import dinnerRecipes from '../data/recipes/dinner.json';
import snackRecipes from '../data/recipes/snacks.json';

const RecipePage = ({ setCurrentPage }) => {
    const { isDark } = useTheme();
    const [recipes, setRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMealType, setSelectedMealType] = useState('all');
    const [selectedDiet, setSelectedDiet] = useState('all');

    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Combine all recipes with meal type tag
    useEffect(() => {
        const allRecipes = [
            ...breakfastRecipes.map(r => ({ ...r, mealType: 'breakfast' })),
            ...lunchRecipes.map(r => ({ ...r, mealType: 'lunch' })),
            ...dinnerRecipes.map(r => ({ ...r, mealType: 'dinner' })),
            ...snackRecipes.map(r => ({ ...r, mealType: 'snack' }))
        ];
        setRecipes(allRecipes);
        setFilteredRecipes(allRecipes);
    }, []);

    // Filter logic
    useEffect(() => {
        let result = recipes;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(recipe =>
                recipe.name.toLowerCase().includes(query) ||
                recipe.ingredients.some(ing => ing.toLowerCase().includes(query)) ||
                recipe.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // Meal Type filter
        if (selectedMealType !== 'all') {
            result = result.filter(recipe => recipe.mealType === selectedMealType);
        }

        // Diet filter
        if (selectedDiet !== 'all') {
            if (selectedDiet === 'vegan') {
                result = result.filter(recipe => recipe.dietaryType.includes('vegan'));
            } else if (selectedDiet === 'vegetarian') {
                result = result.filter(recipe => recipe.dietaryType.includes('vegetarian') || recipe.dietaryType.includes('vegan'));
            }
        }

        setFilteredRecipes(result);
    }, [searchQuery, selectedMealType, selectedDiet, recipes]);

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
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                                    }`}
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-bold">Browse Recipes</h1>
                        </div>
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
                                onClick={() => setSelectedMealType(cat.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${selectedMealType === cat.id
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
                    </div>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRecipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            onClick={() => handleRecipeClick(recipe)}
                            className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-100'
                                }`}
                        >
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={recipe.imageUrl}
                                    alt={recipe.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-3 left-3">
                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-black/60 text-white backdrop-blur-sm' : 'bg-white/90 text-gray-900 shadow-sm'
                                        }`}>
                                        {recipe.cuisine.replace('_', ' ')}
                                    </span>
                                </div>
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
                    ))}
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
        </div>
    );
};

export default RecipePage;
