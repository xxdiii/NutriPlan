import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, Utensils, CheckCircle2, TrendingUp, Flame, Droplets, Award } from 'lucide-react';

/* ─────────────────────────────────────────────────
   LOGIN PAGE
   Left panel: brand green with rich nutrition stats
   Right panel: form with ambient floating insight cards
   ───────────────────────────────────────────────── */

/* Stat pill shown on the left panel */
const StatPill = ({ emoji, label, value, delay = '0s' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    background: 'oklch(38% 0.12 152 / 0.5)',
    border: '1px solid oklch(55% 0.1 152 / 0.35)',
    borderRadius: '0.875rem',
    padding: '0.625rem 1rem',
    backdropFilter: 'blur(8px)',
    animation: `fade-up 0.6s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
  }}>
    <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'oklch(96% 0.012 152)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.68rem', color: 'oklch(78% 0.08 152)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  </div>
);

/* Floating insight card shown on the right panel */
const InsightCard = ({ icon: Icon, title, body, color, delay = '0s', top, right, left, bottom, rotate = '0deg' }) => (
  <div style={{
    position: 'absolute',
    top, right, left, bottom,
    background: 'oklch(100% 0.004 152)',
    border: '1px solid oklch(88% 0.018 152)',
    borderRadius: '1rem',
    padding: '0.875rem 1rem',
    boxShadow: '0 8px 24px oklch(18% 0.02 152 / 0.08)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    maxWidth: '200px',
    transform: `rotate(${rotate})`,
    animation: `fade-up 0.7s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
    zIndex: 2,
    pointerEvents: 'none',
    userSelect: 'none',
  }}>
    <div style={{ width: '2rem', height: '2rem', background: color + '22', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={14} color={color} strokeWidth={2.5} />
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: 'oklch(18% 0.02 152)', letterSpacing: '-0.01em', marginBottom: '0.15rem' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'oklch(52% 0.02 152)', lineHeight: 1.45 }}>{body}</div>
    </div>
  </div>
);

