import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingBag,
  BarChart2,
  Settings,
  UtensilsCrossed,
  User,
  ChevronRight,
  Sparkles,
  LineChart,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'mealplan',      label: 'Meal Plan',    icon: CalendarDays    },
  { id: 'plan-library',  label: 'Plan Library', icon: BookOpen        },
  { id: 'insights',      label: 'Insights',     icon: LineChart       },
  { id: 'ai-assistant',  label: 'AI Coach',     icon: Sparkles        },
  { id: 'progress',      label: 'Progress',     icon: BarChart2       },
  { id: 'shopping',      label: 'Shop',         icon: ShoppingBag     },
  { id: 'recipes',       label: 'Recipes',      icon: UtensilsCrossed },
  { id: 'settings',      label: 'Settings',     icon: Settings        },
];

/* ─────────────────────────────────────────────────
   NAVIGATION LAYOUT
   Sidebar on desktop (collapsible), bottom bar on
   mobile. Uses design-system tokens throughout.
   ───────────────────────────────────────────────── */
const NavigationLayout = ({ children, currentPage, setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme();

  const handleNav = (pageId) => {
    setCurrentPage(pageId);
    window.scrollTo(0, 0);
  };

  const sidebarBg   = isDark ? 'oklch(18% 0.022 152)' : 'oklch(100% 0.004 152)';
  const sidebarBorder = isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)',
      }}
    >
      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <aside
        id="sidebar-nav"
        className="sidebar-desktop"
        style={{
          width: '4.5rem',
          flexShrink: 0,
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 30,
          background: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem 0.75rem',
          transition: 'width 280ms cubic-bezier(0.25,1,0.5,1)',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.width = '15rem'; }}
        onMouseLeave={(e) => { e.currentTarget.style.width = '4.5rem'; }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.5rem 1.5rem',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.25rem',
              height: '2.25rem',
              background: 'var(--color-brand)',
              borderRadius: '0.6rem',
              color: '#fff',
              flexShrink: 0,
              boxShadow: 'var(--shadow-brand)',
            }}
          >
            <UtensilsCrossed size={16} strokeWidth={2.5} />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
              letterSpacing: '-0.03em',
              opacity: 0,
              transition: 'opacity 200ms',
            }}
            className="sidebar-label"
          >
            NutriPlan
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => handleNav(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.6rem 0.625rem',
                  borderRadius: '0.625rem',
                  border: 'none',
                  background: isActive
                    ? (isDark ? 'oklch(22% 0.06 152)' : 'oklch(90% 0.06 152)')
                    : 'transparent',
                  color: isActive
                    ? 'var(--color-brand)'
                    : (isDark ? 'oklch(52% 0.018 152)' : 'oklch(52% 0.02 152)'),
                  cursor: 'pointer',
                  transition: 'all 180ms cubic-bezier(0.25,1,0.5,1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  minWidth: 0,
                  fontWeight: isActive ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = isDark
                      ? 'oklch(21% 0.026 152)'
                      : 'oklch(93% 0.016 152)';
                    e.currentTarget.style.color = isDark
                      ? 'oklch(72% 0.02 152)'
                      : 'oklch(42% 0.025 152)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = isDark
                      ? 'oklch(52% 0.018 152)'
                      : 'oklch(52% 0.02 152)';
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ flexShrink: 0 }}
                />
                <span
                  className="sidebar-label"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.9rem',
                    opacity: 0,
                    transition: 'opacity 200ms 60ms',
                  }}
                >
                  {label}
                </span>
                {isActive && (
                  <ChevronRight
                    size={14}
                    className="sidebar-label"
                    style={{
                      marginLeft: 'auto',
                      opacity: 0,
                      transition: 'opacity 200ms 60ms',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme & Profile section */}
        <div style={{ paddingTop: '0.75rem', borderTop: `1px solid ${sidebarBorder}`, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.6rem 0.625rem',
              borderRadius: '0.625rem',
              border: 'none',
              background: 'transparent',
              color: isDark ? 'oklch(52% 0.018 152)' : 'oklch(52% 0.02 152)',
              width: '100%',
              cursor: 'pointer',
              transition: 'background 180ms, color 180ms',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'oklch(21% 0.026 152)' : 'oklch(93% 0.016 152)';
                e.currentTarget.style.color = isDark ? 'oklch(72% 0.02 152)' : 'oklch(42% 0.025 152)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDark ? 'oklch(52% 0.018 152)' : 'oklch(52% 0.02 152)';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                flexShrink: 0,
              }}
            >
              {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
            </div>
            <span
              className="sidebar-label"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.9rem',
                fontWeight: 500,
                opacity: 0,
                transition: 'opacity 200ms 60ms',
              }}
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            id="nav-profile"
            onClick={() => handleNav('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.6rem 0.625rem',
              borderRadius: '0.625rem',
              border: 'none',
              background: currentPage === 'profile'
                ? (isDark ? 'oklch(22% 0.06 152)' : 'oklch(90% 0.06 152)')
                : 'transparent',
              width: '100%',
              cursor: 'pointer',
              transition: 'background 180ms',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'var(--color-brand)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <User size={14} strokeWidth={2.5} />
            </span>
            <div
              className="sidebar-label"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 0,
                opacity: 0,
                transition: 'opacity 200ms 60ms',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isDark ? 'oklch(92% 0.012 152)' : 'oklch(22% 0.02 152)',
                  letterSpacing: '-0.01em',
                }}
              >
                My Profile
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.75rem',
                  color: isDark ? 'oklch(52% 0.018 152)' : 'oklch(52% 0.02 152)',
                }}
              >
                View account
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main
        style={{ flex: 1, minWidth: 0, paddingBottom: '5rem', marginLeft: '4.5rem' }}
      >
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ────────────────────────── */}
      <div
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderTop: `1px solid ${sidebarBorder}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: isDark
            ? 'oklch(18% 0.022 152 / 0.92)'
            : 'oklch(100% 0.004 152 / 0.92)',
        }}
      >
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0.5rem 0.25rem',
            paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)',
          }}
        >
          {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[4], NAV_ITEMS[5], NAV_ITEMS[2]].map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                id={`mobile-nav-${id}`}
                onClick={() => handleNav(id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: '0.4rem 0.75rem',
                  border: 'none',
                  background: 'none',
                  color: isActive
                    ? 'var(--color-brand)'
                    : (isDark ? 'oklch(42% 0.018 152)' : 'oklch(58% 0.02 152)'),
                  cursor: 'pointer',
                  transition: 'color 150ms',
                  minWidth: '3rem',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.625rem',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── SIDEBAR HOVER STYLES (via injected CSS) ── */}
      <style>{`
        .sidebar-desktop {
          display: flex;
        }
        .mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .sidebar-desktop {
            display: none;
          }
          .mobile-bottom-nav {
            display: block;
          }
          main {
            margin-left: 0 !important;
          }
        }
        aside:hover .sidebar-label {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default NavigationLayout;
