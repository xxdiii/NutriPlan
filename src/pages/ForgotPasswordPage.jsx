import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Mail, ArrowRight, ShieldCheck, Lock, Unlock, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

const ForgotPasswordPage = ({ setCurrentPage }) => {
    const { isDark } = useTheme();
    const [step, setStep] = useState(1); // 1 = Request, 2 = Reset
    
    // Form state
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const getPasswordStrength = (pass) => {
        let strength = 0;
        if (pass.length >= 8) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;
        return strength;
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await api.forgotPassword(email);
            if (res._status && res._status >= 400) {
                throw new Error(res.message || res.error || 'Failed to request password reset.');
            }
            setSuccessMessage(res.message || 'Reset code sent!');
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to request password reset.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (getPasswordStrength(newPassword) < 3) {
            setError('Please choose a stronger password.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.resetPassword(email, otpString, newPassword);
            if (res._status && res._status >= 400) {
                throw new Error(res.message || res.error || 'Failed to reset password.');
            }
            setSuccessMessage(res.message || 'Password reset successfully.');
            // Go to login page after brief delay
            setTimeout(() => {
                setCurrentPage('login');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password.');
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^[0-9]*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
            isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
            {/* Back button */}
            <button
                onClick={() => setCurrentPage('login')}
                className={`absolute top-8 left-8 p-3 rounded-full flex items-center space-x-2 transition-all ${
                    isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium whitespace-nowrap">Back to Login</span>
            </button>

            <div className="w-full max-w-md">
                <div className={`p-8 rounded-3xl shadow-xl border backdrop-blur-sm ${
                    isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-100'
                }`}>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 transform transition-transform hover:scale-105">
                            {step === 1 ? (
                                <Unlock className="w-8 h-8 text-white" />
                            ) : (
                                <ShieldCheck className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h1 className={`text-3xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                        </h1>
                        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                            {step === 1 
                                ? "Enter your email and we'll send you a reset code."
                                : "Enter the 6-digit code sent to your email and choose a new password."}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start space-x-3">
                            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-medium text-center">
                            {successMessage}
                        </div>
                    )}

                    {/* Step 1: Request Email */}
                    {step === 1 && (
                        <form onSubmit={handleRequestReset} className="space-y-6">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className={`w-5 h-5 transition-colors ${
                                            isDark ? 'text-gray-500 group-focus-within:text-emerald-400' : 'text-gray-400 group-focus-within:text-emerald-600'
                                        }`} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all duration-200 outline-none ${
                                            isDark 
                                                ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800 focus:ring-4 focus:ring-emerald-500/10' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10'
                                        }`}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <span>{isLoading ? 'Sending...' : 'Send Reset Code'}</span>
                                {!isLoading && (
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Reset Password */}
                    {step === 2 && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div>
                                <label className={`block text-sm font-medium mb-3 text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Verification Code
                                </label>
                                <div className="flex justify-center gap-2 mb-6">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none ${
                                                isDark
                                                    ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                                    : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        New Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className={`w-5 h-5 transition-colors ${
                                                isDark ? 'text-gray-500 group-focus-within:text-emerald-400' : 'text-gray-400 group-focus-within:text-emerald-600'
                                            }`} />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all duration-200 outline-none ${
                                                isDark 
                                                    ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white'
                                            }`}
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    
                                    {/* Password Strength Indicator */}
                                    {newPassword && (
                                        <div className="mt-3">
                                            <div className="flex gap-2 h-1.5 mb-2">
                                                {[1, 2, 3, 4].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`flex-1 rounded-full transition-colors duration-300 ${
                                                            passwordStrength >= level
                                                                ? passwordStrength < 3
                                                                    ? 'bg-amber-500' // Weak/Fair
                                                                    : 'bg-emerald-500' // Good/Strong
                                                                : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs ${
                                                passwordStrength < 3 
                                                    ? 'text-amber-500' 
                                                    : 'text-emerald-500'
                                            }`}>
                                                {passwordStrength === 0 && 'Very Weak'}
                                                {passwordStrength === 1 && 'Weak'}
                                                {passwordStrength === 2 && 'Fair'}
                                                {passwordStrength === 3 && 'Good'}
                                                {passwordStrength === 4 && 'Strong'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className={`w-5 h-5 transition-colors ${
                                                isDark ? 'text-gray-500 group-focus-within:text-emerald-400' : 'text-gray-400 group-focus-within:text-emerald-600'
                                            }`} />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all duration-200 outline-none ${
                                                isDark 
                                                    ? 'bg-gray-900/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white'
                                            }`}
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.join('').length !== 6 || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 3}
                                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <span>{isLoading ? 'Resetting...' : 'Reset Password'}</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
