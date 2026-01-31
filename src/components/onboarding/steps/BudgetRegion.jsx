import React from 'react';
import { DollarSign, MapPin, Calendar, Package, Info } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { BUDGET_RANGES, INDIAN_STATES } from '../../../utils/constants';

const BudgetRegion = ({ formData, setFormData }) => {
  const { isDark } = useTheme();

  const handleBudgetChange = (budgetValue) => {
    setFormData({ ...formData, budget: budgetValue });
  };

  const handleRegionChange = (value) => {
    setFormData({ ...formData, region: value });
  };

  const handleMealPrepChange = (value) => {
    setFormData({ ...formData, mealPrepPreference: value });
  };

  const handleServingsChange = (value) => {
    setFormData({ ...formData, servings: parseInt(value) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Budget & Location
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Help us find affordable ingredients available in your area
        </p>
      </div>

      {/* Budget Range */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <DollarSign className="w-5 h-5 mr-2 text-green-500" />
          Monthly Food Budget
        </label>

        <div className={`p-4 rounded-xl mb-4 ${
          isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>
              This helps us recommend meals within your budget and suggest cost-effective alternatives
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUDGET_RANGES.map((budget) => {
            const isSelected = formData.budget === budget.value;
            
            return (
              <button
                key={budget.value}
                type="button"
                onClick={() => handleBudgetChange(budget.value)}
                className={`p-6 rounded-2xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 shadow-lg scale-105'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`text-3xl mb-3 ${
                  budget.value === 'low' ? '💰' : budget.value === 'medium' ? '💵' : '💎'
                }`}>
                  {budget.value === 'low' ? '💰' : budget.value === 'medium' ? '💵' : '💎'}
                </div>

                <div className={`font-bold text-lg mb-2 ${
                  isSelected
                    ? 'text-green-700 dark:text-green-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {budget.label}
                </div>

                <div className={`text-sm font-medium mb-2 ${
                  isSelected
                    ? 'text-green-600 dark:text-green-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {budget.range}
                </div>

                <div className={`text-xs ${
                  isSelected
                    ? 'text-green-600 dark:text-green-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {budget.description}
                </div>

                {isSelected && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Region/State */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <MapPin className="w-5 h-5 mr-2 text-blue-500" />
          Your Location
        </label>

        <div className={`p-3 rounded-lg mb-3 text-sm ${
          isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'
        }`}>
          We'll prioritize locally available ingredients and regional recipes
        </div>

        <select
          value={formData.region || ''}
          onChange={(e) => handleRegionChange(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-600'
              : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
          } focus:outline-none appearance-none cursor-pointer`}
        >
          <option value="">Select your state/region</option>
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Number of Servings */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Package className="w-5 h-5 mr-2 text-purple-500" />
          Servings Per Meal
        </label>

        <div className={`p-3 rounded-lg mb-4 text-sm ${
          isDark ? 'bg-purple-900/20 text-purple-300' : 'bg-purple-50 text-purple-800'
        }`}>
          How many people are you cooking for? This helps us calculate ingredient quantities
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((num) => {
            const isSelected = formData.servings === num;
            
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleServingsChange(num)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">
                  {num === 1 ? '👤' : num === 2 ? '👥' : num === 3 ? '👨‍👩‍👦' : '👨‍👩‍👧‍👦'}
                </div>
                <div className={`font-bold ${
                  isSelected
                    ? 'text-purple-700 dark:text-purple-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {num} {num === 1 ? 'Person' : 'People'}
                </div>

                {isSelected && (
                  <div className="mt-2 flex justify-center">
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className={`mt-3 text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          💡 Cooking for more than 4 people? We'll scale recipes accordingly
        </div>
      </div>

      {/* Meal Prep Preference */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Calendar className="w-5 h-5 mr-2 text-orange-500" />
          Meal Prep Preference
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              value: 'daily',
              label: 'Cook Daily',
              description: 'Fresh meals every day',
              icon: '🍳'
            },
            {
              value: 'batch_3',
              label: 'Batch Cook (3 days)',
              description: 'Cook once for 3 days',
              icon: '📦'
            },
            {
              value: 'batch_7',
              label: 'Weekly Prep',
              description: 'Meal prep for the week',
              icon: '🗓️'
            }
          ].map((pref) => {
            const isSelected = formData.mealPrepPreference === pref.value;
            
            return (
              <button
                key={pref.value}
                type="button"
                onClick={() => handleMealPrepChange(pref.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{pref.icon}</div>
                <div className={`font-medium mb-1 ${
                  isSelected
                    ? 'text-orange-700 dark:text-orange-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {pref.label}
                </div>
                <div className={`text-xs ${
                  isSelected
                    ? 'text-orange-600 dark:text-orange-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {pref.description}
                </div>

                {isSelected && (
                  <div className="mt-2 flex justify-center">
                    <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className={`mt-4 p-4 rounded-xl ${
          isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
              {formData.mealPrepPreference === 'daily' && 'We\'ll suggest quick recipes that can be prepared fresh each day'}
              {formData.mealPrepPreference === 'batch_3' && 'We\'ll include batch-friendly recipes that stay fresh for 3 days with proper storage'}
              {formData.mealPrepPreference === 'batch_7' && 'We\'ll focus on meal prep recipes that can be prepared in advance and stored for the week'}
              {!formData.mealPrepPreference && 'Select your preference to see customized meal planning tips'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className={`p-6 rounded-2xl ${
        isDark ? 'bg-emerald-900/20 border-2 border-emerald-800' : 'bg-emerald-50 border-2 border-emerald-200'
      }`}>
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className={`font-semibold text-lg mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
              Almost Done! 🎉
            </div>
            <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              In the next step, you'll review all your information before we generate your personalized meal plan. We'll also calculate your daily calorie and macro targets based on your goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetRegion;