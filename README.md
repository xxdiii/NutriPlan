# 🥗 NutriPlan - Smart Diet & Meal Planning App

NutriPlan is a full-stack web app that builds weekly Indian meal plans around your calorie and macro targets, diet, allergies, health conditions, region and budget, and tracks your weight, water and meals.

## ✨ Features

- **Indian meal plans**: 192 recipes from Punjabi, South Indian, Bengali, Gujarati, Maharashtrian, Goan, Odia and everyday kitchens. Lunch and dinner are a main plus a staple ("1¾ katori sambar + ½ katori samai rice"); every day lands within about ±5% of your calorie target.
- **Nutrition from real data**: each recipe's calories, macros, fibre, sodium, iron, glycaemic load, allergens, diet type and cost are *calculated* from ingredient weights using the Indian Food Composition Tables 2017 (ICMR-NIN). Nothing is typed in by hand.
- **Personalised**: diet (vegan to non-veg), allergies, disliked foods, cooking skill, region, budget, household size and batch cooking all change the plan. Diabetes, PCOS, blood pressure, thyroid, IBS and a few medications add warnings on the meals they affect.
- **Targets**: Mifflin-St Jeor with your chosen weekly rate, a safe calorie floor, pregnancy/breastfeeding adjustments and macro profiles (balanced, high protein, low carb).
- **Swaps**: swap any meal; the replacement is re-portioned to the same calories.
- **Food logging by photo, text or voice**: snap your thali or type/speak "2 roti, 1 katori dal, thoda chawal" in English, Hindi or Hinglish. Google Gemini only recognises the dishes and portions; NutriPlan matches them to its food database and *calculates* the nutrition. A confirmation card lets you fix any dish or portion (katori, piece, bowl, glass, grams). Ticking a planned meal as eaten logs it too, and "Ate other" records what you ate instead.
- **Adaptive targets**: a weekly check-in estimates your real maintenance calories from your food log and weight trend (energy balance, blended with the formula by how much data you have). Changes are capped at ±150 kcal a week, never below 1,200/1,500 kcal or faster than 1% body weight loss a week; accepting rebuilds the rest of the week's plan. The weight chart shows the smoothed trend.
- **Tracking**: meal compliance and streaks, real intake from the food log, weight chart with trend and BMI, hydration. All of it is saved on the server, so it follows you across devices.
- **AI coach that acts on your plan**: ask in English, Hindi or Hinglish ("shaadi hai aaj raat", "travelling this weekend, no kitchen", "swap tomorrow's lunch for something with paneer", "2 samose aur chai li"). Gemini reads your plan, log and targets through tools and *proposes* changes that the planner computes (eating-out calorie budgets, lighter meals around an event, swaps, food logs); you see a before/after card and nothing is saved until you tap Apply. Meals already eaten are never changed. It won't diagnose, can't lower your targets, and answers crisis or disordered-eating messages with care and helpline details.
- **₹ budget planning**: set a weekly food budget for the household (or use your budget level) and Metro or Tier-2 prices. Recipe costs are calculated from ingredient weights at your prices; staples use the government's DoCA all-India retail prices, out-of-season produce costs more, and the planner swaps the priciest meals for cheaper ones with similar calories and protein until the week fits. A "protein for your money" panel compares ₹ per 10 g protein (dal and soya vs paneer).
- **Smart shopping list**: quantities for your household rounded to packs you can buy (2 × 500 g dal, a tray of 12 eggs), what's left over, ₹ for what you buy, out-of-season flags, and share by WhatsApp or the share sheet.
- **Pantry**: what you have, with optional amounts and expiry dates; the shopping list subtracts it and new plans use items about to expire first.
- **Recipes**: browse and filter, favourite, and add your own recipes (with allergen tags).
- **Auth**: email + password with captcha, 6-digit email verification and password reset; unverified accounts can't log in.
- **Dark mode**, responsive UI.

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), Tailwind CSS, Recharts, Lucide icons, jsPDF
- **Backend**: Node.js + Express (ES modules), Prisma ORM, SQLite, JWT
- **Tests**: Vitest (engine and target calculations)

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+

### 1. Clone
```bash
git clone https://github.com/xxdiii/NutriPlan.git
cd NutriPlan
```

### 2. Backend
```bash
cd server
npm install
```

Create `server/.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="a-long-random-string"
# Email (for verification and password reset codes). For Gmail use an App Password.
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="you@gmail.com"
SMTP_PASS="your-app-password"
# Food logging (free key from Google AI Studio)
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-3.1-flash-lite"
# Optional: used when the main model is overloaded (default gemini-2.5-flash)
GEMINI_FALLBACK_MODEL="gemini-2.5-flash"
# Optional: AI requests (logs and coach messages) per user per day (default 60)
GEMINI_DAILY_LIMIT="60"
```

Create the database, load the food and recipe data, and start the API:
```bash
npx prisma db push
npm run seed
npm start
```
The API runs on http://localhost:3000. Re-run `npm run seed` whenever you edit `server/data/`.

