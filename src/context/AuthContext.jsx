import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse saved user', e);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, captchaText, captchaToken) => {
        try {
            const data = await api.login(email, password, captchaText, captchaToken);
            if (data.requiresVerification) {
                return { success: false, requiresVerification: true, email: data.email, error: data.message };
            }
            if (data._status >= 400 || !data.token) {
                return { success: false, error: data.message || 'Invalid credentials.' };
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (name, email, password) => {
        try {
            const data = await api.register(name, email, password);
            if (data.requiresVerification) {
                return { success: true, requiresVerification: true, email: data.email };
            }
            if (data._status >= 400) {
                return { success: false, error: data.message || 'Registration failed.' };
            }
            // Fallback: if server issues a token directly (legacy)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const verifyEmail = async (email, otp) => {
        try {
            const data = await api.verifyEmail(email, otp);
            if (data._status >= 400 || !data.token) {
                return { success: false, error: data.message || 'Verification failed.' };
            }
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        // Clear session data and any cached per-user data that isn't keyed by user id,
        // so the next person to log in on this browser doesn't see it.
        // (mealCompliance_<id> is user-scoped and local-only, so it is kept.)
        [
            'token', 'user', 'currentAppPage', 'returnPage',
            'userProfile', 'weeklyMealPlan', 'weightLogs', 'activePlanId',
            'shopping_checked_items', 'nutriplan_streak_meta',
        ].forEach(key => localStorage.removeItem(key));
        Object.keys(localStorage)
            .filter(key => key.startsWith('hydration_'))
            .forEach(key => localStorage.removeItem(key));
        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
