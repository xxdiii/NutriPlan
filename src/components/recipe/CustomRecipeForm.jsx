import React, { useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  X, Plus, Trash2, ChefHat, Info, Check
} from 'lucide-react';
import {
  addCustomRecipe,
  updateCustomRecipe,
  emptyRecipeForm,
  DIETARY_TYPES,
  CUISINE_OPTIONS,
  DIFFICULTY_OPTIONS,
  MEAL_TYPE_OPTIONS,
} from '../../services/customRecipeService';
import { ALLERGENS } from '../../utils/constants';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const DIETARY_LABELS = {
  vegan: '🌱 Vegan',
  vegetarian: '🥦 Vegetarian',
  eggetarian: '🥚 Eggetarian',
  pescatarian: '🐟 Pescatarian',
  non_veg: '🍗 Non-Veg',
};

const MEAL_LABELS = {
  breakfast: '🌅 Breakfast',
  lunch: '🍽️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snack',
};

const TAG_SUGGESTIONS = [
  'quick', 'healthy', 'protein-rich', 'low-carb', 'high-fiber',
  'spicy', 'mild', 'batch-friendly', 'budget', 'kids-friendly',
];

// ── Field components ──────────────────────────────────────────────────────────

const Label = ({ children, required, isDark }) => (
  <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = ({ isDark, error, ...props }) => (
  <input
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all
      ${error ? 'border-red-500' : isDark ? 'border-gray-600' : 'border-gray-200'}
      ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'}`}
  />
);

const Textarea = ({ isDark, rows = 3, ...props }) => (
  <textarea
    {...props}
    rows={rows}
    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none
      ${isDark ? 'bg-gray-700 text-white placeholder-gray-500 border-gray-600' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'}`}
  />
);

const Select = ({ isDark, children, ...props }) => (
  <select
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all
      ${isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-200'}`}
  >
    {children}
  </select>
);

const TogglePill = ({ label, active, onClick, isDark }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
      ${active
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-emerald-500' : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400'
      }`}
  >
    {active && <Check className="w-3 h-3" />}
    {label}
  </button>
);

// ── Validation ─────────────────────────────────────────────────────────────────

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Recipe name is required';
  if (form.mealTypes.length === 0) errors.mealTypes = 'Select at least one meal type';
  if (form.dietaryType.length === 0) errors.dietaryType = 'Select at least one dietary type';
  if (!form.calories || form.calories <= 0) errors.calories = 'Enter calories per serving';
  if (!form.protein || form.protein < 0) errors.protein = 'Enter protein (g)';
  if (form.ingredients.filter(i => i.trim()).length === 0) errors.ingredients = 'Add at least one ingredient';
  if (form.instructions.filter(i => i.trim()).length === 0) errors.instructions = 'Add at least one instruction step';
  return errors;
};

// ── Main Form Component ───────────────────────────────────────────────────────

/**
 * CustomRecipeForm
 *
 * Props:
 *  recipe   – existing recipe to edit (null = create new)
 *  onSave   – (savedRecipe) => void  called after successful save
 *  onClose  – () => void
 */
const CustomRecipeForm = ({ recipe = null, onSave, onClose }) => {
  const { isDark } = useTheme();
  const isEdit = !!recipe;

  const [form, setForm] = useState(() => recipe
    ? {
        name: recipe.name ?? '',
        cuisine: recipe.cuisine ?? 'international',
        dietaryType: recipe.dietaryType ?? [],
        mealTypes: recipe.meals ?? recipe.mealTypes ?? [],
        prepTime: recipe.prepTime ?? 10,
        cookTime: recipe.cookTime ?? 20,
        difficulty: recipe.difficulty ?? 'beginner',
        servings: recipe.servings ?? 2,
        calories: recipe.calories ?? 0,
        protein: recipe.protein ?? 0,
        carbs: recipe.carbs ?? 0,
        fat: recipe.fat ?? 0,
        ingredients: recipe.ingredients?.length ? recipe.ingredients : [''],
        instructions: recipe.instructions?.length ? recipe.instructions : [''],
        tags: recipe.tags ?? [],
        allergens: recipe.allergens ?? [],
        imageUrl: recipe.imageUrl ?? '',
      }
    : emptyRecipeForm()
  );

  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Generic field update ──────────────────────────────────────────────────
  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  }, [errors]);

  const toggleMulti = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  // ── Dynamic list helpers (ingredients / instructions) ─────────────────────
  const updateListItem = (field, idx, value) => {
    const list = [...form[field]];
    list[idx] = value;
    set(field, list);
  };

  const addListItem = (field) => set(field, [...form[field], '']);

  const removeListItem = (field, idx) => {
    const list = form[field].filter((_, i) => i !== idx);
    set(field, list.length ? list : ['']);
  };

  // ── Tags ──────────────────────────────────────────────────────────────────
  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clean up empty list items
    const cleaned = {
      ...form,
      ingredients: form.ingredients.filter(i => i.trim()),
      instructions: form.instructions.filter(i => i.trim()),
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
      prepTime: Number(form.prepTime),
      cookTime: Number(form.cookTime),
      servings: Number(form.servings),
    };

    setSaving(true);
    setSaveError('');
    try {
      const saved = isEdit
        ? await updateCustomRecipe(recipe.id, cleaned)
        : await addCustomRecipe(cleaned);
      onSave?.(saved);
      onClose?.();
    } catch (error) {
      setSaveError(error.message || 'Could not save the recipe.');
    } finally {
      setSaving(false);
    }
  };

  // ── Section divider ────────────────────────────────────────────────────────
  const Section = ({ title, children }) => (
    <div>
      <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-100'}`}>

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0
          ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isEdit ? 'Edit Recipe' : 'Add Custom Recipe'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Your recipe will be included in future meal plan generation
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* BASICS */}
          <Section title="Basics">
            <div>
              <Label isDark={isDark} required>Recipe Name</Label>
              <Input isDark={isDark} error={errors.name}
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Mum's Chicken Curry" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label isDark={isDark}>Cuisine</Label>
                <Select isDark={isDark} value={form.cuisine} onChange={e => set('cuisine', e.target.value)}>
                  {CUISINE_OPTIONS.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label isDark={isDark}>Difficulty</Label>
                <Select isDark={isDark} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                  {DIFFICULTY_OPTIONS.map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label isDark={isDark}>Prep (min)</Label>
                <Input isDark={isDark} type="number" min={0} value={form.prepTime}
                  onChange={e => set('prepTime', e.target.value)} />
              </div>
              <div>
                <Label isDark={isDark}>Cook (min)</Label>
                <Input isDark={isDark} type="number" min={0} value={form.cookTime}
                  onChange={e => set('cookTime', e.target.value)} />
              </div>
              <div>
                <Label isDark={isDark}>Servings</Label>
                <Input isDark={isDark} type="number" min={1} value={form.servings}
                  onChange={e => set('servings', e.target.value)} />
              </div>
            </div>
          </Section>

          {/* MEAL TYPE */}
          <Section title="Meal Type">
            <div>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPE_OPTIONS.map(t => (
                  <TogglePill key={t} label={MEAL_LABELS[t]} isDark={isDark}
                    active={form.mealTypes.includes(t)}
                    onClick={() => toggleMulti('mealTypes', t)} />
                ))}
              </div>
              {errors.mealTypes && <p className="text-red-500 text-xs mt-2">{errors.mealTypes}</p>}
            </div>
          </Section>

          {/* DIETARY TYPE */}
          <Section title="Dietary Type">
            <div>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TYPES.map(d => (
                  <TogglePill key={d} label={DIETARY_LABELS[d]} isDark={isDark}
                    active={form.dietaryType.includes(d)}
                    onClick={() => toggleMulti('dietaryType', d)} />
                ))}
              </div>
              {errors.dietaryType && <p className="text-red-500 text-xs mt-2">{errors.dietaryType}</p>}
            </div>
          </Section>

          {/* ALLERGENS: the meal planner hides this recipe from anyone allergic to these */}
          <Section title="Contains allergens">
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map(a => (
                <TogglePill key={a.id} label={a.name} isDark={isDark}
                  active={form.allergens.includes(a.id)}
                  onClick={() => toggleMulti('allergens', a.id)} />
              ))}
            </div>
          </Section>

          {/* NUTRITION */}
          <Section title="Nutrition (per serving)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { field: 'calories', label: 'Calories (kcal)', color: 'text-orange-500', required: true },
                { field: 'protein',  label: 'Protein (g)',     color: 'text-emerald-500', required: true },
                { field: 'carbs',    label: 'Carbs (g)',       color: 'text-blue-500' },
                { field: 'fat',      label: 'Fat (g)',         color: 'text-purple-500' },
              ].map(({ field, label, color, required }) => (
                <div key={field}>
                  <Label isDark={isDark} required={required}>
                    <span className={color}>{label}</span>
                  </Label>
                  <Input isDark={isDark} error={errors[field]} type="number" min={0}
                    value={form[field]}
                    onChange={e => set(field, e.target.value)} />
                  {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
                </div>
              ))}
            </div>
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-xl ${isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Nutritional values are used by the meal plan generator to hit your daily targets accurately.
            </div>
          </Section>

          {/* INGREDIENTS */}
          <Section title="Ingredients">
            <div className="space-y-2">
              {form.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input isDark={isDark} value={ing}
                    placeholder={`e.g. 200g chicken breast`}
                    onChange={e => updateListItem('ingredients', idx, e.target.value)} />
                  <button type="button" onClick={() => removeListItem('ingredients', idx)}
                    className={`flex-shrink-0 p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {errors.ingredients && <p className="text-red-500 text-xs">{errors.ingredients}</p>}
              <button type="button" onClick={() => addListItem('ingredients')}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors
                  ${isDark ? 'text-emerald-400 hover:bg-emerald-900/20' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                <Plus className="w-4 h-4" /> Add ingredient
              </button>
            </div>
          </Section>

          {/* INSTRUCTIONS */}
          <Section title="Instructions">
            <div className="space-y-2">
              {form.instructions.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className={`flex-shrink-0 w-6 h-6 mt-2.5 rounded-full text-xs font-bold flex items-center justify-center
                    ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {idx + 1}
                  </span>
                  <Textarea isDark={isDark} rows={2} value={step}
                    placeholder={`Step ${idx + 1}…`}
                    onChange={e => updateListItem('instructions', idx, e.target.value)} />
                  <button type="button" onClick={() => removeListItem('instructions', idx)}
                    className={`flex-shrink-0 p-2.5 mt-1 rounded-xl transition-colors ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {errors.instructions && <p className="text-red-500 text-xs">{errors.instructions}</p>}
              <button type="button" onClick={() => addListItem('instructions')}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors
                  ${isDark ? 'text-emerald-400 hover:bg-emerald-900/20' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                <Plus className="w-4 h-4" /> Add step
              </button>
            </div>
          </Section>

          {/* TAGS */}
          <Section title="Tags (optional)">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map(tag => (
                  <span key={tag}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border
                      ${isDark ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    #{tag}
                    <button type="button" onClick={() => set('tags', form.tags.filter(t => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input isDark={isDark} value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown} placeholder="Type a tag and press Enter…" />
                <button type="button" onClick={() => addTag(tagInput)}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TAG_SUGGESTIONS.filter(t => !form.tags.includes(t)).map(t => (
                  <button key={t} type="button" onClick={() => addTag(t)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors
                      ${isDark ? 'border-gray-600 text-gray-400 hover:border-emerald-500 hover:text-emerald-400' : 'border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}>
                    +{t}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* IMAGE URL */}
          <Section title="Image (optional)">
            <div>
              <Label isDark={isDark}>Image URL</Label>
              <Input isDark={isDark} type="url" value={form.imageUrl}
                onChange={e => set('imageUrl', e.target.value)}
                placeholder="https://…" />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview"
                  className="mt-2 w-full h-32 object-cover rounded-xl border"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          </Section>

        </form>

        {/* ── Footer ── */}
        <div className={`flex gap-3 px-6 py-4 border-t flex-shrink-0
          ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
          <button type="button" onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors border
              ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
            Cancel
          </button>
          <button type="submit" form="" onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white transition-colors shadow-lg shadow-emerald-900/20">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : '🍳 Add Recipe'}
          </button>
        </div>
        {saveError && <p className="px-6 pb-4 text-red-500 text-sm">{saveError}</p>}
      </div>
    </div>
  );
};

export default CustomRecipeForm;
