import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, Zap, Leaf, Dumbbell, Heart, Flame, Scale, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { computeNutritionTargets } from '../../shared/targets';
import { generatePlan } from '../services/mealPlanService';
import { readSynced, writeSynced } from '../services/syncedStorage';

/** The profile as it would be with `plan` applied. */
const applyPlan = (profile, plan) => ({
  ...profile,
  goal: plan.goal || profile.goal,
  targetRate: plan.goal ? plan.targetRate ?? profile.targetRate : profile.targetRate,
  macroProfile: plan.macroProfile,
  dietaryPreference: plan.dietaryPreference || profile.dietaryPreference,
  budget: plan.budget || profile.budget,
});

/** Protein/carbs/fat as % of calories for this user under `plan`. */
const macroSplitFor = (profile, plan) => {
  const { targetCalories, macros } = computeNutritionTargets(applyPlan(profile, plan));
  if (!targetCalories) return null;
  const pct = (grams, kcalPerGram) => Math.round((grams * kcalPerGram / targetCalories) * 100);
  return { protein: pct(macros.protein, 4), carbs: pct(macros.carbs, 4), fat: pct(macros.fat, 9), kcal: targetCalories };
};

// ── Plan definitions ─────────────────────────────────────────────────────────
const PLAN_ARCHETYPES = [
  {
    id: 'balanced',
    name: 'Balanced Nutrition',
    tagline: 'Well-rounded for everyday health',
    icon: Heart,
    gradient: 'linear-gradient(135deg, oklch(58% 0.18 152), oklch(52% 0.16 200))',
    glowColor: 'oklch(58% 0.18 152)',
    // Fields saved to the profile when applied; null keeps the user's own choice.
    goal: 'maintain',
    macroProfile: 'balanced',
    dietaryPreference: null,
    features: ['Balanced macros', 'Varied meals', 'All food groups', 'Sustainable long-term'],
    bestFor: 'Maintenance & general wellness',
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss',
    tagline: 'Calorie deficit with high satiety',
    icon: Scale,
    gradient: 'linear-gradient(135deg, oklch(60% 0.18 30), oklch(58% 0.16 52))',
    glowColor: 'oklch(60% 0.18 30)',
    goal: 'cut',
    targetRate: 0.5,
    macroProfile: 'balanced',
    dietaryPreference: null,
    features: ['High protein', 'Calorie deficit', 'Fiber-rich foods', 'Appetite control'],
    bestFor: 'Losing weight at 0.5kg/week',
  },
  {
    id: 'muscle-gain',
    name: 'Muscle Gain',
    tagline: 'Optimised for hypertrophy',
    icon: Dumbbell,
    gradient: 'linear-gradient(135deg, oklch(52% 0.2 280), oklch(58% 0.18 260))',
    glowColor: 'oklch(52% 0.2 280)',
    goal: 'bulk',
    targetRate: 0.25,
    macroProfile: 'high_protein',
    dietaryPreference: null,
    features: ['High protein (2g/kg)', 'Calorie surplus', 'Pre/post workout meals', 'Muscle recovery foods'],
    bestFor: 'Building muscle with training',
  },
  {
    id: 'high-protein',
    name: 'High Protein',
    tagline: 'Maximum protein for lean physique',
    icon: Zap,
    gradient: 'linear-gradient(135deg, oklch(55% 0.18 310), oklch(52% 0.2 280))',
    glowColor: 'oklch(55% 0.18 310)',
    goal: null,
    macroProfile: 'high_protein',
    dietaryPreference: null,
    features: ['1.8-2 g protein per kg', 'Low glycaemic carbs', 'Lean proteins priority', 'Satiety focused'],
    bestFor: 'Body recomposition',
  },
  {
    id: 'vegan',
    name: 'Plant-Based Vegan',
    tagline: 'Completely animal-product free',
    icon: Leaf,
    gradient: 'linear-gradient(135deg, oklch(55% 0.2 145), oklch(58% 0.18 180))',
    glowColor: 'oklch(55% 0.2 145)',
    goal: null,
    macroProfile: 'balanced',
    dietaryPreference: 'vegan',
    features: ['100% plant-based', 'Legume-rich proteins', 'Ethical & sustainable', 'Rich in fibre & antioxidants'],
    bestFor: 'Vegan lifestyle & ethics',
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian',
    tagline: 'No meat, full nutrition',
    icon: Leaf,
    gradient: 'linear-gradient(135deg, oklch(62% 0.16 135), oklch(60% 0.18 160))',
    glowColor: 'oklch(62% 0.16 135)',
    goal: null,
    macroProfile: 'balanced',
    dietaryPreference: 'vegetarian',
    features: ['Dairy included', 'Plant-forward meals', 'High fibre', 'Heart healthy'],
    bestFor: 'Vegetarian preference',
  },
  {
    id: 'keto-low-carb',
    name: 'Low Carb',
    tagline: 'Reduced carbs, fat adaptation',
    icon: Flame,
    gradient: 'linear-gradient(135deg, oklch(58% 0.18 22), oklch(55% 0.18 40))',
    glowColor: 'oklch(58% 0.18 22)',
    goal: null,
    macroProfile: 'low_carb',
    dietaryPreference: null,
    features: ['Carbs capped at 25%', 'Fat as fuel', 'Blood sugar control', 'Reduced cravings'],
    bestFor: 'Metabolic health & fat loss',
  },
  {
    id: 'budget-friendly',
    name: 'Budget Friendly',
    tagline: 'Maximum nutrition, minimal cost',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, oklch(60% 0.16 200), oklch(58% 0.14 220))',
    glowColor: 'oklch(60% 0.16 200)',
    goal: null,
    macroProfile: 'balanced',
    budget: 'low',
    dietaryPreference: null,
    features: ['Meals around ₹100 a day', 'Dal, eggs and seasonal produce', 'Bulk-cooking friendly', 'No expensive ingredients'],
    bestFor: 'Students & budget-conscious',
  },
];

