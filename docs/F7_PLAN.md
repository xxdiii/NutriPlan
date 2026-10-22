# F7 build plan: an AI coach that can act on your plan

Replaces the keyword-template `AIDietAssistantPage.jsx` with a Gemini coach that reads the
user's data and proposes changes through the deterministic engine. Nothing changes until
the user confirms a before/after card.

## Ground rules

- **The model never writes data or numbers.** It calls tools; tools run the planner,
  food matching and constraint checks. Calories, portions and budgets come from the engine.
- **Changes are proposals.** Proposing tools compute the new plan days or log entry and
  store them with the message; the user taps Apply (or Dismiss). Apply re-checks that the
  plan days have not changed since the proposal.
- **Server only.** `POST /api/coach/chat`; the key never reaches the browser. Only the data
  a request needs is sent (no name or email).
- **Safety.** No diagnosis; no target below the engine's floors (there is no tool that sets
  targets). Crisis language gets a fixed reply with helpline details without calling the
  model; eating-disorder language makes the model respond supportively and point to help.

## Tools (Gemini function calling)

Read-only, run immediately:
- `get_plan(start_date, days)`: meals, portions, kcal and protein per day.
- `get_food_log(date)`: what was logged and the totals against the target.
- `explain_target()`: formula vs adaptive TDEE, goal adjustment, macros, latest check-in,
  weight trend.
- `search_recipes(query, slot)`: recipes that fit the user's diet, allergies and dislikes.

Proposing (return a before/after card):
- `swap_meal(date, slot, recipe_query)`: replacement portioned to the same calories.
- `log_food(date, slot, items[{dish, quantity, unit}])`: matched to the catalogue (F1).
- `rebalance_day(date, slot, occasion)`: "wedding tonight": that meal becomes an
  eating-out calorie budget and the day's other meals are re-portioned lighter.
- `replan_days(start_date, end_date, mode)`: `eat_out` (travelling, no kitchen: every meal
  becomes a budget with ordering tips) or `fresh` (new recipes for those days).

## Pieces

- `server/engine/coachActions.js` (pure, tested): eating-out meals, event-day rebalancing,
  eat-out and fresh replans, recipe search for swaps, before/after diffs.
- `server/services/coach.js`: context builder, system prompt, tool loop (≤ 4 rounds),
  safety checks; shares retry and quota with `services/gemini.js`.
- `CoachMessage` table: role, content, proposals (JSON with status).
- `server/routes/coach.js`: `GET /messages`, `POST /chat`,
  `POST /messages/:id/proposals/:index/apply|dismiss`, `DELETE /messages`.
- Plan meals for eating out are flagged `eatingOut`; ticking them eaten does not auto-log
  a number (the user logs what they actually ate).
- `AIDietAssistantPage.jsx`: chat with history, suggestion chips, proposal cards.

## Verification

- Vitest: coach actions (budgets add up to the target, allergies respected in swaps and
  fresh replans, eat-out days have no shopping items), tool loop with a mocked Gemini client
  (function calls, proposals, read-only tools, crisis short-circuit, quota).
- Live API smoke test with Gemini: wedding tonight, travelling, swap, log, explain target,
  apply, stale proposal refused, another user's message refused.
- Browser walk-through; build; lint (no new errors).
