import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MealPlanPage from './pages/MealPlanPage';
import ShoppingPage from './pages/ShoppingPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import RecipePage from './pages/RecipePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Inner component to handle routing with auth access
const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Initialize state from URL path or localStorage fallback
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.slice(1) || 'landing';
    return path || localStorage.getItem('currentAppPage') || 'landing';
  });

  // Sync URL with page changes
  useEffect(() => {
    const path = currentPage === 'landing' ? '/' : `/${currentPage}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ page: currentPage }, '', path);
    }
    localStorage.setItem('currentAppPage', currentPage);
  }, [currentPage]);

  // Listen for browser back/forward button
  useEffect(() => {
    const handlePopState = (event) => {
      const path = window.location.pathname.slice(1) || 'landing';
      setCurrentPage(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirect logged-out users trying to access protected routes
  useEffect(() => {
    const protectedRoutes = ['dashboard', 'onboarding', 'mealplan', 'shopping', 'progress', 'settings', 'profile', 'recipes'];

    if (!loading && !user && protectedRoutes.includes(currentPage)) {
      setCurrentPage('landing');
      localStorage.removeItem('currentAppPage');
    }
  }, [user, loading, currentPage]);

  // Handle initial redirect logic
  useEffect(() => {
    const savedPage = localStorage.getItem('currentAppPage');
    if (user && currentPage === 'landing' && !savedPage) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const renderPage = () => {
    // Public Routes
    if (currentPage === 'landing') return <LandingPage setCurrentPage={setCurrentPage} />;
    if (currentPage === 'login') return user ? <DashboardPage setCurrentPage={setCurrentPage} /> : <LoginPage setCurrentPage={setCurrentPage} />;
    if (currentPage === 'register') return user ? <DashboardPage setCurrentPage={setCurrentPage} /> : <RegisterPage setCurrentPage={setCurrentPage} />;

    // Protected Routes
    if (!user) {
      // Redirect to login if trying to access protected route
      // setTimeout to avoid render loop warning if immediate state change is issue, 
      // but here we just return Login page directly essentially acting as a redirect
      return <LoginPage setCurrentPage={setCurrentPage} />;
    }

    switch (currentPage) {
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
      case 'settings':
        return <SettingsPage setCurrentPage={setCurrentPage} />;
      case 'profile':
        return <ProfilePage setCurrentPage={setCurrentPage} />;
      case 'recipes':
        return <RecipePage setCurrentPage={setCurrentPage} />;
      default:
        return <DashboardPage setCurrentPage={setCurrentPage} />;
    }
  };

  return renderPage();
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;