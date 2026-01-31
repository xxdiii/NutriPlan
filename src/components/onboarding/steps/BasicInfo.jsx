import React from 'react';
import { User, Ruler, Weight, Activity } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { ACTIVITY_LEVELS } from '../../../utils/constants';

const BasicInfo = ({ formData, setFormData }) => {
  const { isDark } = useTheme();

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Let's start with the basics
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          This helps us calculate your daily calorie and macro needs
        </p>
      </div>

      {/* Gender */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <User className="w-4 h-4 inline mr-2" />
          Gender
        </label>
        <div className="grid grid-cols-2 gap-4">
          {['Male', 'Female'].map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => handleChange('gender', gender.toLowerCase())}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.gender === gender.toLowerCase()
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : isDark
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`font-medium ${
                formData.gender === gender.toLowerCase()
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : isDark
                  ? 'text-gray-300'
                  : 'text-gray-700'
              }`}>
                {gender}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Age (years)
        </label>
        <input
          type="number"
          min="15"
          max="100"
          value={formData.age}
          onChange={(e) => handleChange('age', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-600'
              : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
          } focus:outline-none`}
          placeholder="25"
        />
      </div>

      {/* Height & Weight */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Ruler className="w-4 h-4 inline mr-2" />
            Height (cm)
          </label>
          <input
            type="number"
            min="100"
            max="250"
            value={formData.height}
            onChange={(e) => handleChange('height', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-600'
                : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
            } focus:outline-none`}
            placeholder="170"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Weight className="w-4 h-4 inline mr-2" />
            Weight (kg)
          </label>
          <input
            type="number"
            min="30"
            max="300"
            value={formData.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-white focus:border-emerald-600'
                : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-600'
            } focus:outline-none`}
            placeholder="70"
          />
        </div>
      </div>

      {/* Activity Level */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <Activity className="w-4 h-4 inline mr-2" />
          Activity Level
        </label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => handleChange('activityLevel', level.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                formData.activityLevel === level.value
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : isDark
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`font-medium ${
                formData.activityLevel === level.value
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : isDark
                  ? 'text-gray-300'
                  : 'text-gray-900'
              }`}>
                {level.label}
              </div>
              <div className={`text-sm ${
                formData.activityLevel === level.value
                  ? 'text-emerald-600 dark:text-emerald-500'
                  : isDark
                  ? 'text-gray-500'
                  : 'text-gray-600'
              }`}>
                {level.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;