// ── Macro split bar ───────────────────────────────────────────────────────────
const MacroBar = ({ split }) => (
  <div style={{ display: 'flex', height: '6px', borderRadius: '999px', overflow: 'hidden', gap: '1px' }}>
    <div style={{ flex: split.protein, background: 'var(--color-brand)' }} title={`Protein ${split.protein}%`} />
    <div style={{ flex: split.carbs,   background: 'oklch(68% 0.15 52)' }}  title={`Carbs ${split.carbs}%`} />
    <div style={{ flex: split.fat,     background: 'oklch(60% 0.14 30)' }}  title={`Fat ${split.fat}%`} />
  </div>
);

// ── Plan Card ─────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, macroSplit, isActive, isApplying, onApply, isDark }) => {
  const { icon: Icon, name, tagline, gradient, glowColor, features, bestFor } = plan;
  const border = isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)';

  return (
    <div style={{
      background: isDark ? 'oklch(18% 0.022 152)' : '#fff',
      border: `1.5px solid ${isActive ? glowColor : border}`,
      borderRadius: '1.25rem',
      overflow: 'hidden',
      transition: 'all 220ms cubic-bezier(0.25,1,0.5,1)',
      boxShadow: isActive ? `0 0 0 3px ${glowColor}22, 0 8px 32px ${glowColor}22` : '0 2px 8px oklch(0% 0 0 / 0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 32px oklch(0% 0 0 / 0.12)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isActive ? `0 0 0 3px ${glowColor}22, 0 8px 32px ${glowColor}22` : '0 2px 8px oklch(0% 0 0 / 0.06)'; }}
    >
      {/* Card header gradient */}
      <div style={{ background: gradient, padding: '1.5rem', position: 'relative' }}>
        {isActive && (
          <div style={{ position: 'absolute', top: '0.875rem', right: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.625rem', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', borderRadius: '999px' }}>
            <CheckCircle2 size={12} color="#fff" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.68rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>ACTIVE</span>
          </div>
        )}
        <div style={{ width: '2.75rem', height: '2.75rem', background: 'rgba(255,255,255,0.22)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
          <Icon size={22} color="#fff" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#fff', margin: '0 0 0.25rem' }}>{name}</h3>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{tagline}</p>
      </div>

      {/* Card body */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Macro split, calculated for this user */}
        {macroSplit && <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>{macroSplit.kcal} kcal / day</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[['P', macroSplit.protein, 'var(--color-brand)'], ['C', macroSplit.carbs, 'oklch(68% 0.15 52)'], ['F', macroSplit.fat, 'oklch(60% 0.14 30)']].map(([l, v, c]) => (
                <span key={l} style={{ fontFamily: 'var(--font-ui)', fontSize: '0.68rem', fontWeight: 700, color: c }}>{l} {v}%</span>
              ))}
            </div>
          </div>
          <MacroBar split={macroSplit} />
        </div>}

        {/* Features */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {features.map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: glowColor, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* Best for */}
        <div style={{ padding: '0.5rem 0.75rem', background: isDark ? 'oklch(22% 0.025 152)' : 'oklch(97% 0.006 152)', borderRadius: '0.5rem', border: `1px solid ${border}` }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Best for: </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{bestFor}</span>
        </div>

        {/* Apply button */}
        <button
          onClick={() => onApply(plan)}
          disabled={isActive || isApplying}
          style={{
            marginTop: 'auto',
            padding: '0.7rem',
            borderRadius: '0.75rem',
            border: isActive ? `1.5px solid ${glowColor}` : 'none',
            background: isActive ? 'transparent' : gradient,
            color: isActive ? glowColor : '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: isActive || isApplying ? 'not-allowed' : 'pointer',
            opacity: isApplying && !isActive ? 0.7 : 1,
            transition: 'all 150ms',
            letterSpacing: '0.01em',
          }}>
          {isActive ? '✓ Currently Active' : isApplying ? 'Applying…' : 'Apply This Plan'}
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PlanLibraryPage = ({ setCurrentPage }) => {
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const load = async () => {
      let p = null;
      try { p = await api.getUserProfile(); } catch { /* fall back to the cached profile */ }
      if (!p) { const l = localStorage.getItem('userProfile'); if (l) p = JSON.parse(l); }
      setProfile(p);
      const saved = readSynced('activePlanId');
      if (saved) setActivePlanId(saved);
    };
    load();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApply = async (plan) => {
    if (!profile) return;
    setApplyingId(plan.id);
    try {
      // The server recalculates calorie and macro targets when the profile is saved.
      const updatedProfile = await api.saveUserProfile(applyPlan(profile, plan));
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);

      // Regenerate meal plan
      await generatePlan();
      writeSynced('activePlanId', plan.id);
      setActivePlanId(plan.id);

      showToast(`✅ "${plan.name}" applied! Your meal plan has been regenerated.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to apply plan. Please try again.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const textPrimary = isDark ? 'oklch(94% 0.012 152)' : 'oklch(18% 0.02 152)';

  return (
    <div style={{ minHeight: '100vh', background: isDark ? 'oklch(14% 0.018 152)' : 'oklch(98% 0.008 152)' }}>
      <div className="container-page" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em', color: textPrimary, margin: '0 0 0.3rem' }}>
            Diet Plan Library
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Choose a plan that matches your goal — your meal plan will be regenerated automatically
          </p>
        </div>

        {/* Active plan banner */}
        {activePlanId && (
          <div style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '0.875rem', background: 'var(--color-brand-muted)', border: '1.5px solid var(--color-brand)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={18} color="var(--color-brand)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-brand)' }}>
              Active: {PLAN_ARCHETYPES.find(p => p.id === activePlanId)?.name || 'Custom Plan'}
            </span>
            <button onClick={() => setCurrentPage('mealplan')} style={{ marginLeft: 'auto', padding: '0.3rem 0.75rem', borderRadius: '0.5rem', background: 'var(--color-brand)', color: '#fff', border: 'none', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              View Meal Plan →
            </button>
          </div>
        )}

        {/* Plan cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {PLAN_ARCHETYPES.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              macroSplit={profile?.weight ? macroSplitFor(profile, plan) : null}
              isActive={activePlanId === plan.id}
              isApplying={applyingId === plan.id}
              onApply={handleApply}
              isDark={isDark}
            />
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: '0.875rem', background: isDark ? 'oklch(18% 0.022 152)' : '#fff', border: `1px solid ${isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)'}`, display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Macro colours:</span>
          {[['Protein', 'var(--color-brand)'], ['Carbs', 'oklch(68% 0.15 52)'], ['Fat', 'oklch(60% 0.14 30)']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', padding: '0.875rem 1.5rem', borderRadius: '0.875rem', background: toast.type === 'error' ? 'oklch(42% 0.18 22)' : 'oklch(35% 0.12 152)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 8px 32px oklch(0% 0 0 / 0.25)', zIndex: 999, animation: 'slideUp 0.3s ease', maxWidth: '90vw', textAlign: 'center' }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
};

export default PlanLibraryPage;
