import React, { useEffect, useState } from 'react';
import { X, Search, Trash2, PackageCheck, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { localDateString } from '../../utils/dates';

const DAY_MS = 86400000;
const daysUntil = (date) => Math.round((Date.parse(`${date}T00:00:00`) - Date.parse(`${localDateString()}T00:00:00`)) / DAY_MS);

const muted = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' };

const ExpiryBadge = ({ expiresOn }) => {
  if (!expiresOn) return null;
  const days = daysUntil(expiresOn);
  const text = days < 0 ? 'Expired' : days === 0 ? 'Use today' : days <= 4 ? `Use within ${days} day${days === 1 ? '' : 's'}` : null;
  if (!text) return null;
  return (
    <span className="badge badge--accent" style={{ color: days < 0 ? 'var(--color-error)' : 'var(--color-warning)' }}>
      <Clock size={11} />{text}
    </span>
  );
};

/**
 * What's at home: quantity (empty = "have enough") and expiry date. The shopping list
 * subtracts it, and new plans use items that expire soon first.
 */
const PantryManager = ({ onClose, onChanged }) => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const load = () => api.getPantry().then(setItems).catch(err => setError(err.message));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) return undefined;
    const timer = setTimeout(() => api.searchPantryFoods(query.trim()).then(setResults).catch(() => setResults([])), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const shown = query.trim().length < 2 ? [] : results;

  const save = async (foodId, values) => {
    setError('');
    try {
      const saved = await api.savePantryItem(foodId, values);
      setItems(current => (current.some(i => i.foodId === foodId) ? current.map(i => (i.foodId === foodId ? saved : i)) : [saved, ...current]));
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (foodId) => {
    try {
      await api.deletePantryItem(foodId);
      setItems(current => current.filter(i => i.foodId !== foodId));
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const add = (food) => {
    setQuery('');
    setResults([]);
    if (!items.some(i => i.foodId === food.foodId)) save(food.foodId, { grams: null, expiresOn: null });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(10% 0.02 152 / 0.55)', backdropFilter: 'blur(4px)' }} />
      <div role="dialog" aria-modal="true" aria-label="Pantry" style={{ position: 'relative', width: '100%', maxWidth: '38rem', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <PackageCheck style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-brand)' }} />
          <h2 style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0 }}>Pantry</h2>
          <button onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Close"><X size={18} /></button>
        </div>
        <p style={{ ...muted, fontSize: 'var(--text-sm)', margin: '0 0 1rem' }}>
          What you already have. Leave the amount empty if you have plenty. Add an expiry date and your next plan uses it first.
        </p>

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--color-text-muted)' }} />
          <input className="field" style={{ paddingLeft: '2.25rem' }} placeholder="Add an item, e.g. atta, paneer, spinach" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search foods to add" />
        </div>
        {shown.length > 0 && (
          <div style={{ marginTop: '0.375rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {shown.map(food => (
              <button key={food.foodId} onClick={() => add(food)} style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', background: 'var(--color-surface)', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {food.name}
              </button>
            ))}
          </div>
        )}

        {error && <div role="alert" style={{ marginTop: '0.75rem', color: 'var(--color-error)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>{error}</div>}

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
          {items.length === 0 && <p style={{ ...muted, fontSize: 'var(--text-sm)' }}>Your pantry is empty. Add what you have, or tick “Have it” on the shopping list.</p>}
          {items.map(item => (
            <div key={item.foodId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 10rem', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</div>
                <ExpiryBadge expiresOn={item.expiresOn} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="number"
                  min="1"
                  className="field"
                  defaultValue={item.grams ?? ''}
                  placeholder="plenty"
                  onBlur={e => {
                    const grams = e.target.value === '' ? null : Number(e.target.value);
                    if (grams !== item.grams) save(item.foodId, { grams, expiresOn: item.expiresOn });
                  }}
                  style={{ width: '6rem', padding: '0.35rem 0.5rem' }}
                  aria-label={`${item.name} amount in grams`}
                />
                <span style={muted}>g</span>
              </label>
              <input
                type="date"
                className="field"
                value={item.expiresOn || ''}
                onChange={e => save(item.foodId, { grams: item.grams, expiresOn: e.target.value || null })}
                style={{ width: 'auto', padding: '0.35rem 0.5rem' }}
                aria-label={`${item.name} expiry date`}
              />
              <button onClick={() => remove(item.foodId)} className="btn btn--ghost btn--sm" style={{ padding: '0.3rem' }} aria-label={`Remove ${item.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PantryManager;
