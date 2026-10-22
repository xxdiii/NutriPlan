import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import svgCaptcha from 'svg-captcha';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/auth.js';
import { generateOTP, sendVerificationEmail, sendPasswordResetEmail } from '../lib/mailer.js';

const router = Router();

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

// Generate Captcha
router.get('/captcha', (req, res) => {
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

router.post('/register', async (req, res) => {
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
        await prisma.user.create({
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
router.post('/verify-email', async (req, res) => {
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
router.post('/resend-otp', async (req, res) => {
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
router.post('/forgot-password', async (req, res) => {
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
router.post('/reset-password', async (req, res) => {
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

router.post('/login', async (req, res) => {
    try {
        const { email, password, captchaText, captchaToken } = req.body;

        if (!captchaText || !captchaToken) {
            return res.status(400).json({ message: 'Captcha is required.' });
        }

        // Verify captcha
        let decoded;
        try {
            decoded = jwt.verify(captchaToken, JWT_SECRET);
        } catch {
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

export default router;
