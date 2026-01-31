import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ProgressBar = ({ currentStep, totalSteps, steps }) => {
  const { isDark } = useTheme();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? isDark
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/30'
                        : 'bg-emerald-600 text-white ring-4 ring-emerald-600/30'
                      : isDark
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <span
                  className={`text-xs mt-2 text-center hidden sm:block ${
                    isCurrent
                      ? isDark
                        ? 'text-emerald-400 font-semibold'
                        : 'text-emerald-700 font-semibold'
                      : isDark
                      ? 'text-gray-500'
                      : 'text-gray-600'
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600'
                      : isDark
                      ? 'bg-gray-700'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
};

export default ProgressBar;