import React, { useState, useMemo } from 'react';
import { X, Search, PackageCheck, Package, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * PANTRY_KEY – localStorage key where pantry items are stored as a JSON array of
 * normalised ingredient name strings (lowercase, trimmed).
 */
export const PANTRY_KEY = 'nutriplan_pantry_items';

/**
 * Load the current pantry item set from localStorage.
 * @returns {Set<string>}
 */
export const loadPantry = () => {
  try {
    const raw = localStorage.getItem(PANTRY_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Persist the pantry set to localStorage.
 * @param {Set<string>} pantrySet
 */
export const savePantry = (pantrySet) => {
  localStorage.setItem(PANTRY_KEY, JSON.stringify([...pantrySet]));
};

/**
 * Normalise an ingredient name for consistent pantry matching:
 * lowercase, collapse whitespace, strip leading/trailing spaces.
 * @param {string} name
 * @returns {string}
 */
export const normalisePantryName = (name = '') =>
  name.toLowerCase().replace(/\s+/g, ' ').trim();

// ─────────────────────────────────────────────────────────────────────────────

const categoryIcons = {
  vegetables: '🥬',
  fruits: '🍎',
  proteins: '🍗',
  dairy: '🥛',
  grains: '🌾',
  spices: '🌶️',
  oils: '🫒',
  others: '📦',
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PantryManager modal.
 *
 * Props:
 *  - shoppingList  : the full shopping list object (byCategory, totalItems, …)
 *  - pantryItems   : Set<string> of pantry ingredient keys
 *  - onPantryChange: (newSet: Set<string>) => void  – called after every toggle
 *  - onClose       : () => void
 */
const PantryManager = ({ shoppingList, pantryItems, onPantryChange, onClose }) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (cat) =>
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const toggleItem = (normName) => {
    const next = new Set(pantryItems);
    if (next.has(normName)) {
      next.delete(normName);
    } else {
      next.add(normName);
    }
    savePantry(next);
    onPantryChange(next);
  };

  const clearAll = () => {
    const empty = new Set();
    savePantry(empty);
    onPantryChange(empty);
  };

  // Flatten all items for search
  const allItems = useMemo(() => {
    const flat = [];
    Object.entries(shoppingList.byCategory).forEach(([cat, items]) => {
      items.forEach(item => flat.push({ ...item, category: cat }));
    });
    return flat;
  }, [shoppingList]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return null; // null means "use category view"
    const q = search.toLowerCase();
    return allItems.filter(item =>
      item.name.includes(q) || (item.display || '').toLowerCase().includes(q)
    );
  }, [search, allItems]);

  const pantryCount = pantryItems.size;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <PackageCheck className="w-5 h-5 text-emerald-500" />
              My Pantry
            </h2>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Mark what you already have — they'll be removed from your shopping list
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className={`px-6 py-3 flex items-center gap-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          {/* Search */}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ingredients…"
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500
                ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 border border-gray-700' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200'}`}
            />
          </div>

          {/* Pantry count badge */}
          {pantryCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold whitespace-nowrap">
              {pantryCount} in pantry
            </span>
          )}

          {/* Clear all */}
          {pantryCount > 0 && (
            <button
              onClick={clearAll}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
              title="Clear all pantry items"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filteredItems !== null ? (
            // ── Search results view ──────────────────────────────────────
            filteredItems.length === 0 ? (
              <p className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No ingredients match your search.</p>
            ) : (
              filteredItems.map(item => (
                <PantryItem
                  key={`${item.name}_${item.unit}`}
                  item={item}
                  inPantry={pantryItems.has(normalisePantryName(item.name))}
                  onToggle={() => toggleItem(normalisePantryName(item.name))}
                  isDark={isDark}
                />
              ))
            )
          ) : (
            // ── Category accordion view ──────────────────────────────────
            Object.entries(shoppingList.byCategory).map(([cat, items]) => {
              if (items.length === 0) return null;
              const isExpanded = expandedCategories[cat] !== false; // default open
              const countInPantry = items.filter(i => pantryItems.has(normalisePantryName(i.name))).length;

              return (
                <div key={cat} className={`rounded-xl overflow-hidden border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-white shadow-sm'}`}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{categoryIcons[cat]}</span>
                      <span className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {items.length}
                      </span>
                      {countInPantry > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium">
                          {countInPantry} in pantry
                        </span>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      : <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                  </button>

                  {/* Items */}
                  {isExpanded && (
                    <div className={`border-t px-2 py-1 space-y-0.5 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      {items.map(item => (
                        <PantryItem
                          key={`${item.name}_${item.unit}`}
                          item={item}
                          inPantry={pantryItems.has(normalisePantryName(item.name))}
                          onToggle={() => toggleItem(normalisePantryName(item.name))}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Done — apply to shopping list
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: single ingredient row
// ─────────────────────────────────────────────────────────────────────────────
const PantryItem = ({ item, inPantry, onToggle, isDark }) => (
  <div
    onClick={onToggle}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-all
      ${inPantry
        ? isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'
        : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
      }`}
  >
    {/* Toggle icon */}
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
      ${inPantry ? 'bg-emerald-500' : isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {inPantry
        ? <PackageCheck className="w-4 h-4 text-white" />
        : <Package className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
      }
    </div>

    {/* Name */}
    <span className={`flex-1 text-sm font-medium capitalize
      ${inPantry
        ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-700 line-through'
        : isDark ? 'text-gray-200' : 'text-gray-800'
      }`}>
      {item.name}
    </span>

    {/* "Have it" label */}
    {inPantry && (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
        In pantry
      </span>
    )}
  </div>
);

export default PantryManager;
