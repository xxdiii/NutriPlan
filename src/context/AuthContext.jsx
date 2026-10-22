import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { hydrateUserData, SYNCED_KEYS } from '../services/syncedStorage';

const AuthContext = createContext(null);

// Pull the user's synced data (meal tracking, pantry, ...) into localStorage.
// A failure only means this browser shows its cached copy.
const loadUserData = async (user) => {
    try {
        await hydrateUserData(user.id);
    } catch (error) {
        console.warn('Could not load synced user data', error);
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        const restore = async () => {
            if (token && savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    await loadUserData(parsed);
                    setUser(parsed);
                } catch (e) {
                    console.error('Failed to parse saved user', e);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        restore();
    }, []);

    const startSession = async (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        await loadUserData(data.user);
        setUser(data.user);
    };

    const login = async (email, password, captchaText, captchaToken) => {
        try {
            const data = await api.login(email, password, captchaText, captchaToken);
            if (data.requiresVerification) {
                return { success: false, requiresVerification: true, email: data.email, error: data.message };
            }
            if (data._status >= 400 || !data.token) {
                return { success: false, error: data.message || 'Invalid credentials.' };
            }
            await startSession(data);
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
            await startSession(data);
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
            await startSession(data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        // Clear the session and every cached copy of the user's data, so the next person
        // to log in on this browser doesn't see it. All of it is reloaded from the server
        // at the next login.
        [
            'token', 'user', 'currentAppPage', 'returnPage',
            'userProfile', 'weeklyMealPlan', 'weightLogs',
            ...Object.values(SYNCED_KEYS),
        ].forEach(key => localStorage.removeItem(key));
        Object.keys(localStorage)
            .filter(key => key.startsWith('hydration_') || key.startsWith('mealCompliance_'))
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
