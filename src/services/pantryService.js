// The pantry lives on the server; this moves the old name-only pantry (kept in synced
// browser storage) there once.
import { api } from './api';
import { readSynced, writeSynced } from './syncedStorage';

/** @returns true when anything was imported */
export const importLegacyPantry = async () => {
  const names = readSynced('pantry', []) || [];
  if (!names.length) return false;
  try {
    const { imported } = await api.importPantry(names);
    writeSynced('pantry', []);
    return imported > 0;
  } catch (error) {
    console.warn('Could not import the old pantry:', error);
    return false;
  }
};
