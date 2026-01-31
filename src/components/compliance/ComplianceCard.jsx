import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getTodayCompliance, getWeeklyCompliance, calculateStreak } from '../../services/complianceService';

const ComplianceCard = ({ date, onUpdate }) => {
  const { isDark } = useTheme();
  const [todayCompliance, setTodayCompliance] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadComplianceData();
  }, [date]);

  const loadComplianceData = () => {
    const today = getTodayCompliance();
    const weekly = getWeeklyCompliance();
    const currentStreak = calculateStreak();
    
    setTodayCompliance(today);
    setWeeklyStats(weekly);
    setStreak(currentStreak);
  };

  useEffect(() => {
    loadComplianceData();
  }, [onUpdate, date]);

  if (!todayCompliance || !weeklyStats) {
    return null;
  }

  const todayMeals = todayCompliance.meals;
  const todayEaten = Object.values(todayMeals).filter(s => s === 'eaten').length;
  const todayTotal = Object.values(todayMeals).filter(s => s !== null).length;
  const todayComplianceRate = todayTotal > 0 ? Math.round((todayEaten / todayTotal) * 100) : 0;

  return (
    <div className={`p-6 rounded-2xl shadow-lg ${
      isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Meal Compliance
        </h3>
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
          isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
        }`}>
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-semibold">{streak} day streak</span>
        </div>
      </div>

      {/* Today's Compliance */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Today
          </span>
          <span className={`text-sm font-bold ${
            todayComplianceRate >= 75 
              ? 'text-emerald-600' 
              : todayComplianceRate >= 50 
              ? 'text-yellow-600' 
              : 'text-red-600'
          }`}>
            {todayComplianceRate}%
          </span>
        </div>
        <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              todayComplianceRate >= 75 
                ? 'bg-emerald-600' 
                : todayComplianceRate >= 50 
                ? 'bg-yellow-600' 
                : 'bg-red-600'
            }`}
            style={{ width: `${todayComplianceRate}%` }}
          />
        </div>
        <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {todayEaten} of {todayTotal} meals completed
        </div>
      </div>

      {/* Weekly Stats */}
      <div className={`p-3 rounded-xl ${
        isDark ? 'bg-gray-700/50' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium flex items-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <Calendar className="w-4 h-4 mr-1" />
            This Week
          </span>
          <span className={`text-sm font-bold ${
            weeklyStats.overallCompliance >= 75 
              ? 'text-emerald-600' 
              : weeklyStats.overallCompliance >= 50 
              ? 'text-yellow-600' 
              : 'text-red-600'
          }`}>
            {weeklyStats.overallCompliance}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className={`text-center p-2 rounded ${
            isDark ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <CheckCircle className="w-4 h-4 mx-auto mb-1" />
            <div className="font-bold">{weeklyStats.eatenMeals}</div>
            <div className={isDark ? 'text-emerald-500' : 'text-emerald-600'}>Eaten</div>
          </div>
          <div className={`text-center p-2 rounded ${
            isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'
          }`}>
            <XCircle className="w-4 h-4 mx-auto mb-1" />
            <div className="font-bold">{weeklyStats.skippedMeals}</div>
            <div className={isDark ? 'text-red-500' : 'text-red-600'}>Skipped</div>
          </div>
          <div className={`text-center p-2 rounded ${
            isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            <div className="font-bold">{weeklyStats.totalMeals}</div>
            <div>Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceCard;
