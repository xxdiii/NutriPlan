import React, { useState } from 'react';
import { ArrowRight, Check, X, UtensilsCrossed, CalendarDays, CircleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { loadPlan } from '../../services/mealPlanService';
import { notifyFoodLogChanged } from '../../hooks/useFoodLog';

const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
const STATUS = {
  applied: { label: 'Applied', color: 'var(--color-success)' },
  dismissed: { label: 'Dismissed', color: 'var(--color-text-muted)' },
  expired: { label: 'Out of date', color: 'var(--color-warning)' },
};

const small = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' };
const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const Meal = ({ meal, muted }) => (
  <div style={{ flex: 1, minWidth: 0, opacity: muted ? 0.6 : 1 }}>
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: muted ? 'line-through' : 'none' }}>
      {meal ? meal.name : 'Nothing planned'}
    </div>
    {meal && (
      <div style={small}>
        {meal.portion}{meal.eatingOut ? '' : ` · ${meal.kcal} kcal · ${meal.protein} g protein`}
      </div>
    )}
  </div>
);

/**
 * A change the coach prepared: before/after for plan changes, or the items to log.
 * Nothing is saved until Apply.
 */
const ProposalCard = ({ messageId, index, proposal, onResolved }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = STATUS[proposal.status];

  const resolve = async (action) => {
    setBusy(true);
    setError('');
    try {
      const result = await api.resolveCoachProposal(messageId, index, action);
      if (action === 'apply') {
        if (result.kind === 'plan') await loadPlan();
        if (result.kind === 'log') notifyFoodLogChanged(result.log.date);
      }
      onResolved(index, action === 'apply' ? 'applied' : 'dismissed');
    } catch (err) {
      setError(err.message);
      if (/changed since/.test(err.message)) onResolved(index, 'expired');
    } finally {
      setBusy(false);
    }
  };

  const Icon = proposal.kind === 'log' ? UtensilsCrossed : CalendarDays;

  return (
    <div style={{ marginTop: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'var(--color-brand-muted)' }}>
        <Icon style={{ width: '1rem', height: '1rem', color: 'var(--color-brand)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{proposal.title}</span>
        {status && <span style={{ ...small, fontWeight: 700, color: status.color }}>{status.label}</span>}
      </div>

      <div style={{ padding: '0.75rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {proposal.kind === 'plan' && proposal.changes.map(day => (
          <div key={day.date}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...small, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
              <span>{dayLabel(day.date)}</span>
              <span className="tabular">Day {day.totals.before} → {day.totals.after} kcal</span>
            </div>
            {day.meals.map(change => (
              <div key={change.slot} style={{ padding: '0.5rem 0', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ ...small, marginBottom: '0.25rem' }}>{SLOT_LABEL[change.slot]}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Meal meal={change.before} muted />
                  <ArrowRight style={{ width: '0.9rem', height: '0.9rem', color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <Meal meal={change.after} />
                </div>
              </div>
            ))}
          </div>
        ))}

        {proposal.kind === 'log' && (
          <div>
            <div style={{ ...small, marginBottom: '0.375rem' }}>{SLOT_LABEL[proposal.log.slot]} · {dayLabel(proposal.log.date)}</div>
            {proposal.log.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.3rem 0', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                <span>{item.name} <span style={{ color: 'var(--color-text-muted)' }}>{item.quantity} {item.unit}</span></span>
                <span className="tabular" style={{ color: 'var(--color-text-secondary)' }}>{item.kcal} kcal</span>
              </div>
            ))}
            <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.375rem', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              <span>Total</span><span>{proposal.log.totals.kcal} kcal · {proposal.log.totals.protein} g protein</span>
            </div>
            {proposal.log.notFound?.length > 0 && (
              <div style={{ ...small, marginTop: '0.375rem' }}>Not in the food database (log these with Log food): {proposal.log.notFound.join(', ')}</div>
            )}
          </div>
        )}

        {error && (
          <div role="alert" style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
            <CircleAlert style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />{error}
          </div>
        )}

        {proposal.status === 'pending' && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => resolve('dismiss')} disabled={busy} className="btn btn--ghost btn--sm">
              <X style={{ width: '0.9rem', height: '0.9rem' }} />Dismiss
            </button>
            <button onClick={() => resolve('apply')} disabled={busy} className="btn btn--primary btn--sm" style={{ opacity: busy ? 0.6 : 1 }}>
              <Check style={{ width: '0.9rem', height: '0.9rem' }} />{busy ? 'Applying…' : 'Apply'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalCard;
