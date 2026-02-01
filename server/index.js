require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Routes ---

// 1. Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                profile: '{}' // Empty profile initially
            }
        });

        // Generate Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        // Generate Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Profile (Protected)
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.sendStatus(404);
        res.json(JSON.parse(user.profile));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profile', authenticateToken, async (req, res) => {
    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { profile: JSON.stringify(req.body) }
        });
        res.json(JSON.parse(updatedUser.profile));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Meal Plan (Protected)
app.get('/api/meal-plan', authenticateToken, async (req, res) => {
    try {
        const plan = await prisma.mealPlan.findFirst({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        if (plan) {
            res.json({
                ...JSON.parse(plan.planData),
                metadata: { startDate: plan.startDate, endDate: plan.endDate }
            });
        } else {
            // Return 204 or 404. returning null is safer for frontend check.
            res.json(null);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/meal-plan', authenticateToken, async (req, res) => {
    try {
        const planData = req.body;
        const startDate = new Date();
        const endDate = new Date(); // TODO: Calculate actual end date based on plan length

        await prisma.mealPlan.create({
            data: {
                userId: req.user.id,
                startDate: startDate,
                endDate: endDate,
                planData: JSON.stringify(planData)
            }
        });

        res.json({ success: true, message: 'Meal plan saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Compliance (Protected)
app.get('/api/compliance/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const record = await prisma.compliance.findUnique({
            where: {
                userId_date: {
                    userId: req.user.id,
                    date: date
                }
            }
        });

        if (record) {
            res.json(JSON.parse(record.meals));
        } else {
            res.json({
                meals: { breakfast: null, lunch: null, snack: null, dinner: null },
                date: date
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compliance', authenticateToken, async (req, res) => {
    try {
        const { date, meals } = req.body;
        const updated = await prisma.compliance.upsert({
            where: {
                userId_date: {
                    userId: req.user.id,
                    date: date
                }
            },
            update: {
                meals: JSON.stringify({ meals, date })
            },
            create: {
                userId: req.user.id,
                date: date,
                meals: JSON.stringify({ meals, date })
            }
        });

        res.json(JSON.parse(updated.meals));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Weight Logs (Protected)
app.get('/api/weight-logs', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.weightLog.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'asc' }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/weight-logs', authenticateToken, async (req, res) => {
    try {
        console.log('Received weight log request:', req.body);
        const { weight, date, notes } = req.body;
        console.log('Creating weight log:', { weight, date, notes, userId: req.user.id });
        const log = await prisma.weightLog.create({
            data: {
                userId: req.user.id,
                weight: parseFloat(weight),
                date: new Date(date),
                notes: notes || null
            }
        });
        console.log('Weight log created successfully:', log);
        res.json(log);
    } catch (error) {
        console.error('Error creating weight log:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/weight-logs/:id', authenticateToken, async (req, res) => {
    try {
        const logId = parseInt(req.params.id);
        // Verify the log belongs to the user before deleting
        const log = await prisma.weightLog.findFirst({
            where: {
                id: logId,
                userId: req.user.id
            }
        });

        if (!log) {
            return res.status(404).json({ error: 'Weight log not found' });
        }

        await prisma.weightLog.delete({
            where: { id: logId }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
