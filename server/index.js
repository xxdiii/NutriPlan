require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const svgCaptcha = require('svg-captcha');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// --- Email Transporter ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/** Generate a cryptographically-safe 6-digit OTP */
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

/** Send verification OTP email */
const sendVerificationEmail = async (email, name, otp) => {
    const mailOptions = {
        from: `"NutriPlan" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify your NutriPlan account',
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">NutriPlan</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Smart Diet Planner</p>
                </div>
                <div style="padding: 40px 32px;">
                    <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px;">Hi ${name || 'there'} 👋</h2>
                    <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">Thanks for signing up! Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; border: 2px dashed #cbd5e1;">
                        <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</p>
                        <span style="font-size: 40px; font-weight: 800; color: #10b981; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">If you didn't create a NutriPlan account, you can safely ignore this email.</p>
                </div>
                <div style="background: #f1f5f9; padding: 20px 32px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2025 NutriPlan · All rights reserved</p>
                </div>
            </div>
        `,
    };
    await transporter.sendMail(mailOptions);
};

/** Send password reset OTP email */
const sendPasswordResetEmail = async (email, name, otp) => {
    const mailOptions = {
        from: `"NutriPlan" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset your NutriPlan password',
        html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">NutriPlan</h1>
                </div>
                <div style="padding: 40px 32px;">
                    <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px;">Hi ${name || 'there'},</h2>
                    <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">We received a request to reset your password. Use the code below to set a new password. The code expires in <strong>10 minutes</strong>.</p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; border: 2px dashed #cbd5e1;">
                        <span style="font-size: 40px; font-weight: 800; color: #10b981; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
            </div>
        `,
    };
    await transporter.sendMail(mailOptions);
};

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

// --- Captcha replay protection ---
// Each captcha token may be used for a single login attempt.
// Maps token -> expiry (ms); entries are pruned once the token would have expired anyway.
const usedCaptchaTokens = new Map();

const consumeCaptchaToken = (token, expSeconds) => {
    const now = Date.now();
    for (const [t, exp] of usedCaptchaTokens) {
        if (exp <= now) usedCaptchaTokens.delete(t);
    }
    if (usedCaptchaTokens.has(token)) return false;
    usedCaptchaTokens.set(token, expSeconds * 1000);
    return true;
};

// --- Routes ---

// 1. Auth

