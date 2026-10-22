// Small per-user values that components read synchronously from localStorage but that
// must survive a new device or a cleared browser. Writes go to localStorage and the
// server; at login the server copy is loaded back into localStorage.
import { api } from './api';

// Server key -> localStorage key. Values are JSON in both places.
export const SYNCED_KEYS = {
  pantry: 'nutriplan_pantry_items',
  shoppingChecked: 'shopping_checked_items',
  streakMeta: 'nutriplan_streak_meta',
  activePlanId: 'activePlanId',
};

export const complianceKey = (userId) => `mealCompliance_${userId}`;

// How far back local meal tracking is uploaded when an older browser copy is found.
const MIGRATION_DAYS = 180;
const LEGACY_CUSTOM_RECIPES_KEY = 'nutriplan_custom_recipes';

export const readSynced = (name, fallback = null) => {
  try {
    const raw = localStorage.getItem(SYNCED_KEYS[name]);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeSynced = (name, value) => {
  const key = SYNCED_KEYS[name];
  const json = JSON.stringify(value);
  if (localStorage.getItem(key) === json) return;
  localStorage.setItem(key, json);
  api.putUserData(name, value).catch(err => console.warn(`Could not sync ${name}:`, err));
};

const readLocalJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

// One load at a time: React runs startup effects twice in development, and two
// overlapping loads would upload the same legacy data twice.
let inFlight = null;

/**
 * Load the user's synced data into localStorage. Values that exist only in this
 * browser (saved before syncing existed) are uploaded instead of discarded.
 */
export const hydrateUserData = (userId) => {
  if (!inFlight) inFlight = loadAndMigrate(userId).finally(() => { inFlight = null; });
  return inFlight;
};

const loadAndMigrate = async (userId) => {
  const [serverData, serverCompliance] = await Promise.all([api.getUserData(), api.getComplianceRange()]);

  for (const [name, key] of Object.entries(SYNCED_KEYS)) {
    const local = readLocalJson(key);
    if (serverData[name] !== undefined && serverData[name] !== null) {
      localStorage.setItem(key, JSON.stringify(serverData[name]));
    } else if (local !== null) {
      api.putUserData(name, local).catch(() => {});
    }
  }

  const localCompliance = readLocalJson(complianceKey(userId)) || {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MIGRATION_DAYS);
  for (const [date, record] of Object.entries(localCompliance)) {
    if (!serverCompliance[date] && record?.meals && new Date(date) >= cutoff) {
      serverCompliance[date] = record;
      api.updateCompliance(date, record.meals).catch(() => {});
    }
  }
  localStorage.setItem(complianceKey(userId), JSON.stringify(serverCompliance));

  // Custom recipes used to live only in this browser; move any that are left to the server.
  // The local copy is removed first so a second tab can't upload them again, and the
  // ones that fail to upload are put back.
  const legacyRecipes = readLocalJson(LEGACY_CUSTOM_RECIPES_KEY);
  if (Array.isArray(legacyRecipes) && legacyRecipes.length) {
    localStorage.removeItem(LEGACY_CUSTOM_RECIPES_KEY);
    const results = await Promise.allSettled(legacyRecipes.map(recipe => api.saveCustomRecipe(recipe)));
    const failed = legacyRecipes.filter((_, i) => results[i].status === 'rejected');
    if (failed.length) localStorage.setItem(LEGACY_CUSTOM_RECIPES_KEY, JSON.stringify(failed));
  }
};
