import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, Trash2, Bell, Shield, HelpCircle, ChevronRight, LogOut } from 'lucide-react';

const SettingsPage = ({ setCurrentPage }) => {
    const { isDark, toggleTheme } = useTheme();
    const { logout } = useAuth();

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleLogout = () => {
        logout(); // This will clear all auth data and redirect to landing
    };

    const settingsSections = [
        {
            title: 'Appearance',
            items: [
                {
                    icon: isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-purple-600" />,
                    label: 'Dark Mode',
                    value: (
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-emerald-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    ),
                    type: 'toggle'
                }
            ]
        },
        {
            title: 'App Settings',
            items: [
                {
                    icon: <Bell className="w-5 h-5 text-blue-500" />,
                    label: 'Notifications',
                    value: 'On',
                    type: 'link'
                },
                {
                    icon: <Shield className="w-5 h-5 text-green-500" />,
                    label: 'Privacy & Security',
                    type: 'link'
                },
                {
                    icon: <Trash2 className="w-5 h-5 text-red-500" />,
                    label: 'Clear All Data',
                    onClick: handleClearData,
                    type: 'button',
                    textColor: 'text-red-500'
                }
            ]
        },
        {
            title: 'Support',
            items: [
                {
                    icon: <HelpCircle className="w-5 h-5 text-orange-500" />,
                    label: 'Help & Support',
                    type: 'link'
                },
                {
                    icon: <LogOut className="w-5 h-5 text-gray-500" />,
                    label: 'Log Out',
                    onClick: handleLogout,
                    type: 'button'
                }
            ]
        }
    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
            }`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 backdrop-blur-md border-b ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setCurrentPage('dashboard')}
                            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                                }`}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold">Settings</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="space-y-8">
                    {settingsSections.map((section, idx) => (
                        <div key={idx}>
                            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                {section.title}
                            </h2>
                            <div className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'
                                }`}>
                                {section.items.map((item, itemIdx) => (
                                    <div key={itemIdx}>
                                        <div
                                            className={`w-full px-4 py-4 flex items-center justify-between transition-colors ${item.onClick ? 'cursor-pointer hover:bg-black/5' : ''
                                                }`}
                                            onClick={item.onClick}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                    {item.icon}
                                                </div>
                                                <span className={`font-medium ${item.textColor || ''}`}>
                                                    {item.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                {item.value && (
                                                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                                        {item.value}
                                                    </span>
                                                )}
                                                {item.type === 'link' && (
                                                    <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                        </div>
                                        {itemIdx < section.items.length - 1 && (
                                            <div className={`mx-4 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        NutriPlan v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
