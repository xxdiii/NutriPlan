import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Droplets, Flame, Award, CheckCircle2, BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import { getComplianceStats, getWeeklyMealBreakdown, getStorageKey as getComplianceStorageKey } from '../services/complianceService';
import { loadPlan } from '../services/mealPlanService';
import ComplianceHeatmap from '../components/compliance/ComplianceHeatmap';

// ── SVG Donut Chart ────────────────────────────────────────────────────────
const DonutChart = ({ value, max, color, label, unit = 'g', size = 100 }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const { isDark } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size}>
          <circle cx="40" cy="40" r={r} fill="none" stroke={isDark ? 'oklch(28% 0.03 152)' : 'oklch(90% 0.018 152)'} strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
            transform="rotate(-90 40 40)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{value}{unit}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>of {max}{unit}</div>
      </div>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, isDark }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: color + (isDark ? '22' : '18'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.04em', color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  </div>
);

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  const bg = isDark ? 'oklch(22% 0.025 152)' : '#fff';
  const border = isDark ? 'oklch(32% 0.03 152)' : 'oklch(88% 0.018 152)';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '0.75rem', padding: '0.75rem 1rem', boxShadow: '0 4px 16px oklch(0% 0 0 / 0.12)' }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const NutritionInsightsPage = () => {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [hydrationData, setHydrationData] = useState([]);
  const [tab, setTab] = useState('weekly');
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [complianceStats, setComplianceStats] = useState(null);
  const [mealBreakdown, setMealBreakdown] = useState({ breakfast: 0, lunch: 0, snack: 0, dinner: 0 });
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const load = async () => {
      // Load profile
      let p = null;
      try { p = await api.getUserProfile(); } catch (_) {}
      if (!p) { const l = localStorage.getItem('userProfile'); if (l) p = JSON.parse(l); }
      setProfile(p);

      // Load meal plan
      const plan = await loadPlan();
      setMealPlan(plan);

      // Build 7-day trend from compliance + mealplan
      const today = new Date();
      const days = [];
      const start = new Date(today); start.setDate(today.getDate() - 6);
      const compStats = getComplianceStats(start, today);
      setComplianceStats(compStats);
      setMealBreakdown(getWeeklyMealBreakdown());

      // Hydration for last 7 days
      const hydArr = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const ds = `${yyyy}-${mm}-${dd}`;
        
        try {
          const h = await api.getHydration(ds);
          let amt = h?.amount || 0;
          const cached = localStorage.getItem(`hydration_${ds}`);
          const cachedAmt = cached ? Number(cached) : 0;
          amt = Math.max(amt, cachedAmt);
          
          hydArr.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), amount: amt });
        } catch (_) {
          const cached = localStorage.getItem(`hydration_${ds}`);
          hydArr.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), amount: cached ? Number(cached) : 0 });
        }
      }
      setHydrationData(hydArr);

      // Build calorie trend from meal plan + compliance
      const compData = JSON.parse(localStorage.getItem(getComplianceStorageKey()) || '{}');
      const planDays = plan?.plan || [];
      const target = p?.nutritionTargets?.targetCalories || 2000;
      const trendArr = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const ds = `${yyyy}-${mm}-${dd}`;
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayPlan = planDays.find(x => x.date === ds) || null;
        const compDay = compData[ds];
        let cals = 0, prot = 0, carbG = 0, fatG = 0;
        if (dayPlan && compDay) {
          ['breakfast', 'lunch', 'snack', 'dinner'].forEach(m => {
            if (compDay.meals?.[m] === 'eaten' && dayPlan[m]) {
              cals += dayPlan[m].calories || 0;
              prot += dayPlan[m].protein || 0;
              carbG += dayPlan[m].carbs || 0;
              fatG += dayPlan[m].fat || 0;
            }
          });
        }
        trendArr.push({ day: label, Calories: cals, Protein: prot, Carbs: carbG, Fat: fatG, Target: target });
      }
      setTrendData(trendArr);

      // Today consumed
      const todayY = today.getFullYear();
      const todayM = String(today.getMonth() + 1).padStart(2, '0');
      const todayD = String(today.getDate()).padStart(2, '0');
      const todayStr = `${todayY}-${todayM}-${todayD}`;
      const todayPlan = planDays.find(x => x.date === todayStr);
      const todayComp = compData[todayStr];
      let stats = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      if (todayPlan && todayComp) {
        ['breakfast', 'lunch', 'snack', 'dinner'].forEach(m => {
          if (todayComp.meals?.[m] === 'eaten' && todayPlan[m]) {
            stats.calories += todayPlan[m].calories || 0;
            stats.protein += todayPlan[m].protein || 0;
            stats.carbs += todayPlan[m].carbs || 0;
            stats.fat += todayPlan[m].fat || 0;
          }
        });
      }
      setConsumed(stats);
    };
    load();

    const handleHydrationUpdate = (e) => {
      const { date, amount } = e.detail;
      setHydrationData(prev => prev.map(d => {
        // d.date is 'Wed', so we need to match the actual date?
        // It's easier to just call load() again for consistency
        return d;
      }));
      // Just reload the data to be perfectly consistent
      load();
    };

    window.addEventListener('hydration-update', handleHydrationUpdate);
    return () => window.removeEventListener('hydration-update', handleHydrationUpdate);
  }, []);

  const border = isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)';
  const textPrimary = isDark ? 'oklch(94% 0.012 152)' : 'oklch(18% 0.02 152)';
  const targets = profile?.nutritionTargets;
  const activeHydrationDays = hydrationData.filter(d => d.amount > 0).length || 1;
  const avgHydration = hydrationData.length > 0 ? Math.round(hydrationData.reduce((s, d) => s + d.amount, 0) / activeHydrationDays) : 0;
  const todayHydration = hydrationData.length > 0 ? hydrationData[hydrationData.length - 1].amount : 0;
  const hydrationGoal = 2500; // Match dashboard goal of 2500ml
  const overallWeekly = Math.round((mealBreakdown.breakfast + mealBreakdown.lunch + mealBreakdown.snack + mealBreakdown.dinner) / 4);
  const streak = complianceStats?.overallCompliance ?? 0;

  const LINES = [
    { key: 'Calories', color: 'oklch(68% 0.15 52)', label: 'Calories' },
    { key: 'Protein',  color: 'var(--color-brand)',   label: 'Protein (g)' },
    { key: 'Carbs',    color: 'oklch(60% 0.18 260)',  label: 'Carbs (g)' },
    { key: 'Fat',      color: 'oklch(60% 0.14 30)',   label: 'Fat (g)' },
  ];

  const MEAL_COLORS = { breakfast: 'oklch(68% 0.15 52)', lunch: 'var(--color-brand)', snack: 'oklch(60% 0.18 260)', dinner: 'oklch(55% 0.14 310)' };

  return (
    <div style={{ minHeight: '100vh', background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)' }}>
      <div className="container-page" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em', color: textPrimary, margin: '0 0 0.3rem' }}>
            Nutrition Insights
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Your personalised health analytics dashboard
          </p>
        </div>

        {/* Top stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard icon={Flame}        label="Calories today"    value={consumed.calories}      sub={`of ${targets?.targetCalories || '—'} kcal`}  color="oklch(62% 0.18 52)"  isDark={isDark} />
          <StatCard icon={TrendingUp}   label="Weekly compliance" value={`${overallWeekly}%`}    sub="meal adherence"                                  color="var(--color-brand)"  isDark={isDark} />
          <StatCard icon={Droplets}     label="Hydration today"   value={`${todayHydration}ml`}  sub={`goal: ${hydrationGoal}ml/day`}                  color="oklch(58% 0.18 230)" isDark={isDark} />
          <StatCard icon={Award}        label="Meals eaten"       value={complianceStats?.eatenMeals ?? 0} sub="this week"                           color="oklch(55% 0.15 310)" isDark={isDark} />
        </div>

        {/* Macro donuts */}
        {targets && (
          <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: textPrimary, margin: '0 0 1.5rem' }}>
              Today's Macro Breakdown
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '1rem', textAlign: 'center' }}>
              <DonutChart value={consumed.calories} max={targets.targetCalories} color="oklch(68% 0.15 52)" label="Calories" unit="kcal" size={110} />
              <DonutChart value={consumed.protein}  max={targets.macros?.protein || 150} color="var(--color-brand)" label="Protein" size={110} />
              <DonutChart value={consumed.carbs}    max={targets.macros?.carbs || 200}   color="oklch(60% 0.18 260)" label="Carbs" size={110} />
              <DonutChart value={consumed.fat}      max={targets.macros?.fat || 65}      color="oklch(60% 0.14 30)" label="Fat" size={110} />
            </div>
            {/* Macro targets reminder */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Target Calories', val: `${targets.targetCalories} kcal`, color: 'oklch(68% 0.15 52)' },
                { label: 'Protein Target',  val: `${targets.macros?.protein}g`,    color: 'var(--color-brand)' },
                { label: 'Carbs Target',    val: `${targets.macros?.carbs}g`,      color: 'oklch(60% 0.18 260)' },
                { label: 'Fat Target',      val: `${targets.macros?.fat}g`,        color: 'oklch(60% 0.14 30)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ flex: 1, minWidth: '8rem', padding: '0.6rem 0.875rem', borderRadius: '0.625rem', background: isDark ? 'oklch(22% 0.025 152)' : 'oklch(97% 0.006 152)', border: `1px solid ${border}` }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trend chart */}
        <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: textPrimary, margin: 0 }}>
              Nutrition Trend
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['weekly', 'monthly'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.5rem', border: `1.5px solid ${tab === t ? 'var(--color-brand)' : border}`, background: tab === t ? 'var(--color-brand)' : 'transparent', color: tab === t ? '#fff' : 'var(--color-text-muted)', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '280px' }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'} />
                  <XAxis dataKey="day" stroke={isDark ? 'oklch(55% 0.018 152)' : 'oklch(52% 0.02 152)'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={isDark ? 'oklch(55% 0.018 152)' : 'oklch(52% 0.02 152)'} style={{ fontSize: '12px' }} />
                  <Tooltip content={<ChartTooltip isDark={isDark} />} />
                  <Legend />
                  {LINES.map(l => (
                    <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2.5} dot={{ r: 3, fill: l.color }} activeDot={{ r: 5 }} />
                  ))}
                  <Line type="monotone" dataKey="Target" stroke={isDark ? 'oklch(45% 0.018 152)' : 'oklch(65% 0.018 152)'} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Calorie Target" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <BarChart3 size={40} color={isDark ? 'oklch(38% 0.018 152)' : 'oklch(72% 0.018 152)'} style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Start logging meals to see your trend</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Heatmap */}
        <div style={{ marginBottom: '1.5rem' }}>
          <ComplianceHeatmap months={3} />
        </div>

        {/* Bottom row: meal compliance + hydration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Meal compliance breakdown */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: textPrimary, margin: '0 0 1.25rem' }}>
              Weekly Meal Compliance
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {['breakfast', 'lunch', 'snack', 'dinner'].map(meal => {
                const pct = mealBreakdown[meal] || 0;
                const color = MEAL_COLORS[meal];
                return (
                  <div key={meal}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{meal}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {pct >= 80 && <CheckCircle2 size={14} color={color} />}
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: '7px', background: isDark ? 'oklch(28% 0.03 152)' : 'oklch(90% 0.018 152)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'var(--color-brand-muted)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brand)' }}>Overall this week</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-brand)', letterSpacing: '-0.03em' }}>{overallWeekly}%</span>
              </div>
            </div>
          </div>

          {/* Hydration tracker */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: textPrimary, margin: '0 0 1.25rem' }}>
              7-Day Hydration
            </h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: '140px', marginBottom: '0.75rem' }}>
              {hydrationData.map((d, i) => {
                const pct = Math.min((d.amount / hydrationGoal) * 100, 100);
                const isGood = pct >= 80;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, borderRadius: '4px 4px 0 0', background: isGood ? 'oklch(58% 0.18 230)' : (isDark ? 'oklch(32% 0.028 152)' : 'oklch(84% 0.018 152)'), transition: 'height 1s cubic-bezier(0.16,1,0.3,1)' }} />
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>{d.date}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: isDark ? 'oklch(22% 0.025 152)' : 'oklch(94% 0.012 230)', borderRadius: '0.625rem', border: `1px solid ${isDark ? 'oklch(30% 0.03 152)' : 'oklch(82% 0.05 230)'}` }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>7-day average</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'oklch(52% 0.18 230)' }}>{avgHydration}ml / {hydrationGoal}ml</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NutritionInsightsPage;
