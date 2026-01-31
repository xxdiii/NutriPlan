import React from 'react';
import { Moon, Sun, Utensils } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

const OnboardingPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-emerald-50 to-teal-50'
    }`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setCurrentPage('landing')}
            className={`font-medium flex items-center space-x-2 ${
              isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span>NutriPlan</span>
          </button>
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              isDark 
                ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Build Your Personalized Plan
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Answer a few questions to get started on your nutrition journey
          </p>
        </div>

        {/* Wizard */}
        <OnboardingWizard />
      </div>
    </div>
  );
};

export default OnboardingPage;