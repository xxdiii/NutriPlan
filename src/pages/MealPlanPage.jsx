import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, ArrowLeft } from 'lucide-react';
import MealPlanView from '../components/mealplan/MealPlanView';
import { createAndSaveMealPlan } from '../services/mealPlanGenerator';
import breakfastRecipes from '../data/recipes/breakfast.json';
import lunchRecipes from '../data/recipes/lunch.json';
import dinnerRecipes from '../data/recipes/dinner.json';
import snackRecipes from '../data/recipes/snacks.json';
import { api } from '../services/api';

const MealPlanPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [weekPlan, setWeekPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMealPlan();
  }, []);

  const loadMealPlan = async () => {
    setIsLoading(true);

    // 1. Fetch Profile (needed for hydration/scaling)
    const userProfile = await api.getUserProfile() || {};
    const userServings = userProfile.servings || 1;

    // 2. Fetch Meal Plan
    let planData = null;
    try {
      planData = await api.getMealPlan();
    } catch (error) {
      console.warn('Could not fetch API plan', error);
    }

    const localPlanStr = localStorage.getItem('weeklyMealPlan');
    const localPlan = localPlanStr ? JSON.parse(localPlanStr) : null;
    let finalPlan = null;

    if (planData && localPlan) {
      const apiDate = new Date(planData.createdAt).getTime();
      const localDate = new Date(localPlan.createdAt).getTime();

      if (apiDate > localDate + 60000) {
        // API is newer, use it
        finalPlan = planData.plan;
        // Update local to match strict new server plan
        localStorage.setItem('weeklyMealPlan', JSON.stringify(planData));
      } else {
        // Local is newer or same (contains swaps), use it
        // We assume local is already hydrated/valid since it was saved by the app
        finalPlan = localPlan.plan;
      }
    } else if (localPlan) {
      finalPlan = localPlan.plan;
    } else if (planData) {
      finalPlan = planData.plan;
      localStorage.setItem('weeklyMealPlan', JSON.stringify(planData));
    }

    if (finalPlan) {
      // If we used the API plan (or if local plan needs hydration check), we flow through here.
      // However, if we took 'localPlan.plan', it's already an array.
      // The hydration logic below expects 'planData.plan', but we have 'finalPlan'.
      // If we came from Local, we might skip the heavy hydration or apply it if needed.
      // EXISTING hydration logic was destructive (overwriting dates). 
      // Safe bet: If coming from API, run hydration. If from Local, trust it.

      if (finalPlan === localPlan?.plan) {
        setWeekPlan(finalPlan);
        setIsLoading(false);
        return;
      }

      // Create a map of all recipes for quick lookup
      const allRecipes = [...breakfastRecipes, ...lunchRecipes, ...dinnerRecipes, ...snackRecipes];
      const recipeMap = allRecipes.reduce((acc, recipe) => {
        acc[recipe.id] = recipe;
        return acc;
      }, {});

      // Hydrate plan with latest images, dates, and correct nutrition scaling
      const today = new Date();

      // Helper to repair a single meal
      const repairMeal = (meal) => {
        if (!meal) return null;
        const sourceRecipe = recipeMap[meal.id];
        if (!sourceRecipe) return meal; // Fallback if recipe not found

        // Apply correct scaling
        // If the meal plan already has a calculated 'scaledServings' (from smart generator), use that.
        // Otherwise, fallback to userProfile.servings (legacy behavior)
        const scale = meal.scaledServings || userServings;

        return {
          ...sourceRecipe,
          calories: Math.round(sourceRecipe.calories * scale),
          protein: Math.round(sourceRecipe.protein * scale),
          carbs: Math.round(sourceRecipe.carbs * scale),
          fat: Math.round(sourceRecipe.fat * scale),
          scaledServings: scale,
          imageUrl: sourceRecipe.imageUrl // Ensure latest image
        };
      };

      const hydratedPlan = finalPlan.map((day, index) => {
        // Calculate dynamic date
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + index);
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = currentDate.toISOString().split('T')[0];

        const repairedBreakfast = repairMeal(day.breakfast);
        const repairedLunch = repairMeal(day.lunch);
        const repairedSnack = repairMeal(day.snack);
        const repairedDinner = repairMeal(day.dinner);

        // Recalculate daily totals
        const totalCalories = (repairedBreakfast?.calories || 0) + (repairedLunch?.calories || 0) + (repairedSnack?.calories || 0) + (repairedDinner?.calories || 0);
        const totalProtein = (repairedBreakfast?.protein || 0) + (repairedLunch?.protein || 0) + (repairedSnack?.protein || 0) + (repairedDinner?.protein || 0);
        const totalCarbs = (repairedBreakfast?.carbs || 0) + (repairedLunch?.carbs || 0) + (repairedSnack?.carbs || 0) + (repairedDinner?.carbs || 0);
        const totalFat = (repairedBreakfast?.fat || 0) + (repairedLunch?.fat || 0) + (repairedSnack?.fat || 0) + (repairedDinner?.fat || 0);

        return {
          ...day,
          day: dayName,
          date: dateString,
          breakfast: repairedBreakfast,
          lunch: repairedLunch,
          snack: repairedSnack,
          dinner: repairedDinner,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat
        };
      });

      setWeekPlan(hydratedPlan);
      setIsLoading(false);
      // We hydrated the API plan, so lets save this "clean" version to local storage to persist the dates we just set
      // to avoid date shifting on every reload if possible, or just to have a valid local base.
      const newLocalObj = {
        plan: hydratedPlan,
        createdAt: planData?.createdAt || new Date().toISOString()
      };
      localStorage.setItem('weeklyMealPlan', JSON.stringify(newLocalObj));

    } else {
      // Fallback to localStorage if API failed/empty? or Generate new.
      // Let's check localStorage as fallback
      // (Handled above in if/else blocks, if we are here both were null)
      generateNewPlan();
    }
  };

  const generateNewPlan = async () => {
    setIsLoading(true);

    try {
      const userProfile = await api.getUserProfile();

      if (!userProfile) {
        setCurrentPage('onboarding');
        return;
      }

      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newPlan = await createAndSaveMealPlan(userProfile);
      setWeekPlan(newPlan);

      const planObj = {
        plan: newPlan,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('weeklyMealPlan', JSON.stringify(planObj));
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <p className={`text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Generating your meal plan...
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            This will take just a moment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
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

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('returnPage', 'mealplan');
                  setCurrentPage('profile');
                }}
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MealPlanView
          weekPlan={weekPlan}
          onRegeneratePlan={generateNewPlan}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default MealPlanPage;