import nodemailer from 'nodemailer';

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
export const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

/** Send verification OTP email */
export const sendVerificationEmail = async (email, name, otp) => {
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
export const sendPasswordResetEmail = async (email, name, otp) => {
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
