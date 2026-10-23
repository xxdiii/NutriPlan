import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { isProduction } from './lib/config.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import mealPlanRoutes from './routes/mealPlan.js';
import recipeRoutes from './routes/recipes.js';
import trackingRoutes from './routes/tracking.js';
import favoriteRoutes from './routes/favorites.js';
import userDataRoutes from './routes/userData.js';
import logRoutes from './routes/logs.js';
import adaptiveRoutes from './routes/adaptive.js';
import coachRoutes from './routes/coach.js';
import pantryRoutes from './routes/pantry.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Behind Render's proxy: lets Express see the real protocol and client address.
app.set('trust proxy', 1);
// In production the API and the app share one origin, so cross-origin requests are only
// allowed from origins listed in CORS_ORIGIN (comma-separated). Locally, Vite's dev server
// on another port is allowed.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins?.length ? corsOrigins : !isProduction }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/user-data', userDataRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/pantry', pantryRoutes);
// Compliance, weight logs and hydration keep their original paths (/api/compliance, ...).
app.use('/api', trackingRoutes);

app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

// The built React app (npm run build in the project root), served from the same origin.
// Every non-API path returns index.html so the app's own routing handles it.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
