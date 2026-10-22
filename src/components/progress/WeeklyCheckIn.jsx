import React, { useState } from 'react';
import { Activity, Check, RotateCcw, CircleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { localDateString } from '../../utils/dates';

const label = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' };
const body = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 };
const kcal = (n) => `${Number(n).toLocaleString('en-IN')} kcal`;

const Stat = ({ name, value, sub }) => (
  <div style={{ padding: '0.75rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
    <div style={label}>{name}</div>
    <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>{value}</div>
    {sub && <div style={{ ...body, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</div>}
  </div>
);

/**
 * Weekly adaptive-target check-in: real maintenance estimated from the food log and
 * weight trend, and the target it suggests.
 * @param checkIn    result of GET /api/adaptive/check-in
 * @param targets    the profile's current nutritionTargets
 * @param onChanged  called with the updated profile after accept or reset
 */
const WeeklyCheckIn = ({ checkIn, targets, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!checkIn) return null;
  const adaptive = targets?.tdeeSource === 'adaptive';

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const { profile, replanned } = await api.acceptCheckIn(localDateString());
      setMessage(`New target saved: ${kcal(profile.nutritionTargets.targetCalories)}.${replanned ? ' The rest of this week’s plan was rebuilt to match.' : ''}`);
      onChanged?.(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Go back to the standard formula estimate for your maintenance calories?')) return;
    setBusy(true);
    setError('');
    try {
      const { profile } = await api.resetAdaptiveTarget();
      setMessage(`Back to the formula: target ${kcal(profile.nutritionTargets.targetCalories)}.`);
      onChanged?.(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ok = checkIn.status === 'ok';
  const daysLeft = checkIn.daysSinceLast === null ? 0 : Math.max(0, 7 - checkIn.daysSinceLast);

  return (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--color-brand-muted)', borderRadius: '0.625rem' }}>
          <Activity style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0 }}>Weekly check-in</h2>
          <div style={{ ...body, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Target now {kcal(targets?.targetCalories ?? checkIn.currentTarget)} · {adaptive ? 'adapted to your data' : 'from the Mifflin-St Jeor formula'}
          </div>
        </div>
      </div>

      {ok ? (
        <>
          <p style={{ ...body, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', margin: '0 0 1rem' }}>
            Your real maintenance is about <strong className="tabular">{kcal(checkIn.observedTdee)}</strong> (the formula said {kcal(checkIn.formulaTdee)}).
            {!checkIn.due
              ? <> Your target of {kcal(targets?.targetCalories ?? checkIn.currentTarget)} is up to date.</>
              : checkIn.change !== 0
                ? <> Suggested target: <strong className="tabular">{kcal(checkIn.proposedTarget)}</strong> ({checkIn.change > 0 ? '+' : ''}{checkIn.change}).</>
                : <> Your target of {kcal(checkIn.currentTarget)} still fits.</>}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <Stat name="Average intake" value={kcal(checkIn.avgIntake)} sub={`${checkIn.loggedDays} logged days`} />
            <Stat name="Weight change" value={`${checkIn.weeklyRateKg > 0 ? '+' : ''}${checkIn.weeklyRateKg} kg/wk`} sub={`over ${checkIn.windowDays} days`} />
            <Stat name="Trend weight" value={`${checkIn.currentWeight} kg`} />
            <Stat name="Confidence" value={`${Math.round(checkIn.confidence * 100)}%`} sub="grows with more logged days" />
          </div>
          {checkIn.due && checkIn.notes?.length > 0 && (
            <ul style={{ ...body, margin: '0 0 1rem', paddingLeft: '1.1rem' }}>
              {checkIn.notes.map(note => <li key={note}>{note}</li>)}
            </ul>
          )}
        </>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ ...body, margin: '0 0 0.5rem' }}>
            NutriPlan learns your real maintenance calories from what you log and how your weight moves. To start, it needs:
          </p>
          <ul style={{ ...body, margin: 0, paddingLeft: '1.1rem' }}>
            {checkIn.needs.map(need => <li key={need}>{need}</li>)}
          </ul>
        </div>
      )}

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-brand-muted)', color: 'var(--color-brand)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          <Check style={{ width: '1rem', height: '1rem' }} />{message}
        </div>
      )}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.75rem', borderRadius: 'var(--radius-md)', background: 'oklch(52% 0.19 22 / 0.1)', color: 'var(--color-error)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>
          <CircleAlert style={{ width: '1rem', height: '1rem' }} />{error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {ok && checkIn.due && !message && (
          <button onClick={accept} disabled={busy} className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1 }}>
            {checkIn.change !== 0 ? `Use ${kcal(checkIn.proposedTarget)}` : 'Confirm target'}
          </button>
        )}
        {ok && !checkIn.due && <span style={{ ...body, fontSize: 'var(--text-xs)' }}>Next check-in in {daysLeft} day{daysLeft === 1 ? '' : 's'}.</span>}
        {adaptive && (
          <button onClick={reset} disabled={busy} className="btn btn--ghost btn--sm">
            <RotateCcw style={{ width: '0.9rem', height: '0.9rem' }} />Use the formula instead
          </button>
        )}
      </div>
    </div>
  );
};

export default WeeklyCheckIn;
