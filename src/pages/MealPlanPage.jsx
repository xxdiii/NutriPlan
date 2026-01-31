import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, ArrowLeft } from 'lucide-react';
import MealPlanView from '../components/mealplan/MealPlanView';
import { createAndSaveMealPlan } from '../services/mealPlanGenerator';

const MealPlanPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [weekPlan, setWeekPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMealPlan();
  }, []);

  const loadMealPlan = () => {
    setIsLoading(true);
    
    // Check if meal plan exists
    const savedPlan = localStorage.getItem('weeklyMealPlan');
    
    if (savedPlan) {
      const planData = JSON.parse(savedPlan);
      setWeekPlan(planData.plan);
      setIsLoading(false);
    } else {
      // Generate new plan
      generateNewPlan();
    }
  };

  const generateNewPlan = () => {
    setIsLoading(true);
    
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    
    if (!userProfile) {
      setCurrentPage('onboarding');
      return;
    }

    // Simulate generation delay
    setTimeout(() => {
      const newPlan = createAndSaveMealPlan(userProfile);
      setWeekPlan(newPlan);
      setIsLoading(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
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
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
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
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
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