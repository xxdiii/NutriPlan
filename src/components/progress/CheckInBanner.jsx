import React, { useEffect, useState } from 'react';
import { Activity, ChevronRight, X } from 'lucide-react';
import { api } from '../../services/api';
import { localDateString } from '../../utils/dates';

const DISMISS_KEY = 'checkInBannerDismissed';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === localDateString();
  } catch {
    return false;
  }
};

/** Dashboard nudge when a weekly check-in has a new target to review. */
const CheckInBanner = ({ setCurrentPage }) => {
  const [checkIn, setCheckIn] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    if (dismissed) return;
    api.getCheckIn(localDateString()).then(setCheckIn).catch(() => setCheckIn(null));
  }, [dismissed]);

  if (dismissed || checkIn?.status !== 'ok' || !checkIn.due) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, localDateString()); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', background: 'var(--color-brand-muted)', borderColor: 'var(--color-brand-dim)' }}>
      <Activity style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)', flexShrink: 0 }} />
      <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
        <strong>Your weekly check-in is ready.</strong> Real maintenance about {checkIn.observedTdee} kcal
        {checkIn.change !== 0 ? `; suggested target ${checkIn.proposedTarget} kcal.` : '; your target still fits.'}
      </div>
      <button onClick={() => setCurrentPage('progress')} className="btn btn--primary btn--sm">
        Review<ChevronRight style={{ width: '1rem', height: '1rem' }} />
      </button>
      <button onClick={dismiss} className="btn btn--ghost btn--sm" aria-label="Dismiss" style={{ padding: '0.25rem' }}>
        <X style={{ width: '1rem', height: '1rem' }} />
      </button>
    </div>
  );
};

export default CheckInBanner;
