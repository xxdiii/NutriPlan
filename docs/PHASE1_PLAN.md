# Phase 1 build plan: F1 food logging, F2 adaptive targets

Scope: F1 (photo + Hinglish text/voice logging) and F2 (adaptive calorie targets) from
[ROADMAP.md](ROADMAP.md). The PWA part of F1 is left for a follow-up.

## Ground rules

- **Gemini only names dishes and portions.** It never returns calories or macros. Every
  number comes from `Recipe` / `Food` rows (IFCT 2017 based), scaled by the portion.
- The server recomputes nutrition on save; the browser only previews it.
- All maths lives in `server/engine/` as pure functions with Vitest tests.
- The API key stays on the server (`GEMINI_API_KEY`, `GEMINI_MODEL` in `server/.env`).

## F1: food logging

### Data
- `FoodLog`: userId, date (YYYY-MM-DD), slot, source (`plan` | `photo` | `text` | `manual`),
  items (JSON: kind, refId, name, quantity, unit, servings/grams, per-item nutrition),
  totals (kcal, protein, carbs, fat, fibre, sugar, sodium), note, createdAt.
- `AiUsage`: userId + date + count, for a per-user daily Gemini quota.
- A few log-only recipes people often eat but the planner should not plan (chai, coffee,
  samosa, vada pav, ...). They use `meals: []`, so the planner never picks them.

### Server
- `server/services/gemini.js`: `@google/genai`, model from env, JSON response schema,
  retry with backoff on 429/503, per-user daily quota, in-memory cache for identical text.
  Output: `[{ dish, english, candidates[], quantity, unit, confidence }]`.
- `server/engine/foodMatch.js` (pure):
  - Loggable catalogue = all recipes + ready-to-eat foods (fruit, dairy, nuts, egg, ...).
  - Hinglish alias table (chawal→rice, dahi→curd, anda→egg, roti/chapati/phulka, ...).
  - Token + character-bigram scoring over the dish, its English name and the candidates;
    returns the best match plus up to 4 alternatives, or "unmatched".
  - Portion → servings: count units (roti, idli, dosa, piece) divide by the serving's
    count; containers convert through katori-equivalents (bowl, plate, glass, cup, tbsp);
    raw foods convert to grams through their household unit or standard volumes.
  - `itemNutrition(entry, quantity, unit)` = per-serving (or per-100 g) values × amount.
- `server/routes/logs.js`:
  - `POST /api/logs/parse` `{ text }` or `{ image, mimeType }` → matched items with
    per-unit nutrition and unit options, for the confirmation card.
  - `GET /api/logs/search?q=` → catalogue matches without AI (manual add / replace).
  - `POST /api/logs` → saves; nutrition recomputed from the database.
  - `GET /api/logs?from&to`, `GET /api/logs/summary?from&to` (per-day totals), `DELETE /api/logs/:id`.
- Plan meals: when compliance marks a slot **eaten**, the compliance route writes a `plan`
  FoodLog from that day's planned meal; un-marking removes it. A new status `other`
  ("ate something else") is used when a logged meal replaces the planned one.

### Browser
- `FoodLogModal`: Text tab (with a mic button using the Web Speech API, `hi-IN` / `en-IN`)
  and Photo tab (camera/file, resized to ~768 px JPEG in a canvas). Slot + date pickers,
  "instead of the planned meal" toggle.
- Confirmation card: per item, the matched dish (switchable to alternatives or a manual
  search), quantity stepper + unit picker, kcal/protein preview, confidence badge, remove.
- Dashboard: "Log food" button, today's log list, and consumed totals from `FoodLog`.
  Meal plan view and Nutrition Insights also read real intake from the logs.

## F2: adaptive targets

### Engine: `server/engine/adaptive.js` (pure)
- Weight trend: exponential moving average per day (gap-aware smoothing).
- Window: last 21 days. A day counts as logged if it has ≥ 2 meal slots logged.
- Observed TDEE = average logged intake − (Δ trend kg × 7700 / days), sanity-clamped.
- Blend with the formula TDEE, weighted by data (logged days and weigh-in span).
- New target from the blended TDEE and the user's goal, limited to ±150 kcal per check-in,
  never below 1,200 (women) / 1,500 (men), and never planning loss faster than 1 % of body
  weight per week. Plateau detection for cuts (trend flat for 14+ days with good logging).
- Not enough data → keeps the formula and says what is missing.

### Server
- `shared/targets.js`: accepts an adaptive TDEE from the profile (`profile.adaptive.tdee`)
  and applies the 1 %/week loss cap.
- `CheckIn` table: date, formula / observed / applied TDEE, old and new target, accepted.
- `GET /api/adaptive/check-in` → proposal (not saved); `POST /api/adaptive/accept` → saves
  the adaptive TDEE, recomputes targets and regenerates the remaining days of the current
  plan; `POST /api/adaptive/reset` → back to the formula; `GET /api/adaptive/history`.

### Browser
- Weekly check-in card on Progress (and a banner on the Dashboard when one is due):
  "Your real maintenance is about 2,140 kcal (the formula said 1,971). New target: 1,690."
- Weight chart shows the trend line over the raw weigh-ins.

## Verification
- Vitest: food matching (Hinglish strings, portions), nutrition = DB × portion, adaptive
  engine on synthetic series (steady loss, plateau, noisy data, little data, caps, floors),
  Gemini service with a mocked client (schema handling, 429 retry, quota).
- API smoke test on a copy of the database: parse (live Gemini), save, summary, compliance
  → plan log, check-in, accept, authorisation (can't delete another user's log).
- Browser walk-through: text log, photo log, plan "Eaten", dashboard totals, check-in.
- `npm run build`, `npx eslint .` (no new errors), `npm test`.
