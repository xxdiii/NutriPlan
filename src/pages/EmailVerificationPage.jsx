import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Mail, ShieldCheck, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';

const RESEND_COOLDOWN = 60; // seconds

const EmailVerificationPage = ({ setCurrentPage }) => {
    const { verifyEmail } = useAuth();
    const { isDark } = useTheme();

    const [email] = useState(() => sessionStorage.getItem('pendingVerificationEmail') || '');
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
    const [resendMsg, setResendMsg] = useState('');

    const inputRefs = useRef([]);

    // Countdown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // If no email is in session, go back to register
    useEffect(() => {
        if (!email) setCurrentPage('register');
    }, [email, setCurrentPage]);

    const focusNext = (index) => {
        if (index < 5) inputRefs.current[index + 1]?.focus();
    };

    const focusPrev = (index) => {
        if (index > 0) inputRefs.current[index - 1]?.focus();
    };

    const handleDigitChange = (index, value) => {
        // Accept only digits
        const cleaned = value.replace(/\D/g, '').slice(-1);
        const updated = [...digits];
        updated[index] = cleaned;
        setDigits(updated);
        setError('');
        if (cleaned) focusNext(index);
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index]) focusPrev(index);
        if (e.key === 'ArrowLeft') focusPrev(index);
        if (e.key === 'ArrowRight') focusNext(index);
    };

    // Handle paste of full OTP code
    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const updated = ['', '', '', '', '', ''];
        for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
        setDigits(updated);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const otp = digits.join('');
        if (otp.length < 6) {
            setError('Please enter all 6 digits of the verification code.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await verifyEmail(email, otp);
            if (result.success) {
                setSuccess(true);
                sessionStorage.removeItem('pendingVerificationEmail');
                setTimeout(() => setCurrentPage('onboarding'), 1800);
            } else {
                setError(result.error || 'Invalid code. Please try again.');
                // Shake animation: clear digits on wrong code
                setDigits(['', '', '', '', '', '']);
                setTimeout(() => inputRefs.current[0]?.focus(), 50);
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        setResendMsg('');
        setError('');
        try {
            await api.resendOtp(email);
            setResendMsg('A new code has been sent to your email.');
            setCooldown(RESEND_COOLDOWN);
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } catch {
            setError('Failed to resend. Please try again shortly.');
        } finally {
            setResending(false);
        }
    };

    // Colors
    const bg = isDark ? 'oklch(14% 0.018 152)' : 'oklch(97% 0.008 152)';
    const cardBg = isDark ? 'oklch(18% 0.022 152)' : '#ffffff';
    const cardBorder = isDark ? 'oklch(28% 0.03 152)' : 'oklch(88% 0.018 152)';
    const textPrimary = isDark ? 'oklch(94% 0.012 152)' : 'oklch(14% 0.02 152)';
    const textMuted = isDark ? 'oklch(55% 0.018 152)' : 'oklch(52% 0.02 152)';
    const inputBg = isDark ? 'oklch(22% 0.025 152)' : 'oklch(97% 0.006 152)';
    const inputBorder = isDark ? 'oklch(32% 0.035 152)' : 'oklch(84% 0.02 152)';
    const inputFocusBorder = 'var(--color-brand)';
    const errorColor = isDark ? 'oklch(72% 0.18 22)' : 'oklch(42% 0.2 22)';
    const errorBg = isDark ? 'oklch(22% 0.06 22)' : 'oklch(97% 0.04 22)';

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                    animation: 'scale-in 0.5s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    <div style={{
                        width: '5rem', height: '5rem', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #0d9488)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 0 10px oklch(52% 0.15 152 / 0.12)',
                    }}>
                        <CheckCircle size={36} color="white" strokeWidth={2.5} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-2xl)', color: textPrimary, margin: 0 }}>
                        Email Verified!
                    </h2>
                    <p style={{ fontFamily: 'var(--font-body)', color: textMuted, margin: 0 }}>
                        Taking you to setup your profile…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '1.5rem' }}>
            {/* Background dot grid */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                backgroundImage: `radial-gradient(circle, ${isDark ? 'oklch(44% 0.14 152 / 0.07)' : 'oklch(44% 0.14 152 / 0.05)'} 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
            }} />

            <div style={{
                width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1,
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '1.5rem',
                padding: 'clamp(1.75rem, 5vw, 2.5rem)',
                boxShadow: isDark
                    ? '0 32px 64px oklch(5% 0.01 152 / 0.6)'
                    : '0 32px 64px oklch(18% 0.02 152 / 0.1)',
                animation: 'scale-in 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Back button */}
                <button
                    onClick={() => setCurrentPage('register')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        background: 'none', border: 'none', padding: '0.25rem 0',
                        color: textMuted, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)',
                        cursor: 'pointer', marginBottom: '1.5rem', transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand)'}
                    onMouseLeave={e => e.currentTarget.style.color = textMuted}
                >
                    <ArrowLeft size={15} strokeWidth={2.5} />
                    Back to Sign Up
                </button>

                {/* Icon */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '3.25rem', height: '3.25rem', borderRadius: '1rem',
                        background: 'linear-gradient(135deg, oklch(52% 0.16 152), oklch(48% 0.18 185))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px oklch(52% 0.15 152 / 0.35)',
                        marginBottom: '1.25rem',
                    }}>
                        <ShieldCheck size={24} color="white" strokeWidth={2} />
                    </div>

                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700,
                        fontSize: 'var(--text-2xl)', letterSpacing: '-0.03em',
                        color: textPrimary, margin: '0 0 0.5rem 0',
                    }}>
                        Verify your email
                    </h1>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: textMuted, margin: 0, lineHeight: 1.6 }}>
                        We sent a 6-digit code to{' '}
                        <span style={{ fontWeight: 600, color: 'var(--color-brand)' }}>{email}</span>.
                        Check your inbox (and spam folder).
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div role="alert" style={{
                        padding: '0.75rem 1rem', marginBottom: '1.25rem',
                        background: errorBg, border: `1px solid ${isDark ? 'oklch(35% 0.1 22)' : 'oklch(82% 0.1 22)'}`,
                        borderRadius: 'var(--radius-md)',
                        color: errorColor, fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500,
                        animation: 'shake 0.35s cubic-bezier(0.36,.07,.19,.97)',
                    }}>
                        {error}
                    </div>
                )}

                {/* Resend success */}
                {resendMsg && !error && (
                    <div style={{
                        padding: '0.75rem 1rem', marginBottom: '1.25rem',
                        background: isDark ? 'oklch(22% 0.06 152)' : 'oklch(96% 0.04 152)',
                        border: `1px solid ${isDark ? 'oklch(35% 0.1 152)' : 'oklch(78% 0.1 152)'}`,
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-brand)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <Mail size={14} strokeWidth={2.5} /> {resendMsg}
                    </div>
                )}

                {/* OTP digit inputs */}
                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', marginBottom: '1.75rem' }}
                         onPaste={handlePaste}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={el => inputRefs.current[i] = el}
                                id={`otp-digit-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                onChange={e => handleDigitChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                autoFocus={i === 0}
                                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                style={{
                                    width: 'clamp(40px, 12vw, 52px)',
                                    height: 'clamp(48px, 14vw, 62px)',
                                    textAlign: 'center',
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-display)',
                                    letterSpacing: '0.02em',
                                    background: inputBg,
                                    border: `2px solid ${d ? 'var(--color-brand)' : inputBorder}`,
                                    borderRadius: '0.75rem',
                                    color: textPrimary,
                                    outline: 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
                                    boxShadow: d ? '0 0 0 3px oklch(52% 0.15 152 / 0.18)' : 'none',
                                    transform: d ? 'scale(1.05)' : 'scale(1)',
                                    caretColor: 'var(--color-brand)',
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = 'var(--color-brand)';
                                    e.target.style.boxShadow = '0 0 0 3px oklch(52% 0.15 152 / 0.18)';
                                }}
                                onBlur={e => {
                                    if (!digits[i]) {
                                        e.target.style.borderColor = inputBorder;
                                        e.target.style.boxShadow = 'none';
                                    }
                                }}
                            />
                        ))}
                    </div>

                    <button
                        id="verify-submit"
                        type="submit"
                        disabled={loading || digits.join('').length < 6}
                        style={{
                            width: '100%', padding: '0.8125rem',
                            background: loading || digits.join('').length < 6
                                ? (isDark ? 'oklch(28% 0.025 152)' : 'oklch(88% 0.012 152)')
                                : 'linear-gradient(135deg, #10b981, #0d9488)',
                            border: 'none', borderRadius: '0.875rem',
                            color: loading || digits.join('').length < 6 ? textMuted : 'white',
                            fontFamily: 'var(--font-ui)', fontWeight: 700,
                            fontSize: 'var(--text-base)', cursor: loading || digits.join('').length < 6 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.2s',
                            boxShadow: digits.join('').length === 6 && !loading
                                ? '0 8px 20px oklch(52% 0.15 152 / 0.4)' : 'none',
                            transform: digits.join('').length === 6 && !loading ? 'translateY(-1px)' : 'none',
                        }}
                    >
                        {loading ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin-slow 0.8s linear infinite' }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Verifying…
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={16} strokeWidth={2.5} />
                                Verify Email
                            </>
                        )}
                    </button>
                </form>

                {/* Resend section */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: textMuted, margin: '0 0 0.5rem 0' }}>
                        Didn't receive a code?
                    </p>
                    <button
                        onClick={handleResend}
                        disabled={cooldown > 0 || resending}
                        style={{
                            background: 'none', border: 'none', padding: '0.25rem 0.5rem',
                            fontFamily: 'var(--font-ui)', fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                            color: cooldown > 0 ? textMuted : 'var(--color-brand)',
                            cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            transition: 'opacity 0.2s',
                            opacity: cooldown > 0 ? 0.55 : 1,
                        }}
                    >
                        <RefreshCw size={13} strokeWidth={2.5} style={{ animation: resending ? 'spin-slow 0.8s linear infinite' : 'none' }} />
                        {cooldown > 0
                            ? `Resend in ${cooldown}s`
                            : resending ? 'Sending…' : 'Resend code'}
                    </button>
                </div>
            </div>

            {/* Shake keyframe (inline — only if not already in global CSS) */}
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translateX(-2px); }
                    20%, 80% { transform: translateX(4px); }
                    30%, 50%, 70% { transform: translateX(-6px); }
                    40%, 60% { transform: translateX(6px); }
                }
            `}</style>
        </div>
    );
};

export default EmailVerificationPage;
