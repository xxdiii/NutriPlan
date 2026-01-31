import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, ArrowLeft, TrendingUp, TrendingDown, Minus, Target, Calendar } from 'lucide-react';
import WeightChart from '../components/progress/WeightChart';
import WeightLogForm from '../components/progress/WeightLogForm';
import { 
  calculateProgress, 
  calculateWeeklyAverage, 
  getWeightTrend, 
  predictGoalDate,
  formatDate 
} from '../utils/progressCalculations';

const ProgressPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);

  useEffect(() => {
    // Load user profile
    const profile = localStorage.getItem('userProfile');
    if (profile) {
      setUserProfile(JSON.parse(profile));
    }

    // Load weight logs
    const logs = localStorage.getItem('weightLogs');
    if (logs) {
      setWeightLogs(JSON.parse(logs));
    }
  }, []);

  const handleAddLog = (log) => {
    const updatedLogs = [...weightLogs, log].sort((a, b) => new Date(a.date) - new Date(b.date));
    setWeightLogs(updatedLogs);
    localStorage.setItem('weightLogs', JSON.stringify(updatedLogs));

    // Update current weight in user profile
    const updatedProfile = { ...userProfile, weight: log.weight };
    setUserProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
  };

  if (!userProfile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const currentWeight = weightLogs.length > 0 
    ? weightLogs[weightLogs.length - 1].weight 
    : userProfile.weight;

  const startWeight = weightLogs.length > 0 
    ? weightLogs[0].weight 
    : userProfile.weight;

  const progress = calculateProgress(currentWeight, startWeight, userProfile.targetWeight);
  const weeklyAvg = calculateWeeklyAverage(weightLogs);
  const trend = getWeightTrend(weightLogs);
  const predictedDate = predictGoalDate(currentWeight, userProfile.targetWeight, weightLogs);

  const getTrendIcon = () => {
    if (trend === 'gaining') return <TrendingUp className="w-5 h-5" />;
    if (trend === 'losing') return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getTrendColor = () => {
    if (userProfile.goal === 'bulk' && trend === 'gaining') return 'text-green-600';
    if (userProfile.goal === 'cut' && trend === 'losing') return 'text-green-600';
    if (trend === 'maintaining') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  NutriPlan
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Progress Tracking
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Monitor your weight and track your journey to your goal
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Weight */}
          <div className={`p-6 rounded-2xl shadow-lg ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Current Weight
            </div>
            <div className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {currentWeight} kg
            </div>
            {userProfile.goal !== 'maintain' && (
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                Goal: {userProfile.targetWeight} kg
              </div>
            )}
          </div>

          {/* Progress */}
          {userProfile.goal !== 'maintain' && (
            <div className={`p-6 rounded-2xl shadow-lg ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <div className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Progress to Goal
              </div>
              <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {progress}%
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Weekly Average */}
          <div className={`p-6 rounded-2xl shadow-lg ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Weekly Average
            </div>
            <div className={`text-3xl font-bold mb-1 flex items-center ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-2">{Math.abs(weeklyAvg)} kg</span>
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              per week
            </div>
          </div>

          {/* Predicted Goal Date */}
          {userProfile.goal !== 'maintain' && predictedDate && (
            <div className={`p-6 rounded-2xl shadow-lg ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <div className={`text-sm mb-2 flex items-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Calendar className="w-4 h-4 mr-1" />
                Predicted Goal Date
              </div>
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(predictedDate)}
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                Based on current trend
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <div className={`p-6 rounded-2xl shadow-lg ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Weight Progress
              </h2>
              <WeightChart 
                weightLogs={weightLogs}
                targetWeight={userProfile.goal !== 'maintain' ? userProfile.targetWeight : null}
              />
            </div>

            {/* Recent Logs */}
            {weightLogs.length > 0 && (
              <div className={`mt-6 p-6 rounded-2xl shadow-lg ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Recent Logs
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...weightLogs].reverse().slice(0, 10).map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl ${
                        isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {log.weight} kg
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(log.date)}
                        </div>
                      </div>
                      {log.notes && (
                        <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          {log.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Log Form */}
          <div>
            <WeightLogForm onAddLog={handleAddLog} />

            {/* Goal Info */}
            {userProfile.goal !== 'maintain' && (
              <div className={`mt-6 p-6 rounded-2xl ${
                isDark 
                  ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-800' 
                  : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <Target className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                      Your Goal
                    </h3>
                    <p className={`text-sm mb-2 ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>
                      {userProfile.goal === 'cut' ? 'Lose weight' : 'Gain muscle'} at {userProfile.targetRate} kg/week
                    </p>
                    <div className={`text-xs ${isDark ? 'text-purple-500' : 'text-purple-700'}`}>
                      Target: {userProfile.targetWeight} kg ({Math.abs(currentWeight - userProfile.targetWeight).toFixed(1)} kg to go)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;