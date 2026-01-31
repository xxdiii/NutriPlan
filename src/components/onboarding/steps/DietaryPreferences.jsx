import React from 'react';
import { Leaf, Globe, ThumbsDown, Info, ChefHat } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { DIETARY_PREFERENCES, CUISINES } from '../../../utils/constants';

const DietaryPreferences = ({ formData, setFormData }) => {
  const { isDark } = useTheme();

  const handleDietaryPreferenceChange = (preferenceId) => {
    setFormData({ ...formData, dietaryPreference: preferenceId });
  };

  const handleCuisineToggle = (cuisineId) => {
    const cuisines = formData.cuisines || [];
    if (cuisines.includes(cuisineId)) {
      setFormData({
        ...formData,
        cuisines: cuisines.filter(id => id !== cuisineId)
      });
    } else {
      setFormData({
        ...formData,
        cuisines: [...cuisines, cuisineId]
      });
    }
  };

  const handleDislikedFoodsChange = (value) => {
    setFormData({ ...formData, dislikedFoods: value });
  };

  const handleCookingSkillChange = (skill) => {
    setFormData({ ...formData, cookingSkill: skill });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Your Food Preferences
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Let's personalize your meal plans to match your tastes and cooking style
        </p>
      </div>

      {/* Dietary Preference */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Leaf className="w-5 h-5 mr-2 text-green-500" />
          Dietary Preference
        </label>

        <div className="space-y-3">
          {DIETARY_PREFERENCES.map((pref) => {
            const isSelected = formData.dietaryPreference === pref.id;
            
            return (
              <button
                key={pref.id}
                type="button"
                onClick={() => handleDietaryPreferenceChange(pref.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className={`font-medium mb-1 ${
                      isSelected
                        ? 'text-green-700 dark:text-green-400'
                        : isDark
                        ? 'text-gray-300'
                        : 'text-gray-900'
                    }`}>
                      {pref.name}
                    </div>
                    <div className={`text-sm ${
                      isSelected
                        ? 'text-green-600 dark:text-green-500'
                        : isDark
                        ? 'text-gray-500'
                        : 'text-gray-600'
                    }`}>
                      {pref.description}
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ml-4 ${
                    isSelected
                      ? 'bg-green-600 border-green-600'
                      : isDark
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Favorite Cuisines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className={`text-lg font-semibold flex items-center ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <Globe className="w-5 h-5 mr-2 text-blue-500" />
            Favorite Cuisines
          </label>
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Select multiple
          </span>
        </div>

        <div className={`p-4 rounded-xl mb-4 ${
          isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              We'll prioritize recipes from these cuisines in your meal plans
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CUISINES.map((cuisine) => {
            const isSelected = (formData.cuisines || []).includes(cuisine.id);
            
            return (
              <button
                key={cuisine.id}
                type="button"
                onClick={() => handleCuisineToggle(cuisine.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{cuisine.flag}</div>
                <div className={`font-medium text-sm ${
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {cuisine.name}
                </div>

                {/* Checkbox indicator */}
                <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600'
                    : isDark
                    ? 'border-gray-600'
                    : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {(formData.cuisines || []).length === 0 && (
          <p className={`text-sm mt-3 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
            💡 Select at least one cuisine for better recommendations
          </p>
        )}
      </div>

      {/* Cooking Skill Level */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <ChefHat className="w-5 h-5 mr-2 text-orange-500" />
          Cooking Skill Level
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { 
              value: 'beginner', 
              label: 'Beginner', 
              description: 'Simple recipes with 5-7 ingredients',
              icon: '🍳'
            },
            { 
              value: 'intermediate', 
              label: 'Intermediate', 
              description: 'Moderate complexity, 8-12 ingredients',
              icon: '👨‍🍳'
            },
            { 
              value: 'advanced', 
              label: 'Advanced', 
              description: 'Complex recipes, multiple techniques',
              icon: '👨‍🍳⭐'
            }
          ].map((skill) => {
            const isSelected = formData.cookingSkill === skill.value;
            
            return (
              <button
                key={skill.value}
                type="button"
                onClick={() => handleCookingSkillChange(skill.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{skill.icon}</div>
                <div className={`font-medium mb-1 ${
                  isSelected
                    ? 'text-orange-700 dark:text-orange-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {skill.label}
                </div>
                <div className={`text-xs ${
                  isSelected
                    ? 'text-orange-600 dark:text-orange-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {skill.description}
                </div>

                {/* Selected indicator */}
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
      </div>

      {/* Disliked Foods */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <ThumbsDown className="w-5 h-5 mr-2 text-red-500" />
          Foods You Dislike
          <span className={`ml-2 text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            (Optional)
          </span>
        </label>

        <div className={`p-3 rounded-lg mb-3 text-sm ${
          isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-800'
        }`}>
          We'll avoid these ingredients in your meal plans
        </div>

        <textarea
          value={formData.dislikedFoods || ''}
          onChange={(e) => handleDislikedFoodsChange(e.target.value)}
          placeholder="e.g., mushrooms, eggplant, bitter gourd, okra..."
          rows="3"
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-600'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-600'
          } focus:outline-none resize-none`}
        />
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          💡 Separate multiple items with commas
        </p>
      </div>

      {/* Meal Preferences Info */}
      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'
      }`}>
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              <strong>Good to know:</strong> We'll create diverse meal plans with recipes that match your preferences. You can always swap meals you don't like later!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DietaryPreferences;