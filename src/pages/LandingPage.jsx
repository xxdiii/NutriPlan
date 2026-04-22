import React, { useEffect, useRef } from 'react';
import { Utensils, Activity, Heart, ShoppingCart, TrendingUp, Apple, Leaf, Target, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/* ─────────────────────────────────────────────────
   LANDING PAGE
   Aesthetic: Warm editorial — a trusted food writer's
   recommendation rather than a tech startup's pitch.
   Light mode. Asymmetric composition. Big type.
   ───────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Shield,
    title: 'Clinically aware',
    description: 'PCOS, thyroid, anaemia, allergies — your plan respects every condition, every interaction.',
    number: '01',
  },
  {
    icon: Target,
    title: 'Goal-precise macros',
    description: 'Bulk, cut, or maintain. Calorie targets that adapt as your weight moves.',
    number: '02',
  },
  {
    icon: Apple,
    title: 'Deeply regional',
    description: 'South Indian, Punjabi, Bengali, coastal — real recipes from real kitchens.',
    number: '03',
  },
  {
    icon: ShoppingCart,
    title: 'Smart grocery lists',
    description: 'Weekly lists, cost estimates, and store-order organisation.',
    number: '04',
  },
  {
    icon: Activity,
    title: 'Adaptive tracking',
    description: 'Log meals, watch compliance rise, and see macro charts move.',
    number: '05',
  },
  {
    icon: Leaf,
    title: 'Instant swaps',
    description: 'Hate a meal? Swap it in one tap. Nutritional equivalence guaranteed.',
    number: '06',
  },
];

const STATS = [
  { value: '15+', label: 'Health conditions' },
  { value: '1 000+', label: 'Regional recipes' },
  { value: '94%', label: 'Reported success' },
];

const STEPS = [
  { step: '1', title: 'Tell us about you', body: 'Share health conditions, lifestyle, food preferences, and budget. Takes 5 minutes.' },
  { step: '2', title: 'Receive your plan', body: 'A personalised weekly meal plan with recipes, shopping list, and macro targets.' },
  { step: '3', title: 'Track, adjust, thrive', body: 'Log meals, monitor weight, and watch your plan evolve with your progress.' },
];

/* ─────────────────────────────────────────────────
   HERO VISUAL — animated product preview panel
   Shows today's meal card + macro ring + floating
   food badges to communicate the app instantly
   ───────────────────────────────────────────────── */

const MacroRing = ({ pct, color, r = 36 }) => {
  const circ = 2 * Math.PI * r;
  return (
    <circle
      cx="44" cy="44" r={r}
      fill="none"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      strokeDasharray={circ}
      strokeDashoffset={circ * (1 - pct)}
      style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.6s' }}
      transform="rotate(-90 44 44)"
    />
  );
};

const MEALS = [
  { emoji: '🌅', label: 'Breakfast', name: 'Moong Dal Chilla', cal: 340, tag: 'High protein' },
  { emoji: '🍽️', label: 'Lunch',     name: 'Rajma Rice Bowl',  cal: 520, tag: 'Balanced' },
  { emoji: '🍎', label: 'Snack',     name: 'Roasted Makhana',  cal: 130, tag: 'Low calorie' },
  { emoji: '🌙', label: 'Dinner',    name: 'Palak Paneer + Roti', cal: 480, tag: 'Iron rich' },
];

const FLOAT_FOODS = [
  { emoji: '🥗', x: '78%', y: '12%', delay: '0s',    dur: '3.8s' },
  { emoji: '🫐', x: '90%', y: '42%', delay: '0.6s',  dur: '4.2s' },
  { emoji: '🥦', x: '72%', y: '72%', delay: '1.2s',  dur: '3.5s' },
  { emoji: '🍋', x: '60%', y: '90%', delay: '0.3s',  dur: '4.6s' },
  { emoji: '🌾', x: '95%', y: '68%', delay: '0.9s',  dur: '3.2s' },
];

const HeroVisual = ({ isDark }) => {
  const surf   = isDark ? 'oklch(18% 0.022 152)' : 'oklch(100% 0.004 152)';
  const surf2  = isDark ? 'oklch(21% 0.026 152)' : 'oklch(96.5% 0.012 152)';
  const border = isDark ? 'oklch(28% 0.03 152)'  : 'oklch(88% 0.018 152)';
  const textPrimary   = isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)';
  const textSecondary = isDark ? 'oklch(58% 0.02 152)'  : 'oklch(52% 0.02 152)';

  return (
    <div
      className="animate-fade-up delay-300"
      style={{ position: 'relative', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Floating food emoji badges */}
      {FLOAT_FOODS.map(({ emoji, x, y, delay, dur }) => (
        <span
          key={emoji}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: x, top: y,
            fontSize: '1.75rem',
            animation: `float ${dur} ease-in-out ${delay} infinite`,
            filter: 'drop-shadow(0 4px 12px oklch(14% 0.018 152 / 0.15))',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Main card: today's meals */}
      <div style={{
        background: surf,
        border: `1px solid ${border}`,
        borderRadius: '1.5rem',
        boxShadow: isDark
          ? '0 32px 64px oklch(5% 0.01 152 / 0.6), 0 8px 16px oklch(5% 0.01 152 / 0.3)'
          : '0 32px 64px oklch(18% 0.02 152 / 0.14), 0 8px 16px oklch(18% 0.02 152 / 0.06)',
        width: '100%',
        maxWidth: '360px',
        padding: '1.5rem',
        position: 'relative',
        zIndex: 2,
        animation: 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both',
      }}>

        {/* Card header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: textSecondary, marginBottom: '0.2rem' }}>
              Today's plan
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: textPrimary }}>
              Wednesday
            </div>
          </div>
          {/* Macro ring */}
          <div style={{ position: 'relative', width: '88px', height: '88px', flexShrink: 0 }}>
            <svg viewBox="0 0 88 88" width="88" height="88">
              {/* Track */}
              <circle cx="44" cy="44" r="36" fill="none" stroke={border} strokeWidth="6" />
              <circle cx="44" cy="44" r="28" fill="none" stroke={border} strokeWidth="5" />
              <circle cx="44" cy="44" r="20" fill="none" stroke={border} strokeWidth="4" />
              {/* Fills */}
              <MacroRing pct={0.72} color="var(--color-brand)" r={36} />
              <MacroRing pct={0.61} color="oklch(68% 0.15 52)"  r={28} />
              <MacroRing pct={0.84} color="oklch(52% 0.13 250)" r={20} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: textPrimary, lineHeight: 1 }}>72%</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6rem', color: textSecondary, letterSpacing: '0.04em' }}>GOAL</span>
            </div>
          </div>
        </div>

        {/* Macro legend */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { dot: 'var(--color-brand)', label: 'Protein',  val: '87g' },
            { dot: 'oklch(68% 0.15 52)', label: 'Carbs',   val: '198g' },
            { dot: 'oklch(52% 0.13 250)', label: 'Fat',    val: '44g' },
          ].map(({ dot, label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: textSecondary }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: textPrimary }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Meal rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {MEALS.map(({ emoji, label, name, cal, tag }, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                background: surf2,
                borderRadius: '0.75rem',
                animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${0.55 + i * 0.1}s both`,
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: textSecondary, marginBottom: '0.1rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.825rem', color: textPrimary, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.875rem', color: textPrimary }}>{cal}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.6rem', color: 'var(--color-brand)', fontWeight: 600, letterSpacing: '0.02em' }}>{tag}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Total calories bar */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-brand-muted)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand)' }}>Total today</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-brand)', letterSpacing: '-0.03em' }}>1 470 <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>kcal</span></span>
        </div>
      </div>

      {/* Floating streak chip */}
      <div style={{
        position: 'absolute',
        top: '8%',
        left: '-8%',
        background: surf,
        border: `1px solid ${border}`,
        borderRadius: '999px',
        padding: '0.5rem 0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 8px 24px oklch(18% 0.02 152 / 0.1)',
        animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.9s both',
        zIndex: 3,
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '1rem' }}>🔥</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.875rem', color: textPrimary, letterSpacing: '-0.02em' }}>14-day streak</span>
      </div>

      {/* Floating compliance chip */}
      <div style={{
        position: 'absolute',
        bottom: '6%',
        right: '-4%',
        background: 'var(--color-brand)',
        borderRadius: '999px',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        boxShadow: 'var(--shadow-brand)',
        animation: 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 1.1s both',
        zIndex: 3,
        whiteSpace: 'nowrap',
      }}>
        <CheckCircle2 size={13} color="oklch(90% 0.06 152)" strokeWidth={2.5} />
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: '0.8rem', color: 'oklch(95% 0.012 152)', letterSpacing: '0.01em' }}>94% compliant this week</span>
      </div>
    </div>
  );
};

const LandingPage = ({ setCurrentPage }) => {

  const { isDark, toggleTheme } = useTheme();
  const heroRef = useRef(null);

  // Parallax on hero text on scroll
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = window.scrollY;
      el.style.transform = `translateY(${y * 0.12}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        background: isDark
          ? 'oklch(14% 0.018 152)'
          : 'oklch(98% 0.008 152)',
        minHeight: '100vh',
        transition: 'background 400ms cubic-bezier(0.25,1,0.5,1)',
      }}
    >
      {/* ── NAVIGATION ──────────────────────────────── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'}`,
          background: isDark
            ? 'oklch(14% 0.018 152 / 0.85)'
            : 'oklch(98% 0.008 152 / 0.85)',
          transition: 'background 400ms',
        }}
      >
        <div className="container-page" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Logo */}
            <button
              onClick={() => setCurrentPage('landing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
              aria-label="NutriPlan home"
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
                <Utensils size={18} strokeWidth={2.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                  letterSpacing: '-0.03em',
                }}
              >
                NutriPlan
              </span>
            </button>

            {/* Nav actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                id="theme-toggle"
                style={{
                  background: isDark ? 'oklch(21% 0.026 152)' : 'oklch(93% 0.016 152)',
                  border: 'none',
                  borderRadius: '0.6rem',
                  padding: '0.5rem',
                  color: isDark ? 'var(--color-accent)' : 'var(--color-brand)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-base) var(--ease-out-quart)',
                  lineHeight: 0,
                }}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>

              <button
                onClick={() => setCurrentPage('login')}
                id="nav-login"
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? 'oklch(72% 0.02 152)' : 'oklch(42% 0.025 152)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'color var(--duration-fast)',
                }}
              >
                Sign in
              </button>

              <button
                onClick={() => setCurrentPage('register')}
                id="nav-get-started"
                className="btn btn--primary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 'clamp(3rem, 8vw, 6rem)',
          paddingBottom: 'clamp(3rem, 8vw, 6rem)',
        }}
      >
        {/* Background dot grid */}
        <div
          className="bg-dots"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isDark ? 0.6 : 1,
          }}
        />

        <div className="container-page" style={{ position: 'relative' }}>
          <div className="hero-grid">

            {/* ── LEFT: Copy ─────────────────────────── */}
            <div>
              {/* Eyebrow badge */}
              <div
                className="badge badge--brand animate-fade-up"
                style={{ marginBottom: '2rem' }}
              >
                <Shield size={11} />
                Clinically validated · Culturally grounded
              </div>

              {/* Headline */}
              <div ref={heroRef} style={{ willChange: 'transform' }}>
                <h1
                  className="animate-fade-up delay-75"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 'var(--text-display)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.04em',
                    color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                    maxWidth: '14ch',
                    margin: '0 0 1.5rem 0',
                  }}
                >
                  Eat well.<br />
                  <span style={{ color: 'var(--color-brand)' }}>Live well.</span><br />
                  Know why.
                </h1>
              </div>

              <p
                className="animate-fade-up delay-150"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-md)',
                  lineHeight: 1.7,
                  color: isDark ? 'oklch(72% 0.02 152)' : 'oklch(42% 0.025 152)',
                  maxWidth: '50ch',
                  margin: '0 0 2.5rem 0',
                }}
              >
                Personalised meal plans built around your health conditions, your culture, and your
                goals — not a one-size-fits-all algorithm.
              </p>

              <div
                className="animate-fade-up delay-225"
                style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
              >
                <button
                  id="hero-cta-start"
                  onClick={() => setCurrentPage('register')}
                  className="btn btn--primary btn--lg"
                  style={{ gap: '0.5rem' }}
                >
                  Start your journey
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
                <button
                  id="hero-cta-demo"
                  onClick={() => setCurrentPage('login')}
                  className="btn btn--secondary btn--lg"
                >
                  Sign in
                </button>
              </div>

              {/* Trust signals */}
              <div
                className="animate-fade-up delay-300"
                style={{
                  marginTop: '3rem',
                  display: 'flex',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {['No subscriptions', 'No ads', 'No junk'].map((label) => (
                  <span
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 'var(--text-sm)',
                      color: isDark ? 'oklch(62% 0.13 152)' : 'var(--color-brand)',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={15} strokeWidth={2.5} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Animated App Preview ────────── */}
            <HeroVisual isDark={isDark} />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────── */}
      <section
        style={{
          background: isDark ? 'oklch(18% 0.022 152)' : 'var(--color-brand)',
          padding: 'clamp(2.5rem, 5vw, 4rem) 0',
        }}
      >
        <div className="container-page">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '2rem',
              textAlign: 'center',
            }}
          >
            {STATS.map(({ value, label }, i) => (
              <div
                key={label}
                className={`animate-fade-up delay-${['75', '150', '225'][i]}`}
                style={{ padding: '0 1rem' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 'var(--text-4xl)',
                    lineHeight: 1,
                    color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(98% 0.005 152)',
                    letterSpacing: '-0.03em',
                    marginBottom: '0.25rem',
                  }}
                  className="tabular"
                >
                  {value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: isDark ? 'oklch(62% 0.13 152)' : 'oklch(82% 0.09 152)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem, 8vw, 7rem) 0' }}>
        <div className="container-page">
          {/* Section header — left-aligned, editorial */}
          <div style={{ marginBottom: '3.5rem', maxWidth: '32rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--color-brand)',
                marginBottom: '0.75rem',
              }}
            >
              Why NutriPlan
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'var(--text-display-sm)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                margin: 0,
              }}
            >
              Built for people, not averages
            </h2>
          </div>

          {/* Feature grid — numbered, editorial */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5px',
              background: isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}
          >
            {FEATURES.map(({ icon: Icon, title, description, number }) => (
              <div
                key={number}
                style={{
                  background: isDark ? 'oklch(18% 0.022 152)' : 'oklch(100% 0.004 152)',
                  padding: '2rem',
                  transition: 'background var(--duration-base) var(--ease-out-quart)',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? 'oklch(21% 0.026 152)'
                    : 'oklch(96.5% 0.012 152)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? 'oklch(18% 0.022 152)'
                    : 'oklch(100% 0.004 152)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      background: 'var(--color-brand-muted)',
                      borderRadius: '0.625rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-brand)',
                    }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '2.5rem',
                      color: isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {number}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    letterSpacing: '-0.02em',
                    color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.65,
                    color: isDark ? 'oklch(62% 0.02 152)' : 'oklch(42% 0.025 152)',
                    margin: 0,
                    maxWidth: '36ch',
                  }}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section
        style={{
          background: isDark ? 'oklch(18% 0.022 152)' : 'oklch(96.5% 0.012 152)',
          padding: 'clamp(4rem, 8vw, 7rem) 0',
        }}
      >
        <div className="container-page">
          <div style={{ marginBottom: '3.5rem', maxWidth: '32rem' }}>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--color-brand)',
                marginBottom: '0.75rem',
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'var(--text-display-sm)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                margin: 0,
              }}
            >
              Three steps to a better plate
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '2rem',
            }}
          >
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                style={{
                  position: 'relative',
                  paddingTop: '3.5rem',
                }}
              >
                {/* Step number — large & decorative */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '3.5rem',
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                    color: 'var(--color-brand)',
                    opacity: 0.25,
                  }}
                >
                  {step}
                </div>
                <div
                  style={{
                    width: '2rem',
                    height: '3px',
                    background: 'var(--color-brand)',
                    borderRadius: '2px',
                    marginBottom: '1rem',
                    opacity: 0.6,
                  }}
                />
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '-0.025em',
                    color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
                    margin: '0 0 0.75rem 0',
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-base)',
                    lineHeight: 1.7,
                    color: isDark ? 'oklch(62% 0.02 152)' : 'oklch(42% 0.025 152)',
                    margin: 0,
                    maxWidth: '36ch',
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: '4rem' }}>
            <button
              id="steps-cta"
              onClick={() => setCurrentPage('register')}
              className="btn btn--primary btn--lg"
            >
              Build my plan
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ── SYSTEM ARCHITECTURE ──────────────────────── */}
      <section style={{ padding: 'clamp(4rem, 8vw, 7rem) 0' }}>
        <div className="container-page">
          <div style={{ marginBottom: '3.5rem', maxWidth: '36rem' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-brand)', marginBottom: '0.75rem' }}>
              System Architecture
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-display-sm)', lineHeight: 1.1, letterSpacing: '-0.03em', color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)', margin: '0 0 0.75rem' }}>
              Built on a 4-layer AI architecture
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', lineHeight: 1.65, color: isDark ? 'oklch(62% 0.02 152)' : 'oklch(42% 0.025 152)', margin: 0 }}>
              Inspired by the research paper <em>"Smart Diet Planner: An AI-Powered Web Application for Personalized Nutrition Management"</em> (ICFT 2025), using the Mifflin-St Jeor equation for accurate BMR/TDEE calculation.
            </p>
          </div>

          {/* Architecture diagram */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '700px', margin: '0 auto' }}>
            {[
              {
                layer: '01',
                name: 'User Interface',
                tech: 'React.js',
                desc: 'Responsive web app — dietary type, allergies, goals, budget input. Displays plans, dashboards, and analytics.',
                color: 'var(--color-brand)',
                bg: isDark ? 'oklch(20% 0.04 152)' : 'oklch(93% 0.05 152)',
                items: ['Meal plan viewer', 'Compliance tracker', 'Hydration logger', 'AI Diet Assistant'],
              },
              {
                layer: '02',
                name: 'Backend Server',
                tech: 'Node.js + Express',
                desc: 'REST API with JWT authentication. Request validation, secure session management, and database communication.',
                color: 'oklch(55% 0.18 260)',
                bg: isDark ? 'oklch(19% 0.03 260)' : 'oklch(94% 0.04 260)',
                items: ['Auth & JWT tokens', 'Profile management', 'Compliance sync', 'Hydration API'],
              },
              {
                layer: '03',
                name: 'AI/ML Recommendation Engine',
                tech: 'Rule-based + Mifflin-St Jeor',
                desc: 'Calculates BMR and TDEE, selects nutritionally optimal meals, replaces allergens/dislikes with equivalent substitutes.',
                color: 'oklch(55% 0.2 30)',
                bg: isDark ? 'oklch(19% 0.04 30)' : 'oklch(95% 0.04 30)',
                items: ['BMR / TDEE calculation', 'Allergy-safe filtering', 'Adaptive dislike learning', 'Budget-aware selection'],
              },
              {
                layer: '04',
                name: 'Data & Analytics Module',
                tech: 'SQLite via Prisma ORM',
                desc: 'Secure persistent storage for user profiles, meal plans, compliance records, hydration, and weight logs with real-time sync.',
                color: 'oklch(52% 0.18 310)',
                bg: isDark ? 'oklch(19% 0.03 310)' : 'oklch(95% 0.03 310)',
                items: ['Daily / weekly analytics', 'Weight trend tracking', 'Nutrition Insights', 'Compliance reports'],
              },
            ].map(({ layer, name, tech, desc, color, bg, items }, i) => (
              <div key={layer} style={{ position: 'relative' }}>
                <div style={{
                  background: bg,
                  border: `1.5px solid ${color}30`,
                  borderRadius: '1rem',
                  padding: '1.75rem 2rem',
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'flex-start',
                  transition: 'transform 200ms, box-shadow 200ms',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.boxShadow = `0 4px 24px ${color}28`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Layer badge */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: '#fff' }}>{layer}</span>
                    </div>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.025em', color: isDark ? 'oklch(94% 0.012 152)' : 'oklch(18% 0.02 152)' }}>{name}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 700, color, background: `${color}18`, padding: '0.15rem 0.5rem', borderRadius: '999px', border: `1px solid ${color}40` }}>{tech}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', lineHeight: 1.6, color: isDark ? 'oklch(58% 0.018 152)' : 'oklch(45% 0.02 152)', margin: '0 0 0.75rem' }}>{desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {items.map(item => (
                        <span key={item} style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 500, color: isDark ? 'oklch(62% 0.018 152)' : 'oklch(42% 0.025 152)', background: isDark ? 'oklch(25% 0.025 152)' : 'oklch(90% 0.012 152)', padding: '0.2rem 0.6rem', borderRadius: '0.375rem' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Connector arrow */}
                {i < 3 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '0.4rem 0' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2v12M4 10l6 6 6-6" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer
        style={{
          background: isDark ? 'oklch(10% 0.015 152)' : 'oklch(18% 0.02 152)',
          padding: '3rem 0',
        }}
      >
        <div className="container-page">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  background: 'oklch(62% 0.13 152)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                }}
              >
                <Utensils size={14} strokeWidth={2.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'var(--text-md)',
                  color: 'oklch(95% 0.012 152)',
                  letterSpacing: '-0.03em',
                }}
              >
                NutriPlan
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'oklch(52% 0.018 152)',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                Not a substitute for medical advice. Consult your healthcare professional.
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--text-xs)',
                  color: 'oklch(40% 0.015 152)',
                  margin: 0,
                }}
              >
                © 2025 NutriPlan. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;