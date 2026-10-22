import React from 'react';
import { Plus, Trash2, Camera, Keyboard, Search, CalendarCheck } from 'lucide-react';
import { api } from '../../services/api';
import { notifyFoodLogChanged } from '../../hooks/useFoodLog';

const SLOT_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
const SOURCE = {
  plan: { icon: CalendarCheck, label: 'From plan' },
  photo: { icon: Camera, label: 'Photo' },
  text: { icon: Keyboard, label: 'Described' },
  manual: { icon: Search, label: 'Added' },
};

const portion = (item) => {
  if (item.kind === 'plan') return item.portionLabel || '';
  if (item.grams !== undefined && ['g', 'ml'].includes(item.unit)) return `${item.quantity} ${item.unit}`;
  const unit = item.unit === 'serving' ? (item.quantity === 1 ? 'serving' : 'servings') : item.unit;
  return `${item.quantity} ${unit}`;
};

/** Everything logged today, by meal, with a button to log more. */
const TodayLogCard = ({ date, logs, onLogFood }) => {
  const remove = async (log) => {
    try {
      await api.deleteFoodLog(log.id);
      notifyFoodLogChanged(date);
    } catch (error) {
      alert(error.message);
    }
  };

  const bySlot = SLOT_ORDER.map(slot => ({ slot, entries: logs.filter(l => l.slot === slot) })).filter(g => g.entries.length);

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0 }}>
          Food log
        </h2>
        <button onClick={() => onLogFood()} className="btn btn--secondary btn--sm">
          <Plus style={{ width: '1rem', height: '1rem' }} />Log food
        </button>
      </div>

      {bySlot.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
          Nothing logged yet today. Tick a planned meal as eaten, or log what you actually ate with a photo or a quick description like “2 roti, 1 katori dal”.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bySlot.map(({ slot, entries }) => (
            <div key={slot}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                <span>{SLOT_LABEL[slot]}</span>
                <span className="tabular">{Math.round(entries.reduce((s, l) => s + l.totals.kcal, 0))} kcal</span>
              </div>
              {entries.map(log => {
                const { icon: Icon, label } = SOURCE[log.source] || SOURCE.manual;
                return (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.5rem 0', borderTop: '1px solid var(--color-border)' }}>
                    <Icon aria-label={label} style={{ width: '1rem', height: '1rem', marginTop: '0.2rem', color: 'var(--color-brand)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {log.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                          <span style={{ minWidth: 0 }}>
                            {item.name} <span style={{ color: 'var(--color-text-muted)' }}>{portion(item)}</span>
                          </span>
                          <span className="tabular" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{Math.round(item.nutrition.kcal)}</span>
                        </div>
                      ))}
                    </div>
                    {log.source !== 'plan' && (
                      <button onClick={() => remove(log)} className="btn btn--ghost btn--sm" style={{ padding: '0.2rem' }} aria-label="Delete this entry">
                        <Trash2 style={{ width: '0.9rem', height: '0.9rem' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayLogCard;
