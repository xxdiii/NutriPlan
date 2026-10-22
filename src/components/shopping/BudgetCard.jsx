import React, { useState } from 'react';
import { Wallet, Check, CircleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { generatePlan } from '../../services/mealPlanService';

const label = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' };
const body = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' };
const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * This week's food cost against the user's budget, with the budget and price tier
 * settings and a way to rebuild the plan to fit.
 * @param budget    budgetSummary from the shopping-list response
 * @param cost      list.cost (whole-pack shop total and food used)
 * @param onUpdated called after the profile or plan changed
 */
const BudgetCard = ({ budget, cost, priceTier, profile, onUpdated }) => {
  const [weekly, setWeekly] = useState(profile?.weeklyBudget ? String(profile.weeklyBudget) : '');
  const [tier, setTier] = useState(priceTier || 'metro');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!budget) return null;
  const over = budget.planCost - budget.weeklyBudget;
  const changed = (weekly || '') !== String(profile?.weeklyBudget || '') || tier !== (profile?.priceTier || 'metro');

  const save = async (rebuild) => {
    const value = weekly.trim() === '' ? null : Number(weekly);
    if (value !== null && !(value > 0)) { setError('Enter a weekly budget in rupees, or leave it empty to use your budget level.'); return; }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await api.saveUserProfile({ ...profile, weeklyBudget: value, priceTier: tier });
      localStorage.setItem('userProfile', JSON.stringify(saved));
      if (rebuild) await generatePlan();
      setMessage(rebuild ? 'Saved, and your plan was rebuilt for this budget.' : 'Saved.');
      await onUpdated?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--color-brand-muted)', borderRadius: '0.625rem' }}>
          <Wallet size={18} color="var(--color-brand)" />
        </div>
        <h2 style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', margin: 0 }}>Food budget</h2>
        <span className="badge" style={{ background: budget.fits ? 'var(--color-brand-muted)' : 'oklch(80% 0.12 52 / 0.2)', color: budget.fits ? 'var(--color-brand)' : 'var(--color-warning)' }}>
          {budget.fits ? 'Within budget' : `${rupees(over)} over`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          ['Plan this week', rupees(budget.planCost), `${rupees(budget.planCostPerDay)} a day`],
          ['Budget', rupees(budget.weeklyBudget), budget.source === 'custom' ? 'your weekly budget' : `from “${budget.level}” level`],
          ['At the shop', rupees(cost?.total || 0), cost?.staples ? `incl. ${rupees(cost.staples)} of staples that last longer` : 'whole packs, minus pantry'],
          ['Per person', `${rupees(budget.planCost / budget.people / Math.max(budget.days, 1))}/day`, `${budget.people} ${budget.people === 1 ? 'person' : 'people'}`],
        ].map(([name, value, sub]) => (
          <div key={name} style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div style={label}>{name}</div>
            <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ ...body, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={label}>Weekly budget (₹, household)</span>
          <input type="number" min="1" className="field" value={weekly} placeholder={String(budget.weeklyBudget)} onChange={e => setWeekly(e.target.value)} style={{ width: '10rem' }} aria-label="Weekly budget in rupees for the household" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={label}>Prices</span>
          <select className="field" value={tier} onChange={e => setTier(e.target.value)} style={{ width: 'auto' }} aria-label="Price level for your city">
            <option value="metro">Metro city</option>
            <option value="tier2">Tier-2 / smaller city</option>
          </select>
        </label>
        <button onClick={() => save(true)} disabled={busy} className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Working…' : changed || !budget.fits ? 'Save & rebuild plan' : 'Rebuild plan'}
        </button>
        {changed && <button onClick={() => save(false)} disabled={busy} className="btn btn--ghost">Save only</button>}
      </div>

      {message && <div style={{ ...body, marginTop: '0.75rem', color: 'var(--color-brand)', display: 'flex', gap: '0.375rem', alignItems: 'center' }}><Check size={15} />{message}</div>}
      {error && <div role="alert" style={{ ...body, marginTop: '0.75rem', color: 'var(--color-error)', display: 'flex', gap: '0.375rem', alignItems: 'center' }}><CircleAlert size={15} />{error}</div>}
      {!budget.fits && !message && (
        <p style={{ ...body, fontSize: 'var(--text-xs)', margin: '0.75rem 0 0' }}>
          Rebuilding swaps the priciest meals for cheaper ones with similar calories and protein. If the budget is still too tight for your targets, it gets as close as it can.
        </p>
      )}
      <p style={{ ...body, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
        The budget compares the food your plan uses. Add staples you already have (atta, dal, spices, oil) to the pantry to see a smaller shop. {cost?.note}
      </p>
    </div>
  );
};

/** Everyday protein sources ranked by ₹ per 10 g protein. */
export const ProteinForMoney = ({ foods }) => {
  if (!foods?.length) return null;
  const max = Math.max(...foods.map(f => f.per10gProtein));
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', margin: '0 0 0.25rem' }}>Protein for your money</h2>
      <p style={{ ...body, fontSize: 'var(--text-xs)', margin: '0 0 0.875rem', color: 'var(--color-text-muted)' }}>₹ for 10 g of protein, at your prices (dry weight for dals and soya).</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {foods.map(food => (
          <div key={food.foodId} style={{ display: 'grid', gridTemplateColumns: 'minmax(7rem, 11rem) 1fr 3.5rem', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ ...body, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={food.name}>{food.name}</span>
            <div className="progress-track" style={{ height: '6px' }}>
              <div className="progress-fill" style={{ width: `${(food.per10gProtein / max) * 100}%`, background: food.per10gProtein <= max / 3 ? 'var(--color-brand)' : 'var(--color-accent)' }} />
            </div>
            <span className="tabular" style={{ ...body, textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>₹{food.per10gProtein}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetCard;
