import React, { useState } from 'react';
import { Check, Edit, User, Heart, Target, Leaf, DollarSign, Calculator, TrendingUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { calculateTDEE, calculateTargetCalories } from '../../../utils/calculations/tdee';
import { calculateMacros } from '../../../utils/calculations/macros';
import { ACTIVITY_LEVELS, GOALS, HEALTH_CONDITIONS, ALLERGENS, DIETARY_PREFERENCES, CUISINES, BUDGET_RANGES } from '../../../utils/constants';

const ReviewSubmit = ({ formData, setCurrentStep }) => {
  const { isDark } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate nutritional targets
  const tdee = calculateTDEE(
    formData.weight,
    formData.height,
    formData.age,
    formData.gender,
    formData.activityLevel
  );

  const targetCalories = calculateTargetCalories(tdee, formData.goal);
  const macros = calculateMacros(targetCalories, formData.goal, formData.dietaryPreference);

  // Get display labels
  const getActivityLabel = () => {
    const level = ACTIVITY_LEVELS.find(l => l.value === formData.activityLevel);
    return level ? level.label : '';
  };

  const getGoalLabel = () => {
    const goal = GOALS.find(g => g.value === formData.goal);
    return goal ? goal.label : '';
  };

  const getDietaryLabel = () => {
    const diet = DIETARY_PREFERENCES.find(d => d.id === formData.dietaryPreference);
    return diet ? diet.name : '';
  };

  const getBudgetLabel = () => {
    const budget = BUDGET_RANGES.find(b => b.value === formData.budget);
    return budget ? budget.label : '';
  };

  const getSelectedCuisines = () => {
    return CUISINES.filter(c => (formData.cuisines || []).includes(c.id))
      .map(c => c.name)
      .join(', ');
  };

  const getSelectedConditions = () => {
    return HEALTH_CONDITIONS.filter(c => (formData.healthConditions || []).includes(c.id))
      .map(c => c.name)
      .join(', ');
  };

  const getSelectedAllergies = () => {
    return ALLERGENS.filter(a => (formData.allergies || []).includes(a.id))
      .map(a => a.name)
      .join(', ');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
  
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  
    // Store data in localStorage
    localStorage.setItem('userProfile', JSON.stringify({
        ...formData,
        nutritionTargets: {
        tdee,
        targetCalories,
        macros
        },
        createdAt: new Date().toISOString()
    }));
  
    setIsSubmitting(false);
    setShowSuccess(true);
  
    // Navigate to dashboard after 2 seconds
    setTimeout(() => {
        window.location.reload(); // This will trigger the useEffect in App.jsx
    }, 2000);
  };

  const InfoCard = ({ icon: Icon, title, children, onEdit, stepNumber }) => (
    <div className={`p-6 rounded-2xl border-2 ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-emerald-600" />
          <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
        </div>
        <button
          onClick={() => setCurrentStep(stepNumber)}
          className={`text-sm font-medium flex items-center space-x-1 ${
            isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>
      <div className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-start">
      <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>{label}:</span>
      <span className={`font-medium text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
    </div>
  );

  if (showSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Profile Created Successfully! 🎉
        </h2>
        <p className={`text-lg mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Your personalized meal plan is being generated...
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Review Your Information
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Please verify all details before submitting. You can edit any section if needed.
        </p>
      </div>

      {/* Nutrition Targets Summary */}
      <div className={`p-6 rounded-2xl border-2 ${
        isDark ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-800' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
      }`}>
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="w-6 h-6 text-emerald-600" />
          <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Your Daily Nutrition Targets
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-gray-800/50' : 'bg-white/50'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Maintenance
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {tdee}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              calories
            </div>
          </div>

          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Target Calories
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
              {targetCalories}
            </div>
            <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-700'}`}>
              calories
            </div>
          </div>

          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              Protein
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
              {macros.protein}g
            </div>
            <div className={`text-xs ${isDark ? 'text-blue-500' : 'text-blue-700'}`}>
              per day
            </div>
          </div>

          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              Carbs / Fat
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-900'}`}>
              {macros.carbs}g / {macros.fat}g
            </div>
            <div className={`text-xs ${isDark ? 'text-orange-500' : 'text-orange-700'}`}>
              per day
            </div>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <InfoCard icon={User} title="Basic Information" onEdit={() => setCurrentStep(1)} stepNumber={1}>
        <InfoRow label="Gender" value={formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)} />
        <InfoRow label="Age" value={`${formData.age} years`} />
        <InfoRow label="Height" value={`${formData.height} cm`} />
        <InfoRow label="Weight" value={`${formData.weight} kg`} />
        <InfoRow label="Activity Level" value={getActivityLabel()} />
      </InfoCard>

      {/* Health Conditions */}
      <InfoCard icon={Heart} title="Health & Medical" onEdit={() => setCurrentStep(2)} stepNumber={2}>
        <InfoRow 
          label="Health Conditions" 
          value={getSelectedConditions() || 'None'} 
        />
        <InfoRow 
          label="Allergies" 
          value={getSelectedAllergies() || 'None'} 
        />
        {formData.medications && (
          <InfoRow label="Medications" value={formData.medications} />
        )}
        {formData.isPregnant && (
          <div className={`p-2 rounded ${isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
            ✓ Currently pregnant
          </div>
        )}
        {formData.isBreastfeeding && (
          <div className={`p-2 rounded ${isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
            ✓ Currently breastfeeding
          </div>
        )}
      </InfoCard>

      {/* Goals */}
      <InfoCard icon={Target} title="Fitness Goals" onEdit={() => setCurrentStep(3)} stepNumber={3}>
        <InfoRow label="Goal" value={getGoalLabel()} />
        {formData.goal !== 'maintain' && (
          <>
            <InfoRow label="Target Weight" value={`${formData.targetWeight} kg`} />
            <InfoRow label="Target Rate" value={`${formData.targetRate} kg/week`} />
          </>
        )}
      </InfoCard>

      {/* Dietary Preferences */}
      <InfoCard icon={Leaf} title="Dietary Preferences" onEdit={() => setCurrentStep(4)} stepNumber={4}>
        <InfoRow label="Diet Type" value={getDietaryLabel()} />
        <InfoRow label="Cuisines" value={getSelectedCuisines()} />
        <InfoRow label="Cooking Skill" value={formData.cookingSkill.charAt(0).toUpperCase() + formData.cookingSkill.slice(1)} />
        {formData.dislikedFoods && (
          <InfoRow label="Disliked Foods" value={formData.dislikedFoods} />
        )}
      </InfoCard>

      {/* Budget & Region */}
      <InfoCard icon={DollarSign} title="Budget & Location" onEdit={() => setCurrentStep(5)} stepNumber={5}>
        <InfoRow label="Budget" value={getBudgetLabel()} />
        <InfoRow label="Region" value={formData.region} />
        <InfoRow label="Servings" value={`${formData.servings} ${formData.servings === 1 ? 'person' : 'people'}`} />
        <InfoRow 
          label="Meal Prep" 
          value={
            formData.mealPrepPreference === 'daily' ? 'Cook Daily' :
            formData.mealPrepPreference === 'batch_3' ? 'Batch Cook (3 days)' :
            'Weekly Prep'
          } 
        />
      </InfoCard>

      {/* Important Notice */}
      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <strong>Medical Disclaimer:</strong> This meal plan is for informational purposes only and is not a substitute for professional medical advice. Always consult with healthcare providers before starting any diet program, especially if you have health conditions or take medications.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`px-12 py-5 rounded-xl font-semibold text-xl flex items-center space-x-3 transition-all duration-200 ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-2xl hover:scale-105'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Creating Your Plan...</span>
            </>
          ) : (
            <>
              <Check className="w-6 h-6" />
              <span>Create My Meal Plan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReviewSubmit;