import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus, Info, Scale } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { GOALS } from '../../../utils/constants';

const Goals = ({ formData, setFormData }) => {
  const { isDark } = useTheme();

  const handleGoalChange = (goalValue) => {
    setFormData({ ...formData, goal: goalValue });
  };

  const handleTargetRateChange = (value) => {
    setFormData({ ...formData, targetRate: parseFloat(value) });
  };

  const handleTargetWeightChange = (value) => {
    setFormData({ ...formData, targetWeight: value });
  };

  const getRecommendedRate = () => {
    if (formData.goal === 'cut') return 0.5;
    if (formData.goal === 'bulk') return 0.25;
    return 0;
  };

  const getEstimatedTime = () => {
    if (!formData.goal || !formData.targetRate) return null;
    
    if (formData.goal === 'maintain') {
      return 'Ongoing';
    }

    const currentWeight = parseFloat(formData.weight) || 0;
    const targetWeight = parseFloat(formData.targetWeight) || 0;
    
    if (!currentWeight || !targetWeight) return null;

    const weightDifference = Math.abs(targetWeight - currentWeight);
    const weeklyRate = formData.targetRate;
    
    if (weeklyRate === 0) return null;
    
    const weeks = Math.ceil(weightDifference / weeklyRate);
    const months = Math.floor(weeks / 4);
    
    if (months > 0) {
      return `~${months} month${months > 1 ? 's' : ''} (${weeks} weeks)`;
    }
    return `~${weeks} week${weeks > 1 ? 's' : ''}`;
  };

  const getWeightDifference = () => {
    const currentWeight = parseFloat(formData.weight) || 0;
    const targetWeight = parseFloat(formData.targetWeight) || 0;
    
    if (!currentWeight || !targetWeight) return null;
    
    return Math.abs(targetWeight - currentWeight);
  };

  const isTargetWeightValid = () => {
    const currentWeight = parseFloat(formData.weight) || 0;
    const targetWeight = parseFloat(formData.targetWeight) || 0;
    
    if (!targetWeight) return true; // Not filled yet
    
    if (formData.goal === 'cut' && targetWeight >= currentWeight) {
      return false;
    }
    if (formData.goal === 'bulk' && targetWeight <= currentWeight) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          What's your fitness goal?
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          We'll create a personalized meal plan to help you achieve it safely
        </p>
      </div>

      {/* Goal Selection */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Target className="w-5 h-5 mr-2 text-emerald-500" />
          Select Your Goal
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GOALS.map((goal) => {
            const isSelected = formData.goal === goal.value;
            
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => handleGoalChange(goal.value)}
                className={`p-6 rounded-2xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg scale-105'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Icon */}
                <div className="text-5xl mb-3">{goal.icon}</div>

                {/* Title */}
                <div className={`font-bold text-lg mb-2 ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {goal.label}
                </div>

                {/* Description */}
                <div className={`text-sm ${
                  isSelected
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {goal.description}
                </div>

                {/* Calorie Info */}
                <div className={`mt-3 text-xs font-medium ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isDark
                    ? 'text-gray-600'
                    : 'text-gray-500'
                }`}>
                  {goal.deficit > 0 && `+${goal.deficit} cal/day`}
                  {goal.deficit < 0 && `${goal.deficit} cal/day`}
                  {goal.deficit === 0 && 'Maintenance calories'}
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
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

      {/* Target Weight (only show if goal is cut or bulk) */}
      {formData.goal && formData.goal !== 'maintain' && (
        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <Scale className="w-5 h-5 mr-2 text-purple-500" />
            Target Weight
          </label>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Current Weight
                </label>
                <div className={`px-4 py-3 rounded-xl border-2 ${
                  isDark ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}>
                  {formData.weight} kg
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Target Weight
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="0.5"
                  value={formData.targetWeight || ''}
                  onChange={(e) => handleTargetWeightChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                    !isTargetWeightValid()
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : isDark
                      ? 'bg-gray-900 border-gray-700 text-white focus:border-emerald-600'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
                  } focus:outline-none`}
                  placeholder={formData.goal === 'cut' ? '65' : '75'}
                />
              </div>
            </div>

            {/* Weight Difference Display */}
            {formData.targetWeight && isTargetWeightValid() && getWeightDifference() && (
              <div className={`p-3 rounded-xl text-center ${
                isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                  Total {formData.goal === 'cut' ? 'Loss' : 'Gain'} Needed
                </div>
                <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                  {getWeightDifference().toFixed(1)} kg
                </div>
              </div>
            )}

            {/* Validation Error */}
            {formData.targetWeight && !isTargetWeightValid() && (
              <div className={`p-3 rounded-xl ${
                isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start space-x-2">
                  <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                    {formData.goal === 'cut' 
                      ? 'Target weight must be less than your current weight for weight loss.'
                      : 'Target weight must be greater than your current weight for muscle gain.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Rate (only show if goal is selected and not maintain and target weight is valid) */}
      {formData.goal && formData.goal !== 'maintain' && formData.targetWeight && isTargetWeightValid() && (
        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {formData.goal === 'cut' ? (
              <TrendingDown className="w-5 h-5 mr-2 text-blue-500" />
            ) : (
              <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
            )}
            Target Rate
          </label>

          {/* Info Box */}
          <div className={`p-4 rounded-xl mb-4 ${
            isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                <strong>Recommended:</strong> {formData.goal === 'cut' ? '0.5kg/week for sustainable fat loss' : '0.25kg/week for lean muscle gain'}
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formData.goal === 'cut' ? 'Weight Loss Rate' : 'Weight Gain Rate'}
              </span>
              <span className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {formData.targetRate} kg/week
              </span>
            </div>

            <input
              type="range"
              min={formData.goal === 'cut' ? '0.25' : '0.1'}
              max={formData.goal === 'cut' ? '1' : '0.5'}
              step="0.05"
              value={formData.targetRate}
              onChange={(e) => handleTargetRateChange(e.target.value)}
              className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex justify-between text-xs">
              <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                {formData.goal === 'cut' ? 'Slow' : 'Very Slow'}
              </span>
              <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                {formData.goal === 'cut' ? 'Aggressive' : 'Fast'}
              </span>
            </div>
          </div>

          {/* Rate Guidelines */}
          <div className={`mt-4 p-4 rounded-xl ${
            formData.goal === 'cut'
              ? formData.targetRate <= 0.5
                ? isDark ? 'bg-green-900/20' : 'bg-green-50'
                : formData.targetRate <= 0.75
                ? isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'
                : isDark ? 'bg-red-900/20' : 'bg-red-50'
              : formData.targetRate <= 0.25
              ? isDark ? 'bg-green-900/20' : 'bg-green-50'
              : isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              formData.goal === 'cut'
                ? formData.targetRate <= 0.5
                  ? isDark ? 'text-green-300' : 'text-green-800'
                  : formData.targetRate <= 0.75
                  ? isDark ? 'text-yellow-300' : 'text-yellow-800'
                  : isDark ? 'text-red-300' : 'text-red-800'
                : formData.targetRate <= 0.25
                ? isDark ? 'text-green-300' : 'text-green-800'
                : isDark ? 'text-yellow-300' : 'text-yellow-800'
            }`}>
              {formData.goal === 'cut' 
                ? formData.targetRate <= 0.5
                  ? '✓ Sustainable & Healthy'
                  : formData.targetRate <= 0.75
                  ? '⚠️ Moderate - Monitor Closely'
                  : '⚠️ Very Aggressive - Not Recommended'
                : formData.targetRate <= 0.25
                ? '✓ Optimal for Lean Gains'
                : '⚠️ Fast - May Include More Fat'
              }
            </div>
            <div className={`text-xs ${
              formData.goal === 'cut'
                ? formData.targetRate <= 0.5
                  ? isDark ? 'text-green-400' : 'text-green-700'
                  : formData.targetRate <= 0.75
                  ? isDark ? 'text-yellow-400' : 'text-yellow-700'
                  : isDark ? 'text-red-400' : 'text-red-700'
                : formData.targetRate <= 0.25
                ? isDark ? 'text-green-400' : 'text-green-700'
                : isDark ? 'text-yellow-400' : 'text-yellow-700'
            }`}>
              {formData.goal === 'cut'
                ? formData.targetRate <= 0.5
                  ? 'Preserves muscle mass and energy levels'
                  : formData.targetRate <= 0.75
                  ? 'May cause fatigue and muscle loss'
                  : 'High risk of metabolic adaptation and muscle loss'
                : formData.targetRate <= 0.25
                ? 'Maximizes muscle gain while minimizing fat'
                : 'Faster gains but with more fat accumulation'
              }
            </div>
          </div>

          {/* Estimated Timeline */}
          {getEstimatedTime() && (
            <div className={`mt-4 p-4 rounded-xl text-center ${
              isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'
            }`}>
              <div className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                Estimated Timeline to Reach {formData.targetWeight}kg
              </div>
              <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                {getEstimatedTime()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maintain Goal Message */}
      {formData.goal === 'maintain' && (
        <div className={`p-6 rounded-2xl border-2 ${
          isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-start space-x-3">
            <Minus className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className={`font-semibold text-lg mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                Maintaining Your Current Weight
              </div>
              <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                We'll calculate your maintenance calories and create balanced meal plans to help you stay at your current weight while improving your overall nutrition and health.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning for Aggressive Cutting */}
      {formData.goal === 'cut' && formData.targetRate > 0.75 && (
        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
              <strong>Important:</strong> Rapid weight loss can lead to muscle loss, nutrient deficiencies, and metabolic slowdown. We strongly recommend consulting a healthcare provider before proceeding with this rate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;