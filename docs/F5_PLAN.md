# F5 build plan: ₹ budget planning and smart grocery

## Prices

- **Source:** the Dept. of Consumer Affairs Price Monitoring Cell publishes all-India
  average retail prices for 22 essentials (fcainfoweb.nic.in, read for 22 Oct 2026). Those
  are used directly for **tier-2 cities**; **metros** get a +10 % estimate (the DoCA
  centre-wise reports sit behind a captcha). Every other food keeps its documented metro
  estimate, with a tier-2 discount by food group. Each price records its source.
- `IngredientPrice` table (foodId, tier, ₹/kg, source, asOf), seeded from
  `server/data/prices.js`, so prices can be updated without code changes.
- **Seasonality:** a national month-by-month calendar for fresh vegetables and fruit;
  out-of-season produce costs more, so the budget logic naturally prefers what's in season.
- The user picks **Metro / Tier-2** pricing (profile `priceTier`, default metro).

## Planning to a budget

- Recipe cost = Σ ingredient grams × the user's price table (`engine/cost.js`), applied to
  recipes before planning, so every meal's `costInr` reflects the user's city and month.
- **Weekly budget:** `profile.weeklyBudget` (₹ for the household), or the onboarding level
  (₹100 / 200 / 400 per person per day).
- `engine/budget.js` `fitToBudget`: after the planner builds the week, a repair step swaps
  the meal with the best saving-per-nutrition-loss for a cheaper allowed recipe, portioned
  to the same calories, and rebalances that day. It repeats until the week fits or no
  saving is left, and never touches leftovers, eating-out meals or the user's constraints.
- **₹ per 10 g protein** for recipes and foods; a "best protein for your money" list
  (soya, dal, eggs, chana vs paneer, chicken) filtered to the user's diet.

## Smart grocery

- **Pack sizes** (`server/data/packs.js`): each food rounds up to packs you can buy
  (e.g. 2 × 500 g toor dal, a 12-egg tray). Loose produce rounds to 250 g. The list shows
  what you need, what to buy, the leftover, and the ₹ for what you buy.
- **Pantry** with quantity (optional) and expiry date, stored on the server
  (`PantryItem`). The shopping list subtracts it. The old name-only pantry is imported once.
- **Use it up first:** generating a plan favours recipes that use pantry items expiring
  within a few days, scheduled before they expire.
- **Share:** plain text by aisle, WhatsApp (`wa.me` link) and the system share sheet.

## UI

- Shopping page: budget card (plan cost vs budget, per day / per person, tier, weekly
  budget, "Rebuild to fit budget"), protein-for-money panel, pack-based list with pantry
  status and in-season tags, WhatsApp share, a pantry editor with quantities and expiry.
- Meal cards and the day summary show ₹ and ₹ per 10 g protein.

## Verification

- Vitest: price tiers and seasons, recipe cost = Σ ingredients, protein cost, pack choice,
  pantry subtraction, `fitToBudget` (fits when feasible, keeps calories ±5 % and all
  constraints, reports when it can't), use-it-up scheduling.
- API smoke test on a database copy; browser walk-through; build; lint (no new errors).