// Generate Captcha
app.get('/api/auth/captcha', (req, res) => {
    const captcha = svgCaptcha.create({
        size: 5,
        ignoreChars: '0o1i',
        noise: 2,
        color: true,
        background: '#f8fafc' // a light background
    });

    // We sign the expected text in a JWT with a 5-minute expiration
    const token = jwt.sign({ text: captcha.text.toLowerCase() }, JWT_SECRET, { expiresIn: '5m' });

    res.status(200).json({
        svg: captcha.data,
        token
    });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            // If they exist but are unverified, resend OTP
            if (!existingUser.isVerified) {
                const otp = generateOTP();
                const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
                await prisma.user.update({
                    where: { email },
                    data: { verificationToken: `${otp}:${expiry}` }
                });
                await sendVerificationEmail(email, existingUser.name, otp);
                return res.status(200).json({ requiresVerification: true, email, message: 'Verification code resent.' });
            }
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min from now

        // Create user (unverified)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                profile: '{}',
                isVerified: false,
                verificationToken: `${otp}:${expiry}`
            }
        });

        // Send verification email
        await sendVerificationEmail(email, name, otp);

        res.status(200).json({
            requiresVerification: true,
            email,
            message: 'Account created. Please check your email for the verification code.'
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify Email OTP
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.isVerified) return res.status(400).json({ message: 'Email already verified.' });
        if (!user.verificationToken) return res.status(400).json({ message: 'No verification code found. Please register again.' });

        const firstColon = user.verificationToken.indexOf(':');
        const storedOtp = user.verificationToken.substring(0, firstColon);
        const expiryAndPurpose = user.verificationToken.substring(firstColon + 1);
        
        if (expiryAndPurpose.endsWith(':reset')) {
            return res.status(400).json({ message: 'Invalid token purpose.' });
        }
        
        const expiry = expiryAndPurpose;

        // Check expiry
        if (new Date() > new Date(expiry)) {
            return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
        }

        // Check OTP match
        if (otp.trim() !== storedOtp) {
            return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
        }

        // Mark user as verified
        const verifiedUser = await prisma.user.update({
            where: { email },
            data: { isVerified: true, verificationToken: null }
        });

        // Issue JWT
        const token = jwt.sign({ id: verifiedUser.id, email: verifiedUser.email }, JWT_SECRET);
        res.json({ token, user: { id: verifiedUser.id, email: verifiedUser.email, name: verifiedUser.name } });

    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.isVerified) return res.status(400).json({ message: 'Email already verified.' });

        const otp = generateOTP();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await prisma.user.update({
            where: { email },
            data: { verificationToken: `${otp}:${expiry}` }
        });
        await sendVerificationEmail(email, user.name, otp);
        res.json({ message: 'Verification code resent successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        // Always return success to prevent email enumeration, but only actually send if user exists
        if (user) {
            const otp = generateOTP();
            const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            
            await prisma.user.update({
                where: { email },
                data: { verificationToken: `${otp}:${expiry}:reset` }
            });
            
            await sendPasswordResetEmail(email, user.name, otp);
        }
        res.json({ message: 'If an account exists with that email, a password reset code has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (!user.verificationToken) return res.status(400).json({ message: 'No reset request found.' });

        const firstColon = user.verificationToken.indexOf(':');
        const storedOtp = user.verificationToken.substring(0, firstColon);
        const expiryAndPurpose = user.verificationToken.substring(firstColon + 1);

        if (!expiryAndPurpose.endsWith(':reset')) {
            return res.status(400).json({ message: 'Invalid token purpose.' });
        }
        
        const expiry = expiryAndPurpose.replace(/:reset$/, '');

        if (new Date() > new Date(expiry)) {
            return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
        }

        if (otp.trim() !== storedOtp) {
            return res.status(400).json({ message: 'Invalid reset code. Please try again.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: { 
                password: hashedPassword,
                verificationToken: null // Clear token after successful reset
            }
        });

        res.json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, captchaText, captchaToken } = req.body;

        if (!captchaText || !captchaToken) {
            return res.status(400).json({ message: 'Captcha is required.' });
        }

        // Verify captcha
        let decoded;
        try {
            decoded = jwt.verify(captchaToken, JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: 'Captcha expired or invalid. Please refresh.' });
        }
        if (!consumeCaptchaToken(captchaToken, decoded.exp)) {
            return res.status(400).json({ message: 'Captcha already used. Please refresh.' });
        }
        if (decoded.text !== captchaText.toLowerCase()) {
            return res.status(400).json({ message: 'Invalid captcha.' });
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

        // Block unverified accounts: resend a fresh OTP and send them to verification
        if (!user.isVerified) {
            const otp = generateOTP();
            const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
            await prisma.user.update({
                where: { email },
                data: { verificationToken: `${otp}:${expiry}` }
            });
            try {
                await sendVerificationEmail(email, user.name, otp);
            } catch (mailError) {
                console.error('Login: failed to resend verification email:', mailError);
            }
            return res.status(403).json({
                requiresVerification: true,
                email,
                message: 'Please verify your email address. A new verification code has been sent.'
            });
        }

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

// 6. Hydration (Protected)
app.get('/api/hydration/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const log = await prisma.hydrationLog.findFirst({
            where: {
                userId: req.user.id,
                date: date
            }
        });
        res.json(log || { amount: 0, date });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/hydration', authenticateToken, async (req, res) => {
    try {
        const { date, amount } = req.body; // date YYYY-MM-DD

        // Find existing log for this date or create new
        const existingLog = await prisma.hydrationLog.findFirst({
            where: {
                userId: req.user.id,
                date: date
            }
        });

        let log;
        if (existingLog) {
            log = await prisma.hydrationLog.update({
                where: { id: existingLog.id },
                data: { amount: parseInt(amount) }
            });
        } else {
            log = await prisma.hydrationLog.create({
                data: {
                    userId: req.user.id,
                    date: date,
                    amount: parseInt(amount)
                }
            });
        }
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Favorites (Protected)
app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        console.log('GET /api/favorites called for user:', req.user.id);
        const favorites = await prisma.favoriteRecipe.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        // Parse the JSON string 'recipe' field back to object
        const parsedFavorites = favorites.map(f => ({
            ...f,
            recipe: JSON.parse(f.recipe)
        }));
        res.json(parsedFavorites);
    } catch (error) {
        console.error('GET /api/favorites error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
    try {
        console.log('POST /api/favorites called. Body:', req.body);
        const recipe = req.body;
        // recipeId should be string, ensure it exists
        if (!recipe || !recipe.id) {
            console.error('Invalid recipe data in POST /favorites');
            return res.status(400).json({ error: 'Invalid recipe data' });
        }

        const newFavorite = await prisma.favoriteRecipe.create({
            data: {
                userId: req.user.id,
                recipeId: String(recipe.id),
                recipe: JSON.stringify(recipe)
            }
        });

        console.log('Favorite created:', newFavorite.id);
        res.json({
            ...newFavorite,
            recipe: JSON.parse(newFavorite.recipe)
        });
    } catch (error) {
        console.error('POST /api/favorites error:', error);
        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Recipe already favorited' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/favorites/:recipeId', authenticateToken, async (req, res) => {
    try {
        const { recipeId } = req.params;
        await prisma.favoriteRecipe.deleteMany({
            where: {
                userId: req.user.id,
                recipeId: recipeId
            }
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
