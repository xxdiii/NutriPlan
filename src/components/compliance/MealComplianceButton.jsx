import React, { useState, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { markMealCompliance, getComplianceForDate } from '../../services/complianceService';

const MealComplianceButton = ({ date, mealType, mealName, onUpdate }) => {
  const { isDark } = useTheme();
  const [status, setStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const compliance = getComplianceForDate(date);
    setStatus(compliance.meals[mealType]);
  }, [date, mealType]);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      markMealCompliance(date, mealType, newStatus);
      setStatus(newStatus);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating compliance:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getButtonClass = (buttonStatus) => {
    const baseClass = `px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
      isUpdating ? 'opacity-50 cursor-not-allowed' : ''
    }`;
    
    if (status === buttonStatus) {
      if (buttonStatus === 'eaten') {
        return `${baseClass} bg-emerald-600 text-white`;
      } else if (buttonStatus === 'skipped') {
        return `${baseClass} bg-red-600 text-white`;
      }
    }
    
    return `${baseClass} ${
      isDark 
        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {mealName}
      </span>
      <div className="flex items-center space-x-1">
        <button
          onClick={() => handleStatusChange('eaten')}
          disabled={isUpdating}
          className={getButtonClass('eaten')}
          title="Mark as eaten"
        >
          <Check className="w-3 h-3" />
          <span>Eaten</span>
        </button>
        <button
          onClick={() => handleStatusChange('skipped')}
          disabled={isUpdating}
          className={getButtonClass('skipped')}
          title="Mark as skipped"
        >
          <X className="w-3 h-3" />
          <span>Skipped</span>
        </button>
        {status && (
          <button
            onClick={() => handleStatusChange(null)}
            disabled={isUpdating}
            className={`px-2 py-1 rounded text-xs ${
              isDark 
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title="Clear status"
          >
            <Clock className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MealComplianceButton;
