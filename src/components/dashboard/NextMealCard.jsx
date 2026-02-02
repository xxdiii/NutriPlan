import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const NextMealCard = ({ todaysMeals, onViewRecipe }) => {
    const { isDark } = useTheme();
    const [nextMealType, setNextMealType] = useState(null);
    const [nextMeal, setNextMeal] = useState(null);

    useEffect(() => {
        if (todaysMeals) {
            determineNextMeal();
        }
    }, [todaysMeals]);

    const determineNextMeal = () => {
        const hour = new Date().getHours();

        // Simple logic: find first meal window that hasn't passed heavily
        // Breakfast: < 10
        // Lunch: < 14
        // Snack: < 17
        // Dinner: The rest (or until very late)

        let targetType = 'breakfast';

        if (hour >= 10 && hour < 14) {
            targetType = 'lunch';
        } else if (hour >= 14 && hour < 17) {
            targetType = 'snack';
        } else if (hour >= 17) {
            targetType = 'dinner';
        }

        // Optimization: If current time is past dinner (e.g. 10 PM), show tomorrow's breakfast? 
        // For now, let's stick to showing Dinner if it's late, or maybe "All done" state?
        // Let's stick to highlighting the current relevant meal slot.

        setNextMealType(targetType);
        setNextMeal(todaysMeals[targetType]);
    };

    if (!nextMeal) return null; // Or return a "Plan your meal" placeholder

    const mealIcons = {
        breakfast: '🌅',
        lunch: '🍽️',
        snack: '🍎',
        dinner: '🌙'
    };

    return (
        <div className={`p-6 rounded-2xl shadow-lg relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-900 to-gray-800 border border-indigo-700' : 'bg-gradient-to-br from-indigo-50 to-white'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <Clock className="w-5 h-5 text-indigo-500" />
                    </div>
                    <span className={`font-semibold ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>
                        Up Next
                    </span>
                </div>
                <span className="text-2xl animate-pulse">
                    {mealIcons[nextMealType]}
                </span>
            </div>

            <div className="mb-4">
                <h3 className={`text-2xl font-bold mb-1 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {nextMeal.name}
                </h3>
                <p className={`text-sm font-medium uppercase tracking-wide ${isDark ? 'text-indigo-300' : 'text-indigo-500'}`}>
                    {nextMealType}
                </p>
            </div>

            <div className="flex items-center text-sm space-x-4 mb-6 text-gray-500">
                <span>🔥 {nextMeal.calories} cal</span>
                <span>🥩 {nextMeal.protein}g protein</span>
            </div>

            <button
                onClick={() => onViewRecipe(nextMeal, nextMealType)}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95 ${isDark
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                    }`}
            >
                <span>View Recipe</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};

export default NextMealCard;
