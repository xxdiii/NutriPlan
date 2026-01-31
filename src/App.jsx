import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MealPlanPage from './pages/MealPlanPage';
import ShoppingPage from './pages/ShoppingPage';
import ProgressPage from './pages/ProgressPage';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Check if user has completed onboarding
  useEffect(() => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile && currentPage === 'landing') {
      setCurrentPage('dashboard');
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage setCurrentPage={setCurrentPage} />;
      case 'onboarding':
        return <OnboardingPage setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return <DashboardPage setCurrentPage={setCurrentPage} />;
      case 'mealplan':
        return <MealPlanPage setCurrentPage={setCurrentPage} />;
      case 'shopping':
        return <ShoppingPage setCurrentPage={setCurrentPage} />;
      case 'progress':
        return <ProgressPage setCurrentPage={setCurrentPage} />;
      default:
        return <LandingPage setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <ThemeProvider>
      {renderPage()}
    </ThemeProvider>
  );
}

export default App;