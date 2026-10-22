import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import { RefreshCw, Download, Share2, ShoppingCart } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import WeeklyCalendar from './WeeklyCalendar';
import MealCard from './MealCard';
import RecipeDetailModal from '../recipe/RecipeDetailModal';
import MealSwapModal from './MealSwapModal';
import ComplianceCard from '../compliance/ComplianceCard';
import MealComplianceButton from '../compliance/MealComplianceButton';
import { getComplianceForDate } from '../../services/complianceService';
import { swapMeal } from '../../services/mealPlanService';
import { localDateString } from '../../utils/dates';

// Index of today's date in the plan, default to 0
const todayIndex = (weekPlan) => {
  const index = (weekPlan || []).findIndex(day => day.date === localDateString());
  return index >= 0 ? index : 0;
};

const MealPlanView = ({ weekPlan, onRegeneratePlan, setCurrentPage }) => {
  const { isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState(() => todayIndex(weekPlan));
  const [localWeekPlan, setLocalWeekPlan] = useState(weekPlan);

  // A regenerated plan replaces the local copy and jumps back to today.
  useEffect(() => {
    setLocalWeekPlan(weekPlan);
    setSelectedDay(todayIndex(weekPlan));
  }, [weekPlan]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [mealToSwap, setMealToSwap] = useState(null);
  const [mealTypeToSwap, setMealTypeToSwap] = useState(null);
  const [complianceUpdate, setComplianceUpdate] = useState(0);
  const [consumedStats, setConsumedStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const currentDayPlan = localWeekPlan[selectedDay];
  // Ensure we rely on a proper date string if available, else a fallback
  const currentDate = currentDayPlan?.date || localDateString();

  useEffect(() => {
    if (!currentDayPlan) return;

    const compliance = getComplianceForDate(currentDate);
    let stats = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    ['breakfast', 'lunch', 'snack', 'dinner'].forEach(type => {
      // Check if this meal is marked as 'eaten'
      if (compliance.meals && compliance.meals[type] === 'eaten') {
        const meal = currentDayPlan[type];
        if (meal) {
          stats.calories += (meal.calories || 0);
          stats.protein += (meal.protein || 0);
          stats.carbs += (meal.carbs || 0);
          stats.fat += (meal.fat || 0);
        }
      }
    });

    setConsumedStats(stats);
  }, [currentDayPlan, currentDate, complianceUpdate]);

  const handleComplianceUpdate = () => {
    setComplianceUpdate(prev => prev + 1);
  };

  const handleSwap = (mealType) => {
    const currentMeal = currentDayPlan[mealType];
    setMealToSwap(currentMeal);
    setMealTypeToSwap(mealType);
    setIsSwapModalOpen(true);
  };

  // The server re-portions the new meal to the calories of the one it replaces
  // and saves the plan, so swaps keep the day on target and survive a reload.
  const handleSwapConfirm = async (newMeal) => {
    const planDoc = await swapMeal(currentDate, mealTypeToSwap, newMeal.recipeId || newMeal.id);
    setLocalWeekPlan(planDoc.plan);
  };

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

  const handleCloseSwapModal = () => {
    setIsSwapModalOpen(false);
    setMealToSwap(null);
    setMealTypeToSwap(null);
  };

  const handleExport = () => {
    const weekPlan = localWeekPlan;
    if (!weekPlan || weekPlan.length === 0) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text("NutriPlan Weekly Meal Plan", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);

    let yPos = 45;

    weekPlan.forEach(day => {
      // Check for page break availability
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Day Header
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(`${day.day} (${day.date})`, 20, yPos);
      yPos += 8;

      // Daily Macros Summary
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Total: ${day.totalCalories} cal | Protein: ${day.totalProtein}g | Carbs: ${day.totalCarbs}g | Fat: ${day.totalFat}g`, 20, yPos);
      yPos += 12;

      // Meals
      ['breakfast', 'lunch', 'snack', 'dinner'].forEach(type => {
        const meal = day[type];
        if (meal) {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(5, 150, 105); // Emerald
          doc.setFont("helvetica", "bold");
          doc.text(type.charAt(0).toUpperCase() + type.slice(1), 25, yPos);

          doc.setTextColor(0);
          doc.setFont("helvetica", "normal");
          const mealName = `: ${meal.name}`;
          doc.text(mealName, 50, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text(`${meal.portionLabel ? `${meal.portionLabel} | ` : ''}${meal.calories} cal | P:${meal.protein}g C:${meal.carbs}g F:${meal.fat}g`, 50, yPos);
          yPos += 8;
        }
      });

      yPos += 10; // Extra spacing between days
    });

    doc.save(`meal-plan-${localDateString()}.pdf`);
  };

  const handleShare = () => {
    // Simple share implementation using Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'My Meal Plan',
        text: 'Check out my meal plan for this week!',
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback or alert
      alert("Sharing is not supported on this device/browser yet.");
    }
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Your Meal Plan
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Personalized meals for your goals and preferences
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCurrentPage && setCurrentPage('shopping')}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Shopping List</span>
          </button>

          <button
            onClick={handleExport}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={handleShare}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all ${isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={onRegeneratePlan}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium flex items-center space-x-2 hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar
        weekPlan={localWeekPlan}
        selectedDay={selectedDay}
        onDaySelect={setSelectedDay}
      />

      {/* Day Title, Nutrition & Compliance */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-8">
        {/* Date */}
        <div>
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentDayPlan?.day}
          </h2>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentDayPlan?.date}
          </p>
        </div>

        {/* Nutrition Overview (Consumed) */}
        <div className={`flex flex-wrap justify-center gap-4 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
          <div className="text-center px-4 border-r border-gray-200 dark:border-gray-700 last:border-0">
            <span className={`block text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              {consumedStats.calories}
            </span>
            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Consumed</span>
          </div>
          <div className="text-center px-4 border-r border-gray-200 dark:border-gray-700 last:border-0">
            <span className={`block text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {consumedStats.protein}g
            </span>
            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Protein</span>
          </div>
          <div className="text-center px-4 border-r border-gray-200 dark:border-gray-700 last:border-0">
            <span className={`block text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {consumedStats.carbs}g
            </span>
            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Carbs</span>
          </div>
          <div className="text-center px-4">
            <span className={`block text-2xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              {consumedStats.fat}g
            </span>
            <span className={`text-xs uppercase font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Fat</span>
          </div>
        </div>

        {/* Compliance */}
        <ComplianceCard date={currentDate} onUpdate={complianceUpdate} />
      </div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MealCard
          meal={currentDayPlan?.breakfast}
          mealType="breakfast"
          onSwap={handleSwap}
          onViewRecipe={handleViewRecipe}
        />
        <MealCard
          meal={currentDayPlan?.lunch}
          mealType="lunch"
          onSwap={handleSwap}
          onViewRecipe={handleViewRecipe}
        />
        <MealCard
          meal={currentDayPlan?.snack}
          mealType="snack"
          onSwap={handleSwap}
          onViewRecipe={handleViewRecipe}
        />
        <MealCard
          meal={currentDayPlan?.dinner}
          mealType="dinner"
          onSwap={handleSwap}
          onViewRecipe={handleViewRecipe}
        />
      </div>

      {/* Compliance Tracking */}
      <div className={`p-6 rounded-2xl mb-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Track Your Meals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentDayPlan?.breakfast && (
            <MealComplianceButton
              date={currentDate}
              mealType="breakfast"
              mealName={currentDayPlan.breakfast.name}
              onUpdate={handleComplianceUpdate}
            />
          )}
          {currentDayPlan?.lunch && (
            <MealComplianceButton
              date={currentDate}
              mealType="lunch"
              mealName={currentDayPlan.lunch.name}
              onUpdate={handleComplianceUpdate}
            />
          )}
          {currentDayPlan?.snack && (
            <MealComplianceButton
              date={currentDate}
              mealType="snack"
              mealName={currentDayPlan.snack.name}
              onUpdate={handleComplianceUpdate}
            />
          )}
          {currentDayPlan?.dinner && (
            <MealComplianceButton
              date={currentDate}
              mealType="dinner"
              mealName={currentDayPlan.dinner.name}
              onUpdate={handleComplianceUpdate}
            />
          )}
        </div>
      </div>



      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        mealType={selectedMealType}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Meal Swap Modal */}
      <MealSwapModal
        isOpen={isSwapModalOpen}
        onClose={handleCloseSwapModal}
        currentMeal={mealToSwap}
        mealType={mealTypeToSwap}
        date={currentDate}
        onSwap={handleSwapConfirm}
      />
    </div>
  );
};

export default MealPlanView;