### 3. Frontend
In a second terminal, from the project root:
```bash
npm install
npm run dev
```
The app opens at http://localhost:5173.

### Tests
```bash
cd server
npm test
```

## 📂 Project Structure

```
├── shared/targets.js        # Calorie/macro targets, used by browser and server
├── server/
│   ├── index.js             # Express app
│   ├── routes/              # auth, profile, meal-plan, recipes, tracking, favorites, user-data, logs, adaptive, coach, pantry
│   ├── services/            # gemini.js, coach.js + coachTools.js (AI coach), foodLogs.js, recipes.js
│   ├── engine/              # planner, nutrition, constraints, shopping, foodMatch, adaptive, coachActions, cost, budget (pure, tested)
│   ├── data/                # foods.js (ingredients), recipes/ (192 planned + 8 log-only recipes), ifct-foods.json, prices.js, packs.js
│   ├── scripts/             # seed.js, extract-ifct.js
│   └── prisma/schema.prisma
└── src/                     # React app (pages, components, services)
```

## 🔌 API Endpoints (all but auth need a Bearer token)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/captcha` | Get a captcha |
| `POST` | `/api/auth/register`, `/login`, `/verify-email`, `/resend-otp`, `/forgot-password`, `/reset-password` | Account flows |
| `GET/POST` | `/api/profile` | Read/save profile (targets recomputed on save) |
| `GET` | `/api/meal-plan` | Latest plan |
| `POST` | `/api/meal-plan/generate` | Generate and save a new weekly plan |
| `GET` | `/api/meal-plan/alternatives` | Swap options for a meal (`date`, `slot`) |
| `POST` | `/api/meal-plan/swap` | Swap a meal |
| `GET` | `/api/meal-plan/shopping-list` | Shopping list: packs to buy, pantry status, ₹, budget, protein for money, share text |
| `GET/PUT/DELETE` | `/api/pantry[/:foodId]` | Pantry items (`grams` optional, `expiresOn`) |
| `GET` | `/api/pantry/search` | Search all ingredients (`q`) |
| `POST` | `/api/pantry/import` | Import the old name-only pantry |
| `GET` | `/api/recipes` | Browse recipes (`q`, `meal`, `diet`, `cuisine`, `maxTime`) |
| `POST/PUT/DELETE` | `/api/recipes/custom[/:id]` | Your own recipes |
| `GET/POST` | `/api/compliance[/:date]` | Meal tracking |
| `GET/POST/DELETE` | `/api/weight-logs[/:id]` | Weight history |
| `GET/POST` | `/api/hydration[/:date]` | Water intake |
| `GET/POST/DELETE` | `/api/favorites[/:recipeId]` | Favourite recipes |
| `GET/PUT` | `/api/user-data[/:key]` | Pantry, shopping ticks, streak badges |
| `POST` | `/api/logs/parse` | Recognise dishes in `{ text }` or `{ image }` (Gemini) and match them to the food database |
| `GET` | `/api/logs/search` | Search dishes and foods (`q`) |
| `POST` | `/api/logs/resolve` | Nutrition for items and portions |
| `GET/POST/DELETE` | `/api/logs[/:id]` | Food log (`from`, `to`); nutrition is recalculated on save |
| `GET` | `/api/logs/summary` | Daily intake totals (`from`, `to`) |
| `GET` | `/api/adaptive/check-in` | Weekly adaptive-target check-in (`today`) |
| `POST` | `/api/adaptive/accept`, `/reset` | Use the new target (and replan the rest of the week), or go back to the formula |
| `GET` | `/api/adaptive/history` | Past check-ins |
| `GET/DELETE` | `/api/coach/messages` | Coach conversation |
| `POST` | `/api/coach/chat` | Send a message (`message`, `today`); replies may carry proposed changes |
| `POST` | `/api/coach/messages/:id/proposals/:index/apply`, `/dismiss` | Apply or dismiss a proposed change |

## 📊 Data Sources

- Food logging and the coach: only the text or photo you send (and, for the coach, a summary of your plan, log and targets) goes to Google Gemini, never your name or email. Gemini's free tier may use inputs to improve Google's products, so don't log anything private.
- Nutrient values: *Indian Food Composition Tables 2017*, ICMR-National Institute of Nutrition (Longvah et al.). Foods IFCT doesn't cover (curd, oats, sabudana, bread, ...) use USDA FoodData Central values; the source is recorded per food in `server/data/foods.js`.
- Prices: all-India average retail prices for 16 staples from the Dept. of Consumer Affairs Price Monitoring Cell (fcainfoweb.nic.in, 22 Oct 2026); metro prices add an estimated 10%. Other ingredient prices, tier-2 discounts and the seasonal calendar are estimates, and every price row records its source.
- Glycaemic index values are estimates; the app says so where they are shown.
- NutriPlan is for information only and is not medical advice.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
