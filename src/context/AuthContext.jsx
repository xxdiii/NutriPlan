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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentAppPage');
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
