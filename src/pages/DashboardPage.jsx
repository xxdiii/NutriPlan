import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { User, Calendar, TrendingUp, Target, Flame, Award, ChevronRight, Utensils } from 'lucide-react';
import { createAndSaveMealPlan } from '../services/mealPlanGenerator';
import RecipeDetailModal from '../components/recipe/RecipeDetailModal';
import { getWeeklyCompliance, calculateCombinedStreak, getComplianceForDate, getWeeklyMealBreakdown } from '../services/complianceService';
import { api } from '../services/api';
import HydrationTracker from '../components/dashboard/HydrationTracker';
import NextMealCard from '../components/dashboard/NextMealCard';

const DashboardPage = ({ setCurrentPage }) => {
  const { isDark } = useTheme();
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
  const [mealBreakdown, setMealBreakdown] = useState({ breakfast: 0, lunch: 0, snack: 0, dinner: 0 });
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
        setMealBreakdown(getWeeklyMealBreakdown());
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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-canvas)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)"
            strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  // If no profile exists or profile is empty, prompt user to complete onboarding
  if (!userProfile || Object.keys(userProfile).length === 0) {
    return (
      <div style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
      }}>
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: 'var(--color-brand)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: 'var(--shadow-brand)',
          }}>
            <User style={{ width: '1.75rem', height: '1.75rem', color: '#fff' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'var(--text-2xl)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            margin: '0 0 0.75rem',
          }}>Complete your profile</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            marginBottom: '2rem',
          }}>Set up your health profile to receive personalised meal plans and nutrition tracking.</p>
          <button
            onClick={() => setCurrentPage('onboarding')}
            className="btn btn--primary"
            style={{ padding: '0.75rem 2rem', fontSize: 'var(--text-base)' }}
          >
            Get started
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
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }}>

      {/* Main Content */}
      <div className="container-page" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'var(--text-3xl)',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            margin: '0 0 0.4rem',
          }}>Good day 👋</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar style={{ width: '1rem', height: '1rem', color: 'var(--color-text-muted)' }} />
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}>{formatDate(currentDate)}</p>
          </div>
        </div>

        {/* Quick Stats — top row: 4 fixed stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Calories */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Calories today</span>
                <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {consumedStats.calories}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>of {userProfile.nutritionTargets.targetCalories} target</span>
              </div>
              <div style={{ padding: '0.625rem', background: 'oklch(96% 0.06 52)', borderRadius: '0.625rem' }}>
                <Flame style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(58% 0.15 52)' }} />
              </div>
            </div>
            <div className="progress-track" style={{ height: '6px' }}>
              <div className="progress-fill" style={{
                width: `${Math.min((consumedStats.calories / userProfile.nutritionTargets.targetCalories) * 100, 100)}%`,
                background: 'oklch(68% 0.15 52)',
              }} />
            </div>
          </div>

          {/* Protein */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Protein</span>
                <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {consumedStats.protein}g
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>of {userProfile.nutritionTargets.macros.protein}g target</span>
              </div>
              <div style={{ padding: '0.625rem', background: 'var(--color-brand-muted)', borderRadius: '0.625rem' }}>
                <Target style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)' }} />
              </div>
            </div>
            <div className="progress-track" style={{ height: '6px' }}>
              <div className="progress-fill" style={{
                width: `${Math.min((consumedStats.protein / userProfile.nutritionTargets.macros.protein) * 100, 100)}%`,
                background: 'var(--color-brand)',
              }} />
            </div>
          </div>

          {/* Weight */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Current weight</span>
                <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {userProfile.weight} <span style={{ fontSize: 'var(--text-xl)' }}>kg</span>
                </span>
                {userProfile.goal !== 'maintain' && (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-brand)' }}>Target: {userProfile.targetWeight} kg</span>
                )}
              </div>
              <div style={{ padding: '0.625rem', background: 'oklch(94% 0.04 280)', borderRadius: '0.625rem' }}>
                <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: 'oklch(50% 0.15 280)' }} />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Streak</span>
                <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {streak} <span style={{ fontSize: 'var(--text-xl)' }}>{streak === 1 ? 'day' : 'days'}</span>
                </span>
                {weeklyCompliance && (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-brand)', fontWeight: 600 }}>
                    {weeklyCompliance.overallCompliance}% compliance this week
                  </span>
                )}
              </div>
              <div style={{ padding: '0.625rem', background: 'var(--color-brand-muted)', borderRadius: '0.625rem' }}>
                <Award style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)' }} />
              </div>
            </div>
          </div>

        </div>

        {/* Second row: Hydration + Next Meal — full-width 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <HydrationTracker />
          <NextMealCard
            todaysMeals={todaysMeals}
            onViewRecipe={handleViewRecipe}
          />
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

          {/* ── SIDEBAR COLUMN — aligns to top, no blank stretch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignSelf: 'start' }}>

            {/* Card 1: Macro Breakdown */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: '0 0 1rem 0' }}>
                Macro Breakdown
              </h2>

              {/* Calorie donut */}
              {(() => {
                const calPct = Math.min((consumedStats.calories / (userProfile.nutritionTargets.targetCalories || 1)) * 100, 100);
                const r = 38; const circ = 2 * Math.PI * r;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                      <svg viewBox="0 0 80 80" width="80" height="80">
                        <circle cx="40" cy="40" r={r} fill="none" stroke={isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'} strokeWidth="7" />
                        <circle cx="40" cy="40" r={r} fill="none" stroke="oklch(68% 0.15 52)" strokeWidth="7"
                          strokeLinecap="round" strokeDasharray={circ}
                          strokeDashoffset={circ * (1 - calPct / 100)}
                          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
                          transform="rotate(-90 40 40)" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>{Math.round(calPct)}%</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.55rem', color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>goal</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Calories today</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.2rem' }}>{consumedStats.calories}</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>of {userProfile.nutritionTargets.targetCalories} kcal</div>
                      <div style={{ marginTop: '0.5rem', height: '4px', background: isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${calPct}%`, height: '100%', background: 'oklch(68% 0.15 52)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Macro bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Protein', val: consumedStats.protein, max: userProfile.nutritionTargets.macros.protein, color: 'var(--color-brand)' },
                  { label: 'Carbs',   val: consumedStats.carbs,   max: userProfile.nutritionTargets.macros.carbs,   color: 'oklch(68% 0.15 52)' },
                  { label: 'Fat',     val: consumedStats.fat,     max: userProfile.nutritionTargets.macros.fat,     color: 'oklch(52% 0.13 250)' },
                ].map(({ label, val, max, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700, color }}>{val} / {max}g</span>
                    </div>
                    <div className="progress-track" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${Math.min((val / (max || 1)) * 100, 100)}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: This week */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: '0 0 1rem 0' }}>
                This week
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { label: 'Breakfast', pct: mealBreakdown.breakfast },
                  { label: 'Lunch',     pct: mealBreakdown.lunch },
                  { label: 'Snack',     pct: mealBreakdown.snack },
                  { label: 'Dinner',    pct: mealBreakdown.dinner },
                ].map(({ label, pct }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-brand)' }}>{pct}%</span>
                    </div>
                    <div className="progress-track" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--color-brand)' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.75rem', background: 'var(--color-brand-muted)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-brand)' }}>Overall</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-brand)', letterSpacing: '-0.03em' }}>{weeklyCompliance?.overallCompliance ?? 0}%</span>
                </div>
              </div>
            </div>

          </div>{/* end sidebar column */}

          </div>

        </div>

      <RecipeDetailModal
        recipe={selectedRecipe}
        mealType={selectedMealType}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
      </div>
  );
};

export default DashboardPage;