import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import ProgressBar from './ProgressBar';
import BasicInfo from './steps/BasicInfo';
import HealthConditions from './steps/HealthConditions';
import Goals from './steps/Goals';
import DietaryPreferences from './steps/DietaryPreferences';
import BudgetRegion from './steps/BudgetRegion';
import ReviewSubmit from './steps/ReviewSubmit';

const OnboardingWizard = ({ onComplete }) => {
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    gender: '',
    age: '',
    height: '',
    weight: '',
    activityLevel: 1.2,
    // Health Conditions
    healthConditions: [],
    allergies: [],
    medications: '',
    isPregnant: false,
    isBreastfeeding: false,
    // Goals
    goal: '',
    targetWeight: '',
    targetRate: 0.5,
    // Dietary Preferences
    dietaryPreference: '',
    cuisines: [],
    dislikedFoods: '',
    cookingSkill: 'intermediate',
    // Budget & Region
    budget: 'medium',
    region: '',
    servings: 1,
    mealPrepPreference: 'daily',
  });

  const steps = ['Basic Info', 'Health', 'Goals', 'Diet', 'Budget', 'Review'];
  const totalSteps = steps.length;

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfo formData={formData} setFormData={setFormData} />;
      case 2:
        return <HealthConditions formData={formData} setFormData={setFormData} />;
      case 3:
        return <Goals formData={formData} setFormData={setFormData} />;
      case 4:
        return <DietaryPreferences formData={formData} setFormData={setFormData} />;
      case 5:
        return <BudgetRegion formData={formData} setFormData={setFormData} />;
      case 6:
        return <ReviewSubmit formData={formData} setCurrentStep={setCurrentStep} onComplete={onComplete} />;
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.gender && formData.age && formData.height && formData.weight && formData.activityLevel;
      case 2:
        return true; // Health conditions are optional
      case 3:
        if (!formData.goal) return false;
        if (formData.goal === 'maintain') return true;
        return formData.targetWeight && parseFloat(formData.targetWeight) > 0;
      case 4:
        return formData.dietaryPreference && (formData.cuisines || []).length > 0;
      case 5:
        return formData.budget && formData.region && formData.servings && formData.mealPrepPreference;
      case 6:
        return true; // Review page is always valid
      default:
        return true;
    }
  };

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} steps={steps} />

      <div className={`rounded-3xl shadow-2xl p-8 mb-8 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        {renderStep()}
      </div>

      {/* Hide navigation buttons on review page */}
      {currentStep !== 6 && (
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-200 ${currentStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-200 ${!isStepValid()
                ? 'opacity-50 cursor-not-allowed bg-gray-400'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:scale-105'
              }`}
          >
            <span>{currentStep === totalSteps ? 'Review' : 'Next'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;