import React, { useState } from 'react';
import { Heart, AlertCircle, Pill, Info } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { HEALTH_CONDITIONS, ALLERGENS } from '../../../utils/constants';

const HealthConditions = ({ formData, setFormData }) => {
  const { isDark } = useTheme();
  const [showInfo, setShowInfo] = useState(null);

  const handleConditionToggle = (conditionId) => {
    const conditions = formData.healthConditions || [];
    if (conditions.includes(conditionId)) {
      setFormData({
        ...formData,
        healthConditions: conditions.filter(id => id !== conditionId)
      });
    } else {
      setFormData({
        ...formData,
        healthConditions: [...conditions, conditionId]
      });
    }
  };

  const handleAllergyToggle = (allergyId) => {
    const allergies = formData.allergies || [];
    if (allergies.includes(allergyId)) {
      setFormData({
        ...formData,
        allergies: allergies.filter(id => id !== allergyId)
      });
    } else {
      setFormData({
        ...formData,
        allergies: [...allergies, allergyId]
      });
    }
  };

  const handleMedicationChange = (value) => {
    setFormData({ ...formData, medications: value });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Health & Medical Information
        </h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Help us create a safe plan that respects your health conditions
        </p>
      </div>

      {/* Health Conditions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className={`text-lg font-semibold flex items-center ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Health Conditions
          </label>
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Select all that apply
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HEALTH_CONDITIONS.map((condition) => {
            const isSelected = (formData.healthConditions || []).includes(condition.id);
            
            return (
              <div key={condition.id} className="relative">
                <button
                  type="button"
                  onClick={() => handleConditionToggle(condition.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                      : isDark
                      ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between pr-16">
                    <div className="flex-1">
                      <div className={`font-medium mb-1 ${
                        isSelected
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isDark
                          ? 'text-gray-300'
                          : 'text-gray-900'
                      }`}>
                        {condition.name}
                      </div>
                      <div className={`text-sm ${
                        isSelected
                          ? 'text-emerald-600 dark:text-emerald-500'
                          : isDark
                          ? 'text-gray-500'
                          : 'text-gray-600'
                      }`}>
                        {condition.description}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Info button - positioned separately */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(showInfo === condition.id ? null : condition.id);
                  }}
                  className={`absolute top-3 right-11 p-1.5 rounded-lg transition-colors z-10 ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Info className={`w-4 h-4 ${
                    showInfo === condition.id 
                      ? 'text-emerald-600' 
                      : 'text-gray-400'
                  }`} />
                </button>

                {/* Checkbox indicator - positioned at top-right */}
                <div className={`absolute top-4 right-4 w-5 h-5 rounded border-2 flex items-center justify-center transition-all pointer-events-none ${
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

                {/* Info dropdown */}
                {showInfo === condition.id && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    isDark ? 'bg-gray-700 border border-gray-600' : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className={`text-sm font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                      Dietary Considerations:
                    </div>
                    <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {condition.restrictions.map((restriction, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{restriction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* None option */}
        <button
          type="button"
          onClick={() => setFormData({ ...formData, healthConditions: [] })}
          className={`mt-3 px-4 py-2 rounded-lg text-sm transition-colors ${
            (formData.healthConditions || []).length === 0
              ? isDark
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'bg-emerald-100 text-emerald-700'
              : isDark
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✓ None of the above
        </button>
      </div>

      {/* Allergies & Intolerances */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className={`text-lg font-semibold flex items-center ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            Food Allergies & Intolerances
          </label>
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Critical for safety
          </span>
        </div>

        <div className={`p-4 rounded-xl mb-4 ${
          isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
              We'll exclude these ingredients completely and check for cross-contamination risks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALLERGENS.map((allergen) => {
            const isSelected = (formData.allergies || []).includes(allergen.id);
            
            return (
              <button
                key={allergen.id}
                type="button"
                onClick={() => handleAllergyToggle(allergen.id)}
                className={`relative p-3 pr-10 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                    : isDark
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`font-medium text-sm ${
                  isSelected
                    ? 'text-red-700 dark:text-red-400'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}>
                  {allergen.name}
                </div>
                <div className={`text-xs mt-1 ${
                  isSelected
                    ? 'text-red-600 dark:text-red-500'
                    : isDark
                    ? 'text-gray-500'
                    : 'text-gray-600'
                }`}>
                  {allergen.description}
                </div>

                {/* Checkbox indicator */}
                <div className={`absolute top-3 right-3 w-4 h-4 rounded border-2 flex items-center justify-center transition-all pointer-events-none ${
                  isSelected
                    ? 'bg-red-600 border-red-600'
                    : isDark
                    ? 'border-gray-600'
                    : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setFormData({ ...formData, allergies: [] })}
          className={`mt-3 px-4 py-2 rounded-lg text-sm transition-colors ${
            (formData.allergies || []).length === 0
              ? isDark
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'bg-emerald-100 text-emerald-700'
              : isDark
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✓ No allergies
        </button>
      </div>

      {/* Medications */}
      <div>
        <label className={`text-lg font-semibold flex items-center mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          <Pill className="w-5 h-5 mr-2 text-blue-500" />
          Current Medications
          <span className={`ml-2 text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            (Optional)
          </span>
        </label>

        <div className={`p-3 rounded-lg mb-3 text-sm ${
          isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'
        }`}>
          Some medications interact with certain foods. We'll provide warnings when needed.
        </div>

        <textarea
          value={formData.medications || ''}
          onChange={(e) => handleMedicationChange(e.target.value)}
          placeholder="e.g., Levothyroxine for thyroid, Metformin for diabetes..."
          rows="3"
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
            isDark
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-600'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-600'
          } focus:outline-none resize-none`}
        />
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          💡 This helps us avoid food-drug interactions (e.g., grapefruit with statins, vitamin K with warfarin)
        </p>
      </div>

      {/* Pregnancy Warning */}
      {formData.gender === 'female' && (
        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className={`font-semibold mb-1 ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                Pregnancy & Breastfeeding
              </div>
              <p className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>
                If you're pregnant or breastfeeding, please consult with your healthcare provider before starting any diet plan. Our system will provide extra precautions for nutrient needs.
              </p>
              <div className="mt-3 space-x-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPregnant || false}
                    onChange={(e) => setFormData({ ...formData, isPregnant: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className={`ml-2 text-sm ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                    Currently pregnant
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isBreastfeeding || false}
                    onChange={(e) => setFormData({ ...formData, isBreastfeeding: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className={`ml-2 text-sm ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                    Breastfeeding
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthConditions;