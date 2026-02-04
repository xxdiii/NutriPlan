import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, Calendar, TrendingUp, Target, Flame, Award, ChevronRight } from 'lucide-react';
import { createAndSaveMealPlan } from '../services/mealPlanGenerator';
import RecipeDetailModal from '../components/recipe/RecipeDetailModal';
import { getTodayCompliance, getWeeklyCompliance, calculateStreak, calculateCombinedStreak, getComplianceForDate } from '../services/complianceService';
import { api } from '../services/api';
import HydrationTracker from '../components/dashboard/HydrationTracker';
import NextMealCard from '../components/dashboard/NextMealCard';

const DashboardPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weeklyCompliance, setWeeklyCompliance] = useState(null);
  const [consumedStats, setConsumedStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [complianceUpdateTrigger, setComplianceUpdateTrigger] = useState(0);

  const handleViewRecipe = (recipe, mealType) => {
    setSelectedRecipe(recipe);
    setSelectedMealType(mealType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
    setSelectedMealType(null);
  };

  useEffect(() => {
    const handleComplianceUpdate = () => {
      setComplianceUpdateTrigger(prev => prev + 1);
    };

    window.addEventListener('meal-compliance-update', handleComplianceUpdate);
    return () => window.removeEventListener('meal-compliance-update', handleComplianceUpdate);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load Profile
        const profile = await api.getUserProfile();
        if (profile && Object.keys(profile).length > 0) {
          setUserProfile(profile);
        } else {
          const localDetails = localStorage.getItem('userProfile');
          if (localDetails) {
            setUserProfile(JSON.parse(localDetails));
          }
          // If no profile in API or localStorage, that's okay - user might need to complete onboarding
          // but we don't redirect here, we let them see the dashboard
        }

        // 2. Load Meal Plan
        let apiPlan = null;
        try {
          apiPlan = await api.getMealPlan();
        } catch (error) {
          console.warn('Could not fetch API plan', error);
        }

        const localPlanStr = localStorage.getItem('weeklyMealPlan');
        const localPlan = localPlanStr ? JSON.parse(localPlanStr) : null;

        if (apiPlan && localPlan) {
          // Compare dates to see if server has a freshly generated plan
          const apiDate = new Date(apiPlan.createdAt).getTime();
          const localDate = new Date(localPlan.createdAt).getTime();

          // If API plan is strictly newer (by > 1 minute to avoid drift), take it
          // Otherwise trust local (which may have swaps)
          if (apiDate > localDate + 60000) {
            setMealPlan(apiPlan);
            localStorage.setItem('weeklyMealPlan', JSON.stringify(apiPlan));
          } else {
            setMealPlan(localPlan);
          }
        } else if (localPlan) {
          setMealPlan(localPlan);
        } else if (apiPlan) {
          setMealPlan(apiPlan);
          localStorage.setItem('weeklyMealPlan', JSON.stringify(apiPlan));
        }

        // 3. Load Compliance
        // Note: complianceService still uses localStorage. Ideally refactor that too.
        // For dashboard display, we can iterate complianceService logic or migrate it wholly.
        // To keep it simple, we let complianceService read from localStorage which is OK for now
        // IF we are syncing data. But we aren't syncing compliance back to LS yet.
        // So 'getWeeklyCompliance' will fail if data is only in backend.
        // TODO: Fully migrate compliance service.

        const currentStreak = await calculateCombinedStreak(api);
        const weekly = getWeeklyCompliance();
        setStreak(currentStreak);
        setWeeklyCompliance(weekly);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Try to load from localStorage as fallback
        const localDetails = localStorage.getItem('userProfile');
        if (localDetails) {
          setUserProfile(JSON.parse(localDetails));
        }

        const localPlan = localStorage.getItem('weeklyMealPlan');
        if (localPlan) setMealPlan(JSON.parse(localPlan));
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [complianceUpdateTrigger]);

  // Calculate consumed stats whenever meal plan or valid user profile loads
  useEffect(() => {
    if (!mealPlan || !mealPlan.plan) return;

    // Get today's plan
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todaysPlan = mealPlan.plan.find(p => p.date === todayStr) || mealPlan.plan[0]; // Fallback to first day if date doesn't match

    if (todaysPlan) {
      const compliance = getComplianceForDate(todayStr);
      let stats = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      ['breakfast', 'lunch', 'snack', 'dinner'].forEach(type => {
        if (compliance.meals && compliance.meals[type] === 'eaten') {
          const meal = todaysPlan[type];
          if (meal) {
            stats.calories += (meal.calories || 0);
            stats.protein += (meal.protein || 0);
            stats.carbs += (meal.carbs || 0);
            stats.fat += (meal.fat || 0);
          }
        }
      });
      setConsumedStats(stats);
    }
  }, [mealPlan, complianceUpdateTrigger]);

  const handleGenerateMealPlan = async () => {
    setIsGenerating(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newPlan = await createAndSaveMealPlan(userProfile);
      const planObj = {
        plan: newPlan,
        createdAt: new Date().toISOString()
      };

      setMealPlan(planObj);
      localStorage.setItem('weeklyMealPlan', JSON.stringify(planObj));
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTodaysMeals = () => {
    if (!mealPlan || !mealPlan.plan) return null;
    return mealPlan.plan[0]; // First day is today
  };

  const todaysMeals = getTodaysMeals();

  if (isLoadingData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Loading your dashboard...
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // If no profile exists or profile is empty, prompt user to complete onboarding
  if (!userProfile || Object.keys(userProfile).length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Complete Your Profile
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Let's set up your profile to get personalized meal plans and nutrition tracking.
          </p>
          <button
            onClick={() => setCurrentPage('onboarding')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                NutriPlan
              </span>
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
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                onClick={() => setCurrentPage('profile')}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome back! 👋
          </h1>
          <div className="flex items-center space-x-2">
            <Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {formatDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Calories */}
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'
                }`}>
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Today
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {consumedStats.calories} / {userProfile.nutritionTargets.targetCalories}
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              Calories Consumed
            </p>
            <div className={`mt-3 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="h-2 rounded-full bg-orange-600"
                style={{
                  width: `${Math.min((consumedStats.calories / userProfile.nutritionTargets.targetCalories) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Protein */}
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Protein
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {consumedStats.protein} / {userProfile.nutritionTargets.macros.protein}g
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              Protein Consumed
            </p>
            <div className={`mt-3 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{
                  width: `${Math.min((consumedStats.protein / userProfile.nutritionTargets.macros.protein) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Current Weight */}
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'
                }`}>
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Weight
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {userProfile.weight} kg
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              Current
            </p>
            {userProfile.goal !== 'maintain' && (
              <p className={`text-xs mt-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                Target: {userProfile.targetWeight} kg
              </p>
            )}
          </div>

          {/* Streak */}
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'
                }`}>
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Streak
              </span>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              {weeklyCompliance && (
                <span>
                  {weeklyCompliance.overallCompliance}% compliance this week
                </span>
              )}
            </p>
          </div>

          {/* Hydration Tracker */}
          <div>
            <HydrationTracker />
          </div>

          {/* Next Meal Card */}
          <div>
            <NextMealCard
              todaysMeals={todaysMeals}
              onViewRecipe={handleViewRecipe}
            />
          </div>
        </div>

        {/* Today's Meals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Meal Plan */}
          <div className="lg:col-span-2">
            <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Today's Meals
                </h2>
                {mealPlan && (
                  <button
                    onClick={() => setCurrentPage('mealplan')}
                    className={`text-sm font-medium flex items-center space-x-1 ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                      }`}
                  >
                    <span>View Full Plan</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {mealPlan && todaysMeals ? (
                <div className="space-y-4">
                  {['breakfast', 'lunch', 'snack', 'dinner'].map((mealType, idx) => {
                    const meal = todaysMeals[mealType];
                    const mealIcons = {
                      breakfast: '🌅',
                      lunch: '🍽️',
                      snack: '🍎',
                      dinner: '🌙'
                    };

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">{mealIcons[mealType]}</span>
                              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                              </h3>
                            </div>
                            {meal ? (
                              <>
                                <p className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {meal.name}
                                </p>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {meal.calories} cal | {meal.protein}g protein
                                </p>
                              </>
                            ) : (
                              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                                No meal planned
                              </p>
                            )}
                          </div>
                          {meal && (
                            <button onClick={() => handleViewRecipe(meal, mealType)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark
                              ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}>
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((meal, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {meal}
                          </h3>
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            No meal planned yet
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={handleGenerateMealPlan}
                  disabled={isGenerating}
                  className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg'
                    }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Utensils className="w-5 h-5" />
                      <span>{mealPlan ? 'Regenerate' : 'Generate'} Weekly Meal Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Macro Breakdown & Quick Actions */}
          <div>
            {/* Macro Breakdown */}
            <div className={`p-6 rounded-2xl shadow-lg mb-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
              <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Macro Breakdown
              </h2>

              <div className="space-y-4">
                {/* Protein */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Protein
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {consumedStats.protein} / {userProfile.nutritionTargets.macros.protein}g
                    </span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-3 rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${Math.min((consumedStats.protein / userProfile.nutritionTargets.macros.protein) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Carbs
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {consumedStats.carbs} / {userProfile.nutritionTargets.macros.carbs}g
                    </span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-3 rounded-full bg-green-600 transition-all duration-500"
                      style={{
                        width: `${Math.min((consumedStats.carbs / userProfile.nutritionTargets.macros.carbs) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fat
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      {consumedStats.fat} / {userProfile.nutritionTargets.macros.fat}g
                    </span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-3 rounded-full bg-orange-600 transition-all duration-500"
                      style={{
                        width: `${Math.min((consumedStats.fat / userProfile.nutritionTargets.macros.fat) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <RecipeDetailModal
        recipe={selectedRecipe}
        mealType={selectedMealType}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div >
  );
};

export default DashboardPage;