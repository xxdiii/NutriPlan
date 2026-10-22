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
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NavigationLayout from './components/layout/NavigationLayout';
import AIDietAssistantPage from './pages/AIDietAssistantPage';
import NutritionInsightsPage from './pages/NutritionInsightsPage';
import PlanLibraryPage from './pages/PlanLibraryPage';

const AUTH_PAGES = ['login', 'register', 'forgot-password'];

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
    const protectedRoutes = ['dashboard', 'onboarding', 'mealplan', 'shopping', 'progress', 'settings', 'profile', 'recipes', 'ai-assistant', 'insights', 'plan-library'];

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
    // Signed-in users have no use for the sign-in pages
    if (!loading && user && AUTH_PAGES.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [user, loading, currentPage]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-canvas)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ animation: 'spin-slow 0.8s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}>Loading…</span>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    // Public Routes
    if (currentPage === 'landing') return <LandingPage setCurrentPage={setCurrentPage} />;
    // Signed-in users on these pages get the dashboard (with navigation) below until the redirect lands
    if (currentPage === 'login' && !user) return <LoginPage setCurrentPage={setCurrentPage} />;
    if (currentPage === 'register' && !user) return <RegisterPage setCurrentPage={setCurrentPage} />;
    if (currentPage === 'verify-email') return <EmailVerificationPage setCurrentPage={setCurrentPage} />;
    if (currentPage === 'forgot-password' && !user) return <ForgotPasswordPage setCurrentPage={setCurrentPage} />;

    // Protected Routes
    if (!user) {
      // Redirect to login if trying to access protected route
      // setTimeout to avoid render loop warning if immediate state change is issue, 
      // but here we just return Login page directly essentially acting as a redirect
      return <LoginPage setCurrentPage={setCurrentPage} />;
    }

    // Wrap all protected routes in NavigationLayout
    const LayoutWrapper = ({ children }) => (
      <NavigationLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {children}
      </NavigationLayout>
    );

    switch (currentPage) {
      case 'onboarding':
        return <OnboardingPage setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return <LayoutWrapper><DashboardPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'mealplan':
        return <LayoutWrapper><MealPlanPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'shopping':
        return <LayoutWrapper><ShoppingPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'progress':
        return <LayoutWrapper><ProgressPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'settings':
        return <LayoutWrapper><SettingsPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'profile':
        return <LayoutWrapper><ProfilePage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'recipes':
        return <LayoutWrapper><RecipePage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'ai-assistant':
        return <LayoutWrapper><AIDietAssistantPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'insights':
        return <LayoutWrapper><NutritionInsightsPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      case 'plan-library':
        return <LayoutWrapper><PlanLibraryPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
      default:
        return <LayoutWrapper><DashboardPage setCurrentPage={setCurrentPage} /></LayoutWrapper>;
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