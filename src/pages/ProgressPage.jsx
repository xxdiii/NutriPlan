import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Moon, Sun, User, ArrowLeft, TrendingUp, TrendingDown, Minus, Target, Calendar, Trash2 } from 'lucide-react';
import WeightChart from '../components/progress/WeightChart';
import WeightLogForm from '../components/progress/WeightLogForm';
import {
  calculateProgress,
  calculateWeeklyAverage,
  getWeightTrend,
  predictGoalDate,
  formatDate
} from '../utils/progressCalculations';
import { api } from '../services/api';

const ProgressPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load user profile from API first
        const profile = await api.getUserProfile();
        if (profile && Object.keys(profile).length > 0) {
          setUserProfile(profile);
        } else {
          // Fallback to localStorage
          const localProfile = localStorage.getItem('userProfile');
          if (localProfile) {
            setUserProfile(JSON.parse(localProfile));
          }
        }

        // Load weight logs from API
        try {
          const logs = await api.getWeightLogs();
          if (logs && logs.length > 0) {
            setWeightLogs(logs);
            // Cache in localStorage
            localStorage.setItem('weightLogs', JSON.stringify(logs));
          } else {
            // Fallback to localStorage if API returns empty
            const localLogs = localStorage.getItem('weightLogs');
            if (localLogs) {
              setWeightLogs(JSON.parse(localLogs));
            }
          }
        } catch (error) {
          console.error('Error loading weight logs from API:', error);
          // Fallback to localStorage
          const localLogs = localStorage.getItem('weightLogs');
          if (localLogs) {
            setWeightLogs(JSON.parse(localLogs));
          }
        }
      } catch (error) {
        console.error('Error loading progress data:', error);
        // Try localStorage as fallback
        const localProfile = localStorage.getItem('userProfile');
        if (localProfile) {
          setUserProfile(JSON.parse(localProfile));
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddLog = async (log) => {
    try {
      // Save to API
      const savedLog = await api.addWeightLog(log);

      // Update local state with the saved log (includes ID from database)
      const updatedLogs = [...weightLogs, savedLog].sort((a, b) => new Date(a.date) - new Date(b.date));
      setWeightLogs(updatedLogs);

      // Cache in localStorage
      localStorage.setItem('weightLogs', JSON.stringify(updatedLogs));

      // Update current weight in user profile
      const updatedProfile = { ...userProfile, weight: log.weight };
      setUserProfile(updatedProfile);
      await api.saveUserProfile(updatedProfile);
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error adding weight log:', error);
      alert('Failed to save weight log. Please try again.');
    }
  };

  const handleDeleteLog = async (logId, logDate) => {
    if (!window.confirm('Are you sure you want to delete this weight log?')) {
      return;
    }

    try {
      // If log has an ID, delete from API
      if (logId) {
        await api.deleteWeightLog(logId);
      }

      // Update local state - filter by ID if available, otherwise by date
      const updatedLogs = logId
        ? weightLogs.filter(log => log.id !== logId)
        : weightLogs.filter(log => new Date(log.date).toISOString() !== new Date(logDate).toISOString());

      setWeightLogs(updatedLogs);

      // Update localStorage cache
      localStorage.setItem('weightLogs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Error deleting weight log:', error);
      alert('Failed to delete weight log. Please try again.');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Loading your progress...
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no profile
  if (!userProfile) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center max-w-md p-8">
          <TrendingUp className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No Profile Found
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Please complete your profile to track progress.
          </p>
          <button
            onClick={() => setCurrentPage('onboarding')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Complete Profile
          </button>
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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
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
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDark
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
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
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
            <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
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
          <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
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
            <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
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
            <div className={`p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
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
              <div className={`mt-6 p-6 rounded-2xl shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                }`}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Recent Logs
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...weightLogs].reverse().slice(0, 10).map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {log.weight} kg
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(log.date)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id, log.date)}
                          className={`p-2 rounded-lg transition-colors ${isDark
                            ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                            : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                            }`}
                          title="Delete log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <div className={`mt-6 p-6 rounded-2xl ${isDark
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