import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, Mail, Lock, User, ArrowRight } from 'lucide-react';

const RegisterPage = ({ setCurrentPage }) => {
    const { register } = useAuth();
    const { isDark } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await register(name, email, password);
            if (result.success) {
                setCurrentPage('onboarding'); // Redirect to onboarding after register
            } else {
                setError(result.error || 'Registration failed. Email might be taken.');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                        <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Account</h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Join NutriPlan to start your journey</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-600 text-sm font-medium border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
                        <div className="relative">
                            <User className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</label>
                        <div className="relative">
                            <Mail className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-xl hover:scale-[1.02]'
                            }`}
                    >
                        <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Already have an account?{' '}
                        <button
                            onClick={() => setCurrentPage('login')}
                            className="font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