/* Dark mode floating card */
const InsightCardDark = ({ icon: Icon, title, body, color, delay = '0s', top, right, left, bottom, rotate = '0deg' }) => (
  <div style={{
    position: 'absolute',
    top, right, left, bottom,
    background: 'oklch(21% 0.026 152)',
    border: '1px solid oklch(28% 0.03 152)',
    borderRadius: '1rem',
    padding: '0.875rem 1rem',
    boxShadow: '0 8px 24px oklch(5% 0.01 152 / 0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    maxWidth: '200px',
    transform: `rotate(${rotate})`,
    animation: `fade-up 0.7s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
    zIndex: 2,
    pointerEvents: 'none',
    userSelect: 'none',
  }}>
    <div style={{ width: '2rem', height: '2rem', background: color + '33', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={14} color={color} strokeWidth={2.5} />
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: 'oklch(92% 0.012 152)', letterSpacing: '-0.01em', marginBottom: '0.15rem' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'oklch(58% 0.02 152)', lineHeight: 1.45 }}>{body}</div>
    </div>
  </div>
);

/* Circular macro arc for the left panel */
const MacroArc = ({ pct, color, r, cx = 60, cy = 60, strokeWidth = 7 }) => {
  const circ = 2 * Math.PI * r;
  return (
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
      style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.5s' }}
      transform={`rotate(-90 ${cx} ${cy})`} />
  );
};

const LoginPage = ({ setCurrentPage }) => {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const Card = isDark ? InsightCardDark : InsightCard;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setCurrentPage('dashboard');
      } else {
        setError(result.error || 'Invalid email or password');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
      background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)',
    }}>

      {/* ── LEFT PANEL: brand green with nutrition snapshot ─── */}
      <div style={{
        background: 'var(--color-brand)',
        padding: 'clamp(2rem, 5vw, 4rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '300px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, oklch(55% 0.1 152 / 0.25) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', position: 'relative', zIndex: 1 }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2.25rem', height: '2.25rem',
            background: 'oklch(38% 0.13 152)', borderRadius: '0.6rem',
            color: 'oklch(95% 0.012 152)',
          }}>
            <Utensils size={16} strokeWidth={2.5} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', color: 'oklch(95% 0.012 152)', letterSpacing: '-0.03em' }}>
            NutriPlan
          </span>
        </div>

        {/* Center: headline + macro ring */}
        <div style={{ position: 'relative', zIndex: 1, paddingTop: '2rem', paddingBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            lineHeight: 1.08, letterSpacing: '-0.04em',
            color: 'oklch(95% 0.012 152)',
            margin: '0 0 0.75rem 0', maxWidth: '14ch',
          }}>
            Welcome back.
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
            lineHeight: 1.65, color: 'oklch(82% 0.09 152)',
            margin: '0 0 2rem 0', maxWidth: '32ch',
          }}>
            Your meal plan is waiting. Let's pick up where you left off.
          </p>

          {/* Macro ring snapshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                {/* Tracks */}
                <circle cx="60" cy="60" r="50" fill="none" stroke="oklch(38% 0.12 152 / 0.4)" strokeWidth="7" />
                <circle cx="60" cy="60" r="38" fill="none" stroke="oklch(38% 0.12 152 / 0.4)" strokeWidth="6" />
                <circle cx="60" cy="60" r="26" fill="none" stroke="oklch(38% 0.12 152 / 0.4)" strokeWidth="5" />
                {/* Fills */}
                <MacroArc pct={0.78} color="oklch(82% 0.09 152)" r={50} strokeWidth={7} />
                <MacroArc pct={0.62} color="oklch(68% 0.15 52)"  r={38} strokeWidth={6} />
                <MacroArc pct={0.89} color="oklch(72% 0.1 250)"  r={26} strokeWidth={5} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'oklch(96% 0.012 152)', lineHeight: 1 }}>78%</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.58rem', color: 'oklch(78% 0.08 152)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>goal</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { dot: 'oklch(82% 0.09 152)', label: 'Protein', val: '94g' },
                { dot: 'oklch(68% 0.15 52)',  label: 'Carbs',   val: '210g' },
                { dot: 'oklch(72% 0.1 250)',  label: 'Fat',     val: '48g' },
              ].map(({ dot, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'oklch(78% 0.08 152)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, color: 'oklch(95% 0.012 152)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            <StatPill emoji="🔥" value="14-day" label="Streak" delay="0.3s" />
            <StatPill emoji="✅" value="94%" label="This week" delay="0.4s" />
            <StatPill emoji="🥗" value="1 470" label="kcal today" delay="0.5s" />
          </div>
        </div>

        {/* Floating food emojis (decorative) */}
        {[
          { e: '🥦', s: { position: 'absolute', top: '18%', right: '6%', fontSize: '2rem', animation: 'float 4s ease-in-out 0s infinite', opacity: 0.7 } },
          { e: '🍋', s: { position: 'absolute', top: '44%', right: '3%', fontSize: '1.6rem', animation: 'float 3.5s ease-in-out 0.8s infinite', opacity: 0.6 } },
          { e: '🫐', s: { position: 'absolute', bottom: '22%', right: '8%', fontSize: '1.8rem', animation: 'float 4.5s ease-in-out 0.4s infinite', opacity: 0.65 } },
        ].map(({ e, s }) => (
          <span key={e} aria-hidden="true" style={{ ...s, pointerEvents: 'none', userSelect: 'none' }}>{e}</span>
        ))}

        {/* Bottom compliance bar */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 600, color: 'oklch(82% 0.09 152)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Weekly compliance</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'oklch(96% 0.012 152)' }}>94%</span>
          </div>
          <div style={{ background: 'oklch(38% 0.12 152 / 0.45)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: '94%', height: '100%', background: 'oklch(82% 0.09 152)', borderRadius: '999px', transition: 'width 1.4s cubic-bezier(0.16,1,0.3,1) 0.6s' }} />
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: form + ambient floating cards ─────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(2rem, 6vw, 4rem)',
        position: 'relative',
        overflow: 'hidden',
        background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)',
      }}>
        {/* Ambient dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, ${isDark ? 'oklch(44% 0.14 152 / 0.08)' : 'oklch(44% 0.14 152 / 0.06)'} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />

        {/* Floating insight cards — top-left corner */}
        <Card
          icon={Flame}
          title="Calories on track"
          body="1,470 kcal logged — 87% of today's goal"
          color="oklch(58% 0.15 52)"
          delay="0.5s"
          top="6%" left="4%"
          rotate="-3deg"
        />

        {/* Top-right corner */}
        <Card
          icon={TrendingUp}
          title="Weight trend"
          body="Down 1.2 kg this month · Great progress!"
          color="oklch(50% 0.15 280)"
          delay="0.65s"
          top="8%" right="4%"
          rotate="2.5deg"
        />

        {/* Middle left */}
        <Card
          icon={Droplets}
          title="Hydration"
          body="6 of 8 glasses today · 2 more to go"
          color="oklch(52% 0.13 250)"
          delay="0.8s"
          top="42%" left="2%"
          rotate="-2deg"
        />

        {/* Bottom left */}
        <Card
          icon={Award}
          title="14-day streak! 🔥"
          body="You've logged every meal this fortnight"
          color="var(--color-brand)"
          delay="0.95s"
          bottom="10%" left="5%"
          rotate="2deg"
        />

        {/* Bottom right */}
        <Card
          icon={CheckCircle2}
          title="Palak Paneer logged"
          body="Dinner · 480 kcal · Iron rich ✓"
          color="var(--color-brand)"
          delay="1.1s"
          bottom="8%" right="3%"
          rotate="-2.5deg"
        />

        {/* Floating food emojis in right panel */}
        {[
          { e: '🌾', s: { position: 'absolute', top: '28%', right: '2%', fontSize: '1.75rem', animation: 'float 4.2s ease-in-out 0.2s infinite', opacity: isDark ? 0.3 : 0.45 } },
          { e: '🍎', s: { position: 'absolute', bottom: '32%', right: '1%', fontSize: '1.5rem', animation: 'float 3.8s ease-in-out 1s infinite', opacity: isDark ? 0.25 : 0.35 } },
          { e: '🥗', s: { position: 'absolute', top: '60%', left: '1%', fontSize: '1.6rem', animation: 'float 4.8s ease-in-out 0.6s infinite', opacity: isDark ? 0.2 : 0.3 } },
        ].map(({ e, s }) => (
          <span key={e} aria-hidden="true" style={{ ...s, pointerEvents: 'none', userSelect: 'none' }}>{e}</span>
        ))}

        {/* Form card */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: isDark ? 'oklch(18% 0.022 152)' : 'oklch(100% 0.004 152)',
          border: `1px solid ${isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'}`,
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: isDark
            ? '0 24px 48px oklch(5% 0.01 152 / 0.5)'
            : '0 24px 48px oklch(18% 0.02 152 / 0.1)',
          position: 'relative',
          zIndex: 3,
          animation: 'scale-in 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'var(--text-2xl)', letterSpacing: '-0.03em',
            color: isDark ? 'oklch(95% 0.012 152)' : 'oklch(18% 0.02 152)',
            margin: '0 0 0.375rem 0',
          }}>Sign in</h1>

          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: isDark ? 'oklch(52% 0.018 152)' : 'oklch(58% 0.02 152)',
            margin: '0 0 2rem 0',
          }}>
            Don't have an account?{' '}
            <button
              id="login-go-register"
              onClick={() => setCurrentPage('register')}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--color-brand)', fontWeight: 600,
                fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)',
                cursor: 'pointer', textDecoration: 'underline',
                textDecorationThickness: '1.5px', textUnderlineOffset: '3px',
              }}
            >
              Create one free
            </button>
          </p>

          {error && (
            <div role="alert" style={{
              padding: '0.75rem 1rem',
              background: isDark ? 'oklch(25% 0.04 22)' : 'oklch(96% 0.04 22)',
              border: `1px solid ${isDark ? 'oklch(35% 0.08 22)' : 'oklch(82% 0.09 22)'}`,
              borderRadius: 'var(--radius-md)',
              color: isDark ? 'oklch(75% 0.14 22)' : 'oklch(40% 0.16 22)',
              fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)',
              fontWeight: 500, marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                <label htmlFor="login-email" style={{
                  display: 'block', fontFamily: 'var(--font-ui)', fontWeight: 600,
                  fontSize: 'var(--text-sm)', color: isDark ? 'oklch(72% 0.02 152)' : 'oklch(42% 0.025 152)',
                  marginBottom: '0.4rem', letterSpacing: '0.01em',
                }}>Email address</label>
                <input
                  id="login-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field" placeholder="you@example.com"
                  autoComplete="email" required
                />
              </div>

              <div>
                <label htmlFor="login-password" style={{
                  display: 'block', fontFamily: 'var(--font-ui)', fontWeight: 600,
                  fontSize: 'var(--text-sm)', color: isDark ? 'oklch(72% 0.02 152)' : 'oklch(42% 0.025 152)',
                  marginBottom: '0.4rem', letterSpacing: '0.01em',
                }}>Password</label>
                <input
                  id="login-password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field" placeholder="••••••••"
                  autoComplete="current-password" required
                />
              </div>

              <button
                id="login-submit" type="submit" disabled={loading}
                className="btn btn--primary"
                style={{
                  width: '100%', marginTop: '0.25rem', padding: '0.75rem',
                  fontSize: 'var(--text-base)',
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>Sign in <ArrowRight size={16} strokeWidth={2.5} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
