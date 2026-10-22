# NutriPlan: competitor research and roadmap to a unique product

## Context

NutriPlan is a React + Express + Prisma (SQLite) diet planner. The user asked what it lacks compared with similar products, and which **major** features would make it unique.

Decisions from the user:
- **Audience: India-first.**
- **AI: Gemini API (the user's key, free tier).**
- **Goal: a portfolio / college project.** So we favour features that are impressive, demonstrable and technically substantial, and skip payments and app-store release.

**Outcome:** a phased roadmap.
- **Phase 0** makes the app's existing promises true.
- **Phases 1–3** add eight features that, taken together, no single competitor offers.

---

## 1. Where NutriPlan stands today (verified in the code)

The core problem is that the landing page promises much more than the app does.

| Area | Reality |
|---|---|
| **Recipe data** | 7,062 recipes, but 6,997 come from a synthetic CSV: 56 dish names repeated, with random macros and incoherent ingredient lists. `import-csv-recipes.js` compared against `'true'` while the CSV says `True`, so **all 6,997 are tagged non_veg with `allergens: []`**. Vegetarians get only 8–16 real recipes per meal slot. The allergy filter misses dairy, wheat, egg, fish and shellfish in thousands of recipes. No Bengali, Gujarati or Maharashtrian recipes exist, although onboarding offers them. The food DB files (`src/data/foods/*.json`) are empty. |
| **Onboarding** | 7 collected fields are ignored by the planner: `targetRate`, `cuisines`, `cookingSkill`, `dislikedFoods`, `budget`, `region`, `mealPrepPreference`. |
| **"AI" assistant** | `AIDietAssistantPage.jsx` matches keywords to fixed templates, with a fake typing delay. Goal names don't match (`lose`/`gain` vs `cut`/`bulk`). `ml-model/` is empty. |
| **Plan Library** | 6 of 8 plans produce identical maintenance targets, because `tdee.js` and `macros.js` only understand cut/bulk/maintain. |
| **Logging** | You can only tick planned meals eaten/skipped. There's no way to log food you actually ate. "Consumed" is the planned macros. |
| **Targets** | Fixed. Logging weight doesn't change targets, although the landing page claims adaptive targets. |
| **Health conditions** | 7 keyword warnings and 3 medication rules, warnings only. There's no sodium, sugar or GI data to apply real limits. |
| **Shopping** | Raw recipe quantities, not scaled to portions or household. The ₹ estimate is computed but never shown. |
| **Data storage** | Compliance, swaps, custom recipes, pantry and streaks live only in the browser. The `/api/compliance` endpoints are unused. |
| **Absent** | Food logging, photo logging, family profiles, fasting/religious diets, real prices, notifications, multi-language, PWA. |

**What already works and can be reused:**
- Mifflin-St Jeor BMR/TDEE: `src/utils/calculations/bmr.js`, `tdee.js`
- Constraint-aware recipe scoring and cuisine rotation: `src/services/mealPlanGenerator.js` (`findBestRecipe`), `src/utils/cuisineRotation.js`
- Allergy filtering: `src/utils/constraints/allergyChecker.js`
- Weight-trend maths: `src/utils/progressCalculations.js`
- Streaks: `src/services/streakService.js`
- Shopping-list parsing and categories: `src/services/shoppingListGenerator.js`
- Auth and email codes: `server/index.js`

## 2. What the competitor research shows

| Product | What it's known for | Gap NutriPlan can exploit |
|---|---|---|
| **Healthify (India)** | AI coach Ria, photo logging (Snap, ~10k dishes), CGM bundles, human coaches | Built around one individual and a coach. No family planning. Core AI is paid (~₹999/mo per one review). |
| **MacroFactor** | **Adaptive TDEE** from weight trend and intake | Western foods. No meal planning for Indian kitchens. No free tier. |
| **Cronometer** | 80–95 micronutrients, accurate data | Tracker, not a planner. Fixed targets. |
| **MyFitnessPal** | Huge crowdsourced database (14M+) | Inconsistent entries. Fixed targets. Logging fatigue. |
| **Eat This Much** | Auto meal plans to calorie/macro targets | "A calculator, not a conversation." Repetitive. Western recipes. |
| **sugar.fit, Fitelo** | Diabetes / thyroid programs with coaches | Coach-led and condition-specific. Not a general family planner. |
| **SuperCook and similar** | Cook from what's in the pantry | No nutrition targets. |

**Main reasons users quit diet apps** (vendor blogs, so treat as indicative):
1. Manual logging takes too long.
2. Untrustworthy food data.
3. Rigid plans that break when life changes.
4. Too much setup.
5. Saved recipes from Instagram or YouTube can't be imported.

**Unmet India-specific needs** (no product found covering them together):
- One meal cooked for the whole family, with different needs per person.
- Jain, Sattvic, Navratri, Ekadashi, Ramadan and other fasting rules.
- Plans that fit a ₹ budget.
- Following the ICMR-NIN 2024 Dietary Guidelines ("My Plate": at least 8 food groups, cereals ≤45% of energy, ≤5 g salt).
- Using real Indian food-composition data (IFCT 2017).

**There is no public cart API for Blinkit, Zepto or Instamart.** Only Instacart has a recipe-to-cart API, and it isn't available in India. So the plan doesn't depend on grocery ordering.

## 3. Positioning: what makes NutriPlan unique

> **"The nutrition planner built for the Indian kitchen."** One shared menu for the whole family with portions sized for each person. It respects fasts and festivals, fits a ₹ budget, follows the ICMR-NIN guidelines, uses government Indian food data, and adjusts to your real weight trend. An AI coach can log a thali from a photo and replan your week when you ask in Hinglish.

| Capability | Healthify | MacroFactor | Eat This Much | **NutriPlan target** |
|---|---|---|---|---|
| Indian dishes with nutrition calculated from IFCT data | partial | ✗ | ✗ | ✓ |
| One menu for the family with per-person portions | ✗ | ✗ | ✗ | ✓ |
| Fasting and religious diets (Jain, Navratri, Ekadashi, Ramadan) | ✗ | ✗ | ✗ | ✓ |
| Plans built to a ₹ budget, plus protein-per-₹ | ✗ | ✗ | partial | ✓ |
| Adaptive calorie targets | coach-based | ✓ | ✗ | ✓ |
| Photo and Hinglish logging | ✓ (paid) | ✗ | ✗ | ✓ (free tier) |
| AI that changes your plan (not just chat) | partial | ✗ | ✗ | ✓ |
| ICMR My Plate score and condition limits | partial | ✗ | ✗ | ✓ |

Competitor cells are based on public information and reviews; check them before using this table in a presentation.

---

## 4. Roadmap

### Phase 0: Foundation (required, because every later feature depends on it)

#### F0.1 Trustworthy Indian food and recipe database

**Remove the bad data:**
- Delete the 6,997 synthetic recipes and `import-csv-recipes.js`.
- Delete the empty `src/data/foods/*.json`, `healthConditions.json` and other empty data files.

**New Prisma tables:**
- `Food`: about 500 raw foods seeded from IFCT 2017 (the `ifct2017` npm package, or the NIN tables). Fields: energy, protein, carbs, fat, fibre, sugar, sodium, iron, calcium, vitamin C, B12, folate, and GI where a published value exists.
- `HouseholdMeasure`: katori, roti, tbsp, cup, piece, mapped to grams per food.
- `Recipe` and `RecipeIngredient` (foodId, grams), with a cooking-yield factor.

**All recipe numbers are calculated, never typed:**
- Nutrition = Σ (grams × food composition).
- Allergens come from an ingredient → allergen map. This fixes the allergy filter for good.
- Diet flags (veg, vegan, Jain-safe, no-onion-garlic, vrat-safe, halal) also come from the ingredients.
- Glycaemic load and cost (see F5) are calculated the same way.

**Curate 200–300 real Indian recipes:**
- Cover each region offered in onboarding: North, South, Bengali, Gujarati, Maharashtrian, coastal, plus everyday staples.
- Gemini may draft ingredient lists in a one-off authoring script (`server/scripts/draft-recipes.js`). A person then reviews them before they're seeded.
- The open Indian Nutrient Databank has 1,014 recipes. **Its licence isn't clear**, so check it before importing anything from it.

**Serve recipes from the API:**
- Move recipes out of the 8 MB frontend bundle into `GET /api/recipes` with search and filters (cuisine, diet, time, kcal and protein range, cost, allergens).
- `RecipePage.jsx` and `MealSwapModal.jsx` use the API.

#### F0.2 Make every onboarding answer count, and keep state on the server

**Wire the ignored fields into the planner:**
- `cuisines` and `region`: preference bonus in scoring.
- `cookingSkill`: cap on difficulty and cooking time.
- `dislikedFoods`: exclude by ingredient (matched to `Food`).
- `targetRate`: deficit = rate × 7700 / 7, within safety limits.
- `budget`: see F5.
- `mealPrepPreference`: batch cooking, see F3.

**Fix the goal names:** use `cut` / `maintain` / `bulk` throughout `tdee.js`, `macros.js`, `PlanLibraryPage.jsx` and the assistant. Make the 8 plan archetypes really change targets: Low Carb → carbs ≤ 25%, High Protein → 1.6–2 g/kg, Budget → cost cap.

**Move the planner to the server:**
- Move `mealPlanGenerator.js` and `src/utils/constraints/*` into `server/engine/` and convert the server to ESM.
- The household planner (F3) and the coach's tools (F7) both need it there.
- Split `server/index.js` into `routes/` and `services/` modules.

**Store user data on the server:** compliance (wire up the existing endpoints), swaps, custom recipes, pantry, streaks, and a versioned plan.

**Honesty pass on `LandingPage.jsx`:** remove "94% success", "clinically validated" and "4-layer AI" until they're true.

### Phase 1: Core differentiators

#### F1 "Snap your thali" and Hinglish food logging (Gemini)

> **Status: built** (see [PHASE1_PLAN.md](PHASE1_PLAN.md)), except the PWA part.

**Why:** Manual logging is the top reason people quit. Photo logging is Healthify's flagship, and it's paid. NutriPlan can't log anything outside the plan today.

**What the user gets:**
- Log by photo, or by typing or speaking something like "2 roti, 1 katori dal, thoda chawal".
- Meals eaten out, and an "ate something else instead of the planned meal" option.
- A confirmation card where portions can be adjusted in katoris or pieces.

**How it works:**
- `POST /api/logs/parse` sends an image (resized in the browser to about 768 px) or text to Gemini Flash. It uses structured JSON output: `[{dish, candidates[], portion, unit, confidence}]`.
- The server matches each dish to a `Recipe` or `Food` and **calculates nutrition from the database**. Gemini never supplies the numbers.
- Voice uses the browser's Web Speech API (supports Hindi).
- New `FoodLog` table: userId, date, slot, items, source (`plan` / `photo` / `text` / `manual`), and nutrient totals.
- Ticking a planned meal "Eaten" writes a `FoodLog` entry.
- Insights and the Dashboard read real intake from `FoodLog`.

**Make it installable on a phone (PWA):** a manifest, a service worker, camera capture, and an offline view of today's plan.

#### F2 Adaptive targets engine (an algorithm, no LLM)

> **Status: built.** The weight change uses a least-squares line through the window's weigh-ins (the moving average lags with few weeks of data); the EMA trend is used for the chart and plateau detection. Check-ins run on demand when the user opens Progress or the Dashboard, at most one accepted per week.

**Why:** This is MacroFactor's flagship, the landing page already claims it, and it's a strong algorithm to demonstrate in a portfolio.

**How it works** (new `server/engine/adaptive.js`, a weekly job or run on demand):
- Smooth the weight trend with an exponential moving average.
- Average daily intake = from `FoodLog`.
- Observed TDEE = average intake − (Δ trend kg × 7700 / days).
- Blend the observed figure with the formula TDEE, weighting by how many days of data exist. Limit changes to ±150 kcal per week.
- Safety limits: minimum 1,200 kcal (women) / 1,500 kcal (men), and weight loss no faster than 1% per week. Detect plateaus.

**Weekly check-in screen:** "Your real maintenance is about 2,140 kcal (the formula said 1,971). New target: 1,690 kcal." Accepting it regenerates the remaining days of the plan. The Progress page shows a chart of the trend line vs actual weight.

**Reuse:** `src/utils/progressCalculations.js` (trend), `tdee.js` (the formula value).

#### F3 Household mode: "One kitchen, many plates"

**Why:** Indian families usually cook one meal for everyone. Global "household" features in other apps mostly just log a shared meal for several people. No Indian app found plans one shared menu with different portions for each person.

**New tables:** `Household` and `Member`. A member can be an app user or a dependent (a child or elderly parent) with their own profile, conditions and targets.

**Planner changes:**
- Choose **one shared dish per meal slot** that satisfies every member's hard constraints (all allergies combined).
- Where diets clash, allow a **per-member variant**: the same curry base with paneer for the vegetarian and chicken for others, or a vrat-safe plate for whoever is fasting.
- Each member's portion = their meal target ÷ recipe kcal, with condition-specific adjustments. For example, a diabetic member gets less rice and more dal and salad.
- **Batch cooking** (`mealPrepPreference`): cook once, eat twice. Tonight's extra dinner becomes tomorrow's lunch.
- One shopping list totalled across all members' portions. This also fixes the current unscaled quantities.

**Screens:** a household setup page, and a "family plate" card per meal showing each member's portion in katoris or rotis.

### Phase 2: India-specific intelligence

#### F4 Culture- and calendar-aware planning

**Diet modes:** Jain (no root vegetables, onion or garlic), Sattvic, no-onion-garlic, halal, eggetarian. Regional cuisines are weighted by the user's state.

**Fasting calendar:**
- A curated `festival-calendar-2026-27.json` covering both Navratris, Ekadashi (about 24 a year), Shravan Mondays, Karva Chauth and Ramadan.
- Users can also add their own weekly fast, such as every Tuesday.
- Users choose which fasts they observe.

**On fasting days, the planner:**
- Switches to the vrat-safe recipe pool: sabudana, kuttu, samak, makhana, fruit, dairy.
- Changes meal slots for Ramadan: sehri and iftar instead of breakfast, lunch and dinner, with calories redistributed.
- Keeps protein adequate.
- Flags high-GL fasting food for diabetic members.

**Why:** No app found handles all of these traditions together.

#### F5 ₹ budget-optimised planning and smart grocery

> **Status: built** (see [F5_PLAN.md](F5_PLAN.md)). DoCA's city-wise reports are behind a captcha and data.gov.in refused automated access, so DoCA all-India averages are used for tier-2 and metro adds an estimated 10%. Seasonality uses one national calendar. The budget compares the food the plan uses; the shop total (whole packs) is shown separately with the staples share.

**Prices:**
- An `IngredientPrice` table (₹/kg) with metro and tier-2 values.
- Seed it from public retail-price data, such as the Dept. of Consumer Affairs daily prices for essential items (check what's available), and fill gaps by hand.
- Seasonal produce flags by month and region.

**Planning to a budget:**
- Recipe cost = Σ grams × price.
- The weekly ₹ budget becomes a constraint in the planner: a penalty term, plus a repair step that swaps expensive meals for cheaper ones of similar nutrition.
- Show ₹ per day and per week, and **₹ per 10 g protein** (soya, dal and eggs vs paneer). This makes the Budget Friendly plan real.

**Shopping list:**
- Real quantities from structured ingredients, rounded to pack sizes you can buy (for example 500 g).
- A pantry with quantities and expiry dates.
- A "use it up first" mode that favours recipes using items about to expire.
- Share as text or WhatsApp. Don't rely on unofficial Blinkit or Zepto APIs.

**Replaces** the ad-hoc cost formula in `shoppingListGenerator.js`.

#### F6 Health-condition nutrition and ICMR My Plate score

**Turn condition warnings into numeric limits, using real nutrient data:**
- **Diabetes:** glycaemic-load cap per meal, carbs spread across meals, a minimum fibre target.
- **Hypertension:** sodium ≤ 2,000 mg/day (ICMR's 5 g salt).
- **PCOS:** low GL and enough protein.
- **Anaemia:** an iron target, pairing with vitamin C, and a "no tea with meals" tip.
- **Hypothyroidism:** timing notes for levothyroxine and soy.
- **Pregnancy:** extra calories from the ICMR RDA, plus foods to avoid.

**ICMR 2024 Plate Score:** a daily 0–100 score based on:
- food-group diversity (at least 8 groups)
- cereals ≤ 45% of energy
- the share of pulses, vegetables and fruit
- salt and added sugar

It appears on each day's card and as a weekly trend.

**Glucose response tracker** (optional, no device required):
- Log pre- and post-meal readings, or import a CSV from a glucometer or CGM app.
- Readings are linked to `FoodLog`, to show "your 5 meals that spike most" and suggest personal swaps.

**Asian BMI cut-offs:** overweight from 23, obese from 25, in `BMITracker.jsx`.

Clear "not medical advice" wording throughout.

### Phase 3: AI layer (Gemini)

#### F7 An AI coach that uses your data and can act on your plan

> **Status: built** (see [F7_PLAN.md](F7_PLAN.md)), before F3. `replan_week` became `replan_days` with two modes: `eat_out` (travel, no kitchen: calorie budgets per meal; too few no-cook recipes exist to plan home meals) and `fresh`. Household context will be added with F3. Meals already eaten are locked. Gemini 503s fall back to a second model.

This replaces the canned `AIDietAssistantPage.jsx`.

**How it works:**
- `POST /api/coach/chat` is server-side only, so the API key is never sent to the browser.
- The server builds a compact context: profile, targets, today's log, the plan, 2-week trends, conditions and household.
- **Gemini function calling** through these tools:
  - `get_plan`
  - `swap_meal`
  - `log_food`
  - `rebalance_day` (e.g. "wedding tonight", "ate out")
  - `replan_week` (e.g. "travelling, no kitchen")
  - `explain_target`
- Every tool goes through the deterministic engine and constraint checks: allergies, diet, fasting and budget. The coach **shows a before/after for the user to confirm** before anything is saved.
- The LLM never makes up nutrition numbers.

**Extras:**
- Replies in Hinglish, Hindi or English, matching the user.
- A weekly check-in summary written from F2's numbers.
- Conversations saved in a `CoachMessage` table.

**Safety:**
- Refuse to diagnose.
- Flag dangerously low targets or eating-disorder language and point to professional help.

#### F8 Import recipes from anywhere

**Why:** Indians save a lot of recipes from YouTube and Instagram, and reviews call apps that can't import screenshots "screenshot blind".

**How it works:**
- Paste a link (YouTube, Instagram or blog) or upload a screenshot. Gemini extracts the title, ingredients with quantities, and steps as structured output.
- Ingredients are matched to `Food`, so nutrition, allergens, diet flags and cost are all calculated.
- For YouTube, use the video description or transcript where available.
- The result becomes a custom recipe (stored on the server) that the planner, swaps and household mode can all use.
- The custom-recipe form gets automatic nutrition and allergens.

---

## 5. Shared technical design

**Gemini service:** `server/services/gemini.js`
- Uses the `@google/genai` SDK. `GEMINI_API_KEY` and `GEMINI_MODEL` go in `server/.env`, set to a current free-tier Flash model. Don't hard-code the model name.
- Structured output always uses a response schema.
- Retries with backoff on 429 errors.
- A per-user daily quota table.
- Caches identical text parses.

**Free-tier budget:**
- Reports of the limits vary, roughly 10 requests per minute and about 1,000–1,500 per day for Flash models.
- That's fine for a demo. Design for one call per action and no streaming loops.

**Privacy:**
- Check Google's free-tier data-use terms.
- Send no names or emails to Gemini, only the data the request needs.
- Add a privacy note in Settings.

**Engine:**
- All maths in `server/engine/`: planner, adaptive engine, cost, plate score, constraints. It's pure and deterministic, so it can be tested.
- **Add Vitest unit tests** for these modules. That's portfolio value, and there are no tests today.

**Schema additions:** `Food`, `HouseholdMeasure`, `Recipe`, `RecipeIngredient`, `IngredientPrice`, `FoodLog`, `Household`, `Member`, `FastingObservance`, `GlucoseReading`, `CoachMessage`, `AiUsage`. The profile becomes structured columns instead of one JSON string where the engine queries it.

**Critical files:**
- `server/prisma/schema.prisma`
- `server/index.js` (split into routes)
- `src/services/mealPlanGenerator.js` (moves to `server/engine/planner.js`)
- `src/utils/calculations/{tdee,macros}.js`
- `src/utils/constraints/*`
- `src/services/shoppingListGenerator.js`
- `src/pages/{AIDietAssistantPage,NutritionInsightsPage,ProgressPage,PlanLibraryPage,RecipePage,DashboardPage,LandingPage}.jsx`
- `src/components/onboarding/steps/*`
- `src/components/mealplan/*`
- `src/services/api.js`

## 6. Deliberately left out

- **Barcode scanning.** Indian packaged-food coverage is poor, and home-cooked food dominates.
- **Social feed.**
- **Wearable integrations.** These need native apps.
- **Payments.**
- **Unofficial grocery-cart APIs.**

None of these makes NutriPlan more distinctive, and each adds fragile work.

## 7. Suggested order and size

| Order | Feature | Size | Depends on |
|---|---|---|---|
| 1 | F0.1 Food and recipe database | L | none |
| 2 | F0.2 Onboarding fields, server state, engine on server | M | F0.1 |
| 3 | F1 Photo and Hinglish logging, PWA | M | F0.1 |
| 4 | F2 Adaptive targets | M | F1 |
| 5 | F3 Household mode | L | F0.2 |
| 6 | F5 Budget and grocery | M | F0.1 |
| 7 | F4 Culture and fasting calendar | M | F0.1, F3 |
| 8 | F6 Health conditions and Plate Score | M | F0.1, F1 |
| 9 | F7 AI coach with actions | L | F0.2, F1, F2 |
| 10 | F8 Recipe import | S–M | F0.1, Gemini service |

For a demo deadline, the most impressive subset is **F0.1, F1, F2, F3 and F7**.

## 8. Verification (for each feature as it's built)

**Engine unit tests (Vitest)** in `server/engine/__tests__`:
- planner respects allergies, diets, Jain and vrat rules, and budget
- daily kcal within ±5% of target
- adaptive TDEE on synthetic weight and intake series (including plateau and noisy data)
- household portions add up to the cooked amount
- Plate Score on known days
- recipe nutrition equals Σ of ingredients

**Data checks:**
- A seed script prints recipe counts per diet and meal slot. Aim for at least 30 per slot for vegetarians.
- Every recipe has computed allergens.
- No recipe has nutrition entered by hand.

**API smoke tests** like this session's scripts:
- run against a copy of the database with email disabled
- cover the logs, household, coach and recipes endpoints
- include authorisation checks: users can't read another household's data

**Gemini:**
- A fixture set of about 20 thali photos and Hinglish strings, with expected dishes, to measure match accuracy.
- Check the quota and 429 handling with a mocked client.

**Browser walk-through in the built-in browser:**
- onboarding, then create a household, then a plan with family plates
- photo log, then weekly check-in
- a coach request ("I'm at a wedding tonight"), then confirm the change
- import a YouTube recipe
- the shopping list with ₹ totals
- check the console has no errors

**Run:** `npm run build`, `npx eslint .` (no new errors), and `npm test` (new).

## 9. Research sources

- Meal-planning app comparisons: [MealThinker](https://mealthinker.com/blog/best-ai-meal-planning-apps-2026), [recipyapp](https://recipyapp.com/blog/best-ai-meal-planning-apps-2026), [fitness-reviewed](https://www.fitness-reviewed.com/categories/meal-planning-apps/)
- Healthify: [OpenAI case study](https://openai.com/index/healthify/), [pricing review](https://nutriscan.app/blog/posts/healthifyme-pricing-2026-india-plans-63a87b21d0), [Wikipedia](https://en.wikipedia.org/wiki/HealthifyMe)
- Trackers: [Cronometer vs MacroFactor](https://calorie-trackers.com/compare/cronometer-vs-macrofactor/), [MFP vs Cronometer vs MacroFactor](https://nutrola.app/en/blog/myfitnesspal-vs-cronometer-vs-macrofactor-2026)
- Why users quit: [macrite](https://macrite.app/blog/why-80-percent-quit-calorie-tracking), [cagoutte](https://www.cagoutte.app/en/blog/why-users-abandon-food-tracking-apps/), [organizeat (Reddit roundup)](https://home.organizeat.com/blog/meal-planner-app-reddit/)
- Family planning: [calorie trackers for families](https://calorie-trackers.com/calorie-tracker-for-families/), [MealFit Planner](https://apps.apple.com/app/id6759459724)
- Indian food data: [IFCT 2017 (NIN)](https://nin.res.in/ebooks/IFCT2017.pdf), [ifct2017 npm](https://www.npmjs.com/package/ifct2017), [INDB paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11277795)
- ICMR 2024 guidelines: [NutritionConnect summary](https://nutritionconnect.org/resource-center/dietary-guidelines-indians-2024-edition-icmr-nin), [Vision IAS](https://visionias.in/current-affairs/news-today/2024-05-11/society/indian-council-of-medical-research-icmr-released-17-dietary-guidelines-for-indians-dgis)
- Condition programs: [sugar.fit](https://www.sugarfit.com/diabetes-diet/)
- Fasting traditions: [Jain diet](https://www.manipalcigna.com/diet/jain-diet), [Navratri plans](https://www.medanta.org/patient-education-blog/fasting-with-flavor-tasty-and-nourishing-navratri-diet-plans)
- Grocery APIs: [Instacart Developer Platform](https://docs.instacart.com/developer_platform_api/)
- Pantry apps: [SuperCook](https://apps.apple.com/us/app/-/id1477747816)
- Gemini free tier: [limits roundup](https://klymentiev.com/blog/gemini-api-free-tier), [rate limits](https://tinkerllm.com/blog/gemini-api-free-tier-limits-rate-quotas/)
