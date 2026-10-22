import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/user-data', userDataRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/coach', coachRoutes);
// Compliance, weight logs and hydration keep their original paths (/api/compliance, ...).
app.use('/api', trackingRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
