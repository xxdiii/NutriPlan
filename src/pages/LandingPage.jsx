import React from 'react';
import { Utensils, Activity, Heart, ShoppingCart, TrendingUp, Apple, Leaf, Target, Shield, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LandingPage = ({ setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50'
    }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-emerald-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                NutriPlan
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCurrentPage('onboarding')}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
            isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Clinically Validated & Personalized</span>
          </div>
          
          <h1 className={`text-6xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Your Personal
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Nutrition Guide
            </span>
          </h1>
          
          <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Get personalized meal plans that respect your health conditions, cultural preferences, and fitness goals. Safe, smart, and delicious.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setCurrentPage('onboarding')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Start Your Journey</span>
              <TrendingUp className="w-5 h-5" />
            </button>
            <button className={`px-8 py-4 border-2 rounded-xl font-semibold text-lg transition-all duration-200 ${
              isDark 
                ? 'bg-gray-800 border-gray-700 text-emerald-400 hover:bg-gray-700' 
                : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}>
              See How It Works
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            { icon: Heart, label: 'Health Conditions Supported', value: '15+' },
            { icon: Utensils, label: 'Regional Recipes', value: '1000+' },
            { icon: Target, label: 'Success Rate', value: '94%' }
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}>
              <stat.icon className="w-12 h-12 text-emerald-600 mb-4" />
              <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
              <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className={`py-20 transition-colors duration-300 ${isDark ? 'bg-gray-800/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Everything You Need for Success
            </h2>
            <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Powered by clinical research and personalized to you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Clinical Safety First',
                description: 'Respects PCOS, thyroid, anemia, allergies, and medication interactions',
                color: 'from-red-500 to-pink-500'
              },
              {
                icon: Target,
                title: 'Goal-Driven Plans',
                description: 'Bulk, cut, or maintain with precise macro and calorie targets',
                color: 'from-emerald-500 to-teal-500'
              },
              {
                icon: Apple,
                title: 'Cultural Preferences',
                description: 'Indian, regional, and international recipes that match your taste',
                color: 'from-orange-500 to-amber-500'
              },
              {
                icon: ShoppingCart,
                title: 'Smart Shopping Lists',
                description: 'Weekly grocery lists with cost estimates and store organization',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Activity,
                title: 'Progress Tracking',
                description: 'Monitor weight, compliance, and nutritional improvements over time',
                color: 'from-purple-500 to-indigo-500'
              },
              {
                icon: Leaf,
                title: 'Flexible Swapping',
                description: 'Don\'t like a meal? Swap it instantly with similar alternatives',
                color: 'from-green-500 to-emerald-500'
              }
            ].map((feature, idx) => (
              <div key={idx} className={`rounded-2xl p-8 hover:shadow-xl transition-all duration-300 border ${
                isDark 
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' 
                  : 'bg-gradient-to-br from-gray-50 to-white border-gray-100'
              }`}>
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Get Started in 3 Simple Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Complete Your Profile', description: 'Share your health conditions, goals, preferences, and budget' },
            { step: '02', title: 'Get Your Plan', description: 'Receive a personalized weekly meal plan with recipes and shopping list' },
            { step: '03', title: 'Track Progress', description: 'Log meals, monitor weight, and adjust as you achieve your goals' }
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className={`text-6xl font-bold mb-4 ${isDark ? 'text-emerald-900/50' : 'text-emerald-100'}`}>{item.step}</div>
              <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{item.description}</p>
              {idx < 2 && (
                <div className={`hidden md:block absolute top-12 -right-4 w-8 h-0.5 ${isDark ? 'bg-emerald-800' : 'bg-emerald-200'}`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <button
            onClick={() => setCurrentPage('onboarding')}
            className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            Start Building Your Plan
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-12 transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Utensils className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold text-white">NutriPlan</span>
          </div>
          <p className="text-gray-400 mb-4">
            Personalized nutrition made simple, safe, and effective
          </p>
          <p className="text-sm text-gray-500">
            ⚠️ Not a substitute for medical advice. Always consult healthcare professionals.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;