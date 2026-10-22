import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const EMPTY = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, sodium: 0, slots: [], entries: 0 };

/** Tell every screen showing intake that the food log changed. */
export const notifyFoodLogChanged = (date) =>
  window.dispatchEvent(new CustomEvent('food-log-update', { detail: { date } }));

/**
 * Logged food for one day: the entries and their totals. Refreshes whenever the food
 * log changes (a new log, a deleted one, or a planned meal ticked as eaten).
 */
export const useFoodLog = (date) => {
  const [logs, setLogs] = useState([]);
  const [totals, setTotals] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!date) return;
    try {
      const [entries, summary] = await Promise.all([api.getFoodLogs(date), api.getFoodLogSummary(date)]);
      setLogs(entries);
      setTotals({ ...EMPTY, ...(summary[date] || {}) });
    } catch (error) {
      console.warn('Could not load the food log:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
    window.addEventListener('food-log-update', refresh);
    return () => window.removeEventListener('food-log-update', refresh);
  }, [refresh]);

  return { logs, totals, loading, refresh };
};

/** Calories and macros in the shape the stat cards use, rounded. */
export const toConsumedStats = (totals) => ({
  calories: Math.round(totals.kcal || 0),
  protein: Math.round(totals.protein || 0),
  carbs: Math.round(totals.carbs || 0),
  fat: Math.round(totals.fat || 0),
});
