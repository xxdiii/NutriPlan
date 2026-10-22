import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Mic, MicOff, Search, Sparkles, Trash2, Plus, LoaderCircle, CircleAlert, Keyboard } from 'lucide-react';
import { api } from '../../services/api';
import { markMealCompliance } from '../../services/complianceService';
import { notifyFoodLogChanged } from '../../hooks/useFoodLog';
import { resizeImage } from '../../utils/image';
import { localDateString } from '../../utils/dates';

const SLOTS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snack' },
  { value: 'dinner', label: 'Dinner' },
];

const slotForNow = () => {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 18.5) return 'snack';
  return 'dinner';
};

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const label = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' };
const muted = { fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' };

let rowId = 0;
const newRow = (fields) => ({ key: ++rowId, ...fields });

/**
 * Log food by describing it (typed or spoken, English/Hindi/Hinglish), by photo, or by
 * searching the food list. Gemini only names the dishes; every number shown here comes
 * from the server's food database.
 *
 * @param plannedDay     the plan day being logged (optional), to offer "instead of my planned meal"
 * @param insteadOfPlan  start with that option ticked (opened from a planned meal)
 */
const FoodLogModal = ({ isOpen, onClose, date: initialDate, slot: initialSlot, plannedDay, insteadOfPlan = false, onSaved }) => {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('hi-IN');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('manual');
  const [slot, setSlot] = useState(slotForNow);
  const [date, setDate] = useState(localDateString);
  const [instead, setInstead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchFor, setSearchFor] = useState(null); // row key being replaced, or 'new'
  const recognition = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('text'); setText(''); setPhoto(null); setError(''); setRows([]); setSource('manual');
    setSlot(initialSlot || slotForNow()); setDate(initialDate || localDateString()); setInstead(insteadOfPlan);
    setQuery(''); setResults([]); setSearchFor(null);
  }, [isOpen, initialDate, initialSlot, insteadOfPlan]);

  useEffect(() => () => recognition.current?.abort(), []);

  // Catalogue search, debounced.
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return undefined; }
    const timer = setTimeout(() => {
      api.searchFoods(query.trim()).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const plannedMeal = plannedDay?.date === date ? plannedDay?.[slot] : null;

  const toggleListening = () => {
    if (listening) { recognition.current?.stop(); return; }
    const rec = new SpeechRecognition();
    rec.lang = speechLang;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const said = Array.from(event.results).map(r => r[0].transcript).join(' ');
      setText(prev => (prev ? `${prev}, ${said}` : said));
    };
    rec.onerror = (event) => setError(event.error === 'not-allowed' ? 'Allow microphone access to speak your meal.' : 'Could not hear that. Try again or type it.');
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setError('');
    setListening(true);
    rec.start();
  };

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const parse = async () => {
    setParsing(true);
    setError('');
    try {
      const input = mode === 'photo' ? { image: photo } : { text };
      const result = await api.parseFood(input);
      if (!result.isFood || !result.items.length) {
        setError(mode === 'photo' ? "We couldn't see any food in that photo." : "We couldn't find any food in that. Try naming the dishes.");
        return;
      }
      setRows(result.items.map(r => newRow({ dish: r.dish, confidence: r.confidence, item: r.item, alternatives: r.alternatives, quantity: r.quantity, unit: r.unit })));
      setSource(result.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  // Recalculate one row's nutrition on the server after a change of food or portion.
  const updateRow = async (key, change) => {
    const row = rows.find(r => r.key === key);
    const next = {
      kind: row.item?.kind,
      refId: row.item?.refId,
      quantity: row.item?.quantity ?? row.quantity ?? 1,
      unit: row.item?.unit ?? row.unit ?? 'serving',
      ...change,
    };
    if (!(Number(next.quantity) > 0)) return;
    try {
      const { items } = await api.resolveFoodItems([next]);
      const resolved = items[0] || (await api.resolveFoodItems([{ ...next, quantity: 1, unit: 'serving' }])).items[0];
      if (resolved) setRows(current => current.map(r => (r.key === key ? { ...r, item: resolved } : r)));
    } catch (err) {
      setError(err.message);
    }
  };

  const chooseEntry = (key, entry) => {
    if (key === 'new') {
      const row = newRow({ dish: entry.name, confidence: 1, item: null, alternatives: [] });
      setRows(current => [...current, row]);
      api.resolveFoodItems([{ kind: entry.kind, refId: entry.refId, quantity: 1, unit: 'serving' }])
        .then(({ items }) => setRows(current => current.map(r => (r.key === row.key ? { ...r, item: items[0] } : r))));
    } else {
      // Keep the portion when it suits the new food; the server falls back to one serving.
      setRows(current => current.map(r => (r.key === key ? { ...r, confidence: 1 } : r)));
      updateRow(key, { kind: entry.kind, refId: entry.refId });
    }
    setSearchFor(null);
    setQuery('');
  };

  const removeRow = (key) => setRows(current => current.filter(r => r.key !== key));

  const ready = rows.filter(r => r.item);
  const totals = ready.reduce((sum, r) => ({
    kcal: sum.kcal + r.item.nutrition.kcal,
    protein: sum.protein + r.item.nutrition.protein,
    carbs: sum.carbs + r.item.nutrition.carbs,
    fat: sum.fat + r.item.nutrition.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const unmatched = rows.length - ready.length;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const items = ready.map(r => ({ kind: r.item.kind, refId: r.item.refId, quantity: r.item.quantity, unit: r.item.unit }));
      const saved = await api.saveFoodLog({ date, slot, source, items });
      if (instead && plannedMeal) markMealCompliance(date, slot, 'other');
      notifyFoodLogChanged(date);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tab = (value, Icon, text) => (
    <button
      key={value}
      onClick={() => { setMode(value); setError(''); }}
      className={`btn btn--sm ${mode === value ? 'btn--primary' : 'btn--ghost'}`}
      style={{ boxShadow: 'none' }}
    >
      <Icon style={{ width: '1rem', height: '1rem' }} />{text}
    </button>
  );

  const searchBox = (forKey) => (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--color-text-muted)' }} />
        <input
          autoFocus
          className="field"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Search dishes and foods, e.g. paneer, poha, banana"
          value={query}
          onChange={e => { setQuery(e.target.value); setSearchFor(forKey); }}
        />
      </div>
      {searchFor === forKey && results.length > 0 && (
        <div style={{ marginTop: '0.375rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {results.map(entry => (
            <button
              key={`${entry.kind}:${entry.refId}`}
              onClick={() => chooseEntry(forKey, entry)}
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0.5rem 0.75rem', background: 'var(--color-surface)', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}
            >
              <span>{entry.name}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{entry.portion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(10% 0.02 152 / 0.55)', backdropFilter: 'blur(4px)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log food"
        style={{ position: 'relative', width: '100%', maxWidth: '40rem', maxHeight: '92vh', overflowY: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0 }}>Log food</h2>
          <button onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Close"><X style={{ width: '1.1rem', height: '1.1rem' }} /></button>
        </div>

        {/* Step 1: describe, photograph or search */}
        {rows.length === 0 && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {tab('text', Keyboard, 'Describe')}
              {tab('photo', Camera, 'Photo')}
              {tab('search', Search, 'Search')}
            </div>

            {mode === 'text' && (
              <div>
                <textarea
                  className="field"
                  rows={3}
                  maxLength={500}
                  placeholder="2 roti, 1 katori dal, thoda chawal aur salad"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {SpeechRecognition && (
                    <>
                      <button onClick={toggleListening} className={`btn btn--sm ${listening ? 'btn--primary' : 'btn--secondary'}`}>
                        {listening ? <MicOff style={{ width: '1rem', height: '1rem' }} /> : <Mic style={{ width: '1rem', height: '1rem' }} />}
                        {listening ? 'Stop' : 'Speak'}
                      </button>
                      <select className="field" value={speechLang} onChange={e => setSpeechLang(e.target.value)} style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: 'var(--text-sm)' }} aria-label="Speech language">
                        <option value="hi-IN">Hindi / Hinglish</option>
                        <option value="en-IN">English (India)</option>
                      </select>
                    </>
                  )}
                  <span style={muted}>English, Hindi or Hinglish all work.</span>
                </div>
              </div>
            )}

            {mode === 'photo' && (
              <div>
                <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={choosePhoto} style={{ display: 'none' }} />
                {photo ? (
                  <div style={{ position: 'relative' }}>
                    <img src={photo} alt="Your meal" style={{ width: '100%', maxHeight: '18rem', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    <button onClick={() => fileInput.current.click()} className="btn btn--secondary btn--sm" style={{ position: 'absolute', right: '0.5rem', bottom: '0.5rem' }}>Change photo</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInput.current.click()}
                    style={{ width: '100%', padding: '2.5rem 1rem', border: '2px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}
                  >
                    <Camera style={{ width: '2rem', height: '2rem', color: 'var(--color-brand)' }} />
                    <span style={{ fontWeight: 600 }}>Take or choose a photo of your plate</span>
                    <span style={muted}>A thali works best photographed from above.</span>
                  </button>
                )}
              </div>
            )}

            {mode === 'search' && searchBox('new')}

            {mode !== 'search' && (
              <button
                onClick={parse}
                disabled={parsing || (mode === 'text' ? !text.trim() : !photo)}
                className="btn btn--primary"
                style={{ width: '100%', marginTop: '1rem', opacity: parsing || (mode === 'text' ? !text.trim() : !photo) ? 0.6 : 1 }}
              >
                {parsing
                  ? <><LoaderCircle style={{ width: '1.1rem', height: '1.1rem', animation: 'spin-slow 0.8s linear infinite' }} />Finding dishes…</>
                  : <><Sparkles style={{ width: '1.1rem', height: '1.1rem' }} />Find dishes</>}
              </button>
            )}
            <p style={{ ...muted, fontSize: 'var(--text-xs)', marginTop: '0.75rem', marginBottom: 0 }}>
              AI (Google Gemini) only recognises the dishes and portions; calories and nutrients come from NutriPlan's food database (IFCT 2017). Only your text or photo is sent.
            </p>
          </>
        )}

        {/* Step 2: confirm and adjust */}
        {rows.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rows.map(row => (
                <div key={row.key} style={{ padding: '0.875rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: `1px solid ${row.item && row.confidence >= 0.6 ? 'var(--color-border)' : 'var(--color-warning)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {row.item ? (
                        <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.item.name}</div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-ui)', fontWeight: 600, color: 'var(--color-warning)' }}>
                          <CircleAlert style={{ width: '1rem', height: '1rem' }} />Not in our food list: “{row.dish}”
                        </div>
                      )}
                      {row.item && row.dish.toLowerCase() !== row.item.name.toLowerCase() && (
                        <div style={{ ...muted, fontSize: 'var(--text-xs)' }}>
                          from “{row.dish}”{row.confidence < 0.6 && ' · please check this match'}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeRow(row.key)} className="btn btn--ghost btn--sm" aria-label={`Remove ${row.item?.name || row.dish}`} style={{ padding: '0.25rem' }}>
                      <Trash2 style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>

                  {row.item && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        className="field"
                        min="0.25"
                        step={['g', 'ml'].includes(row.item.unit) ? 10 : 0.5}
                        value={row.item.quantity}
                        onChange={e => updateRow(row.key, { quantity: Number(e.target.value) })}
                        style={{ width: '5.5rem', padding: '0.35rem 0.6rem' }}
                        aria-label="Amount"
                      />
                      <select
                        className="field"
                        value={row.item.unit}
                        onChange={e => updateRow(row.key, { unit: e.target.value })}
                        style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
                        aria-label="Unit"
                      >
                        {row.item.unitOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span className="tabular" style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {Math.round(row.item.nutrition.kcal)} kcal
                      </span>
                      <span className="tabular" style={muted}>{Math.round(row.item.nutrition.protein)} g protein</span>
                    </div>
                  )}
                  {row.item?.approximate && <div style={{ ...muted, fontSize: 'var(--text-xs)', marginTop: '0.375rem' }}>Approximate portion for this unit.</div>}

                  {(row.alternatives?.length > 0 || !row.item) && (
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.625rem', alignItems: 'center' }}>
                      {row.alternatives.length > 0 && <span style={{ ...muted, fontSize: 'var(--text-xs)' }}>{row.item ? 'Or:' : 'Did you mean:'}</span>}
                      {row.alternatives.map(alt => (
                        <button key={`${alt.kind}:${alt.refId}`} onClick={() => chooseEntry(row.key, alt)} className="badge badge--brand" style={{ border: 'none', cursor: 'pointer' }}>
                          {alt.name}
                        </button>
                      ))}
                      <button onClick={() => { setSearchFor(row.key); setQuery(''); }} className="badge" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                        <Search style={{ width: '0.75rem', height: '0.75rem' }} />Search
                      </button>
                    </div>
                  )}
                  {searchFor === row.key && searchBox(row.key)}
                </div>
              ))}
            </div>

            {searchFor === 'new' ? searchBox('new') : (
              <button onClick={() => { setSearchFor('new'); setQuery(''); }} className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }}>
                <Plus style={{ width: '1rem', height: '1rem' }} />Add another item
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={label}>Meal</span>
                <select className="field" value={slot} onChange={e => setSlot(e.target.value)}>
                  {SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={label}>Date</span>
                <input type="date" className="field" value={date} max={localDateString()} onChange={e => setDate(e.target.value)} />
              </label>
            </div>
            {plannedMeal && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={instead} onChange={e => setInstead(e.target.checked)} />
                I ate this instead of my planned {slot} ({plannedMeal.name})
              </label>
            )}
          </>
        )}

        {error && (
          <div role="alert" style={{ marginTop: '1rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'oklch(52% 0.19 22 / 0.1)', color: 'var(--color-error)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)' }}>{Math.round(totals.kcal)} kcal</div>
              <div className="tabular" style={muted}>
                P {Math.round(totals.protein)} g · C {Math.round(totals.carbs)} g · F {Math.round(totals.fat)} g
                {unmatched > 0 && ` · ${unmatched} item${unmatched > 1 ? 's' : ''} not counted`}
              </div>
            </div>
            <button onClick={() => setRows([])} className="btn btn--ghost">Start over</button>
            <button onClick={save} disabled={saving || !ready.length} className="btn btn--primary" style={{ opacity: saving || !ready.length ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save to log'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodLogModal;
