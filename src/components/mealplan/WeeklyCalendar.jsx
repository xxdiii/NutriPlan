import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const WeeklyCalendar = ({ weekPlan, selectedDay, onDaySelect }) => {
  const { isDark } = useTheme();

  return (
    <div className={`p-6 rounded-2xl shadow-lg mb-6 ${
      isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Weekly Meal Plan
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button className={`p-2 rounded-lg ${
            isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}>
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
          </button>
          <button className={`p-2 rounded-lg ${
            isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}>
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekPlan.map((day, idx) => {
          const isSelected = selectedDay === idx;
          const isToday = idx === 0; // Simplification

          return (
            <button
              key={idx}
              onClick={() => onDaySelect(idx)}
              className={`p-3 rounded-xl transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg scale-105'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-xs font-medium mb-1">
                {day.day.slice(0, 3)}
              </div>
              <div className={`text-lg font-bold mb-1 ${
                isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {new Date(day.date).getDate()}
              </div>
              {isToday && !isSelected && (
                <div className={`w-1.5 h-1.5 rounded-full mx-auto ${
                  isDark ? 'bg-emerald-400' : 'bg-emerald-600'
                }`}></div>
              )}
              <div className={`text-xs mt-1 ${
                isSelected ? 'text-white/80' : isDark ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {day.totalCalories} cal
              </div>
            </button>
          );
        })}
      </div>

      {/* Daily Summary */}
      <div className={`mt-4 p-4 rounded-xl ${
        isDark ? 'bg-gray-700/50' : 'bg-gray-50'
      }`}>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Calories
            </div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {weekPlan[selectedDay]?.totalCalories || 0}
            </div>
          </div>
          <div>
            <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Protein
            </div>
            <div className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {weekPlan[selectedDay]?.totalProtein || 0}g
            </div>
          </div>
          <div>
            <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Carbs
            </div>
            <div className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              {weekPlan[selectedDay]?.totalCarbs || 0}g
            </div>
          </div>
          <div>
            <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Fat
            </div>
            <div className={`text-xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
              {weekPlan[selectedDay]?.totalFat || 0}g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendar;