# 🥗 NutriPlan - Smart Diet & Meal Planning App

NutriPlan is a full-stack web app that builds weekly Indian meal plans around your calorie and macro targets, diet, allergies, health conditions, region and budget, and tracks your weight, water and meals.

## ✨ Features

- **Indian meal plans**: 192 recipes from Punjabi, South Indian, Bengali, Gujarati, Maharashtrian, Goan, Odia and everyday kitchens. Lunch and dinner are a main plus a staple ("1¾ katori sambar + ½ katori samai rice"); every day lands within about ±5% of your calorie target.
- **Nutrition from real data**: each recipe's calories, macros, fibre, sodium, iron, glycaemic load, allergens, diet type and cost are *calculated* from ingredient weights using the Indian Food Composition Tables 2017 (ICMR-NIN). Nothing is typed in by hand.
- **Personalised**: diet (vegan to non-veg), allergies, disliked foods, cooking skill, region, budget, household size and batch cooking all change the plan. Diabetes, PCOS, blood pressure, thyroid, IBS and a few medications add warnings on the meals they affect.
- **Targets**: Mifflin-St Jeor with your chosen weekly rate, a safe calorie floor, pregnancy/breastfeeding adjustments and macro profiles (balanced, high protein, low carb).
- **Swaps**: swap any meal; the replacement is re-portioned to the same calories.
- **Tracking**: meal compliance and streaks, weight chart and BMI, hydration. All of it is saved on the server, so it follows you across devices.
- **Shopping list**: weekly quantities for your whole household grouped by aisle, with approximate ₹ costs, pantry mode and PDF/print/copy.
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
│   ├── routes/              # auth, profile, meal-plan, recipes, tracking, favorites, user-data
│   ├── engine/              # planner, nutrition, constraints, shopping (pure, tested)
│   ├── data/                # foods.js (ingredients), recipes/ (192 recipes), ifct-foods.json
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
| `GET` | `/api/meal-plan/shopping-list` | Shopping list with ₹ estimate |
| `GET` | `/api/recipes` | Browse recipes (`q`, `meal`, `diet`, `cuisine`, `maxTime`) |
| `POST/PUT/DELETE` | `/api/recipes/custom[/:id]` | Your own recipes |
| `GET/POST` | `/api/compliance[/:date]` | Meal tracking |
| `GET/POST/DELETE` | `/api/weight-logs[/:id]` | Weight history |
| `GET/POST` | `/api/hydration[/:date]` | Water intake |
| `GET/POST/DELETE` | `/api/favorites[/:recipeId]` | Favourite recipes |
| `GET/PUT` | `/api/user-data[/:key]` | Pantry, shopping ticks, streak badges |

## 📊 Data Sources

- Nutrient values: *Indian Food Composition Tables 2017*, ICMR-National Institute of Nutrition (Longvah et al.). Foods IFCT doesn't cover (curd, oats, sabudana, bread, ...) use USDA FoodData Central values; the source is recorded per food in `server/data/foods.js`.
- Glycaemic index values and ingredient prices are estimates; the app says so where they are shown.
- NutriPlan is for information only and is not medical advice.

## 🗺️ Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the research behind the next features (food logging by photo, adaptive calorie targets, household mode, fasting calendar, ₹ budget planning, AI coach).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
