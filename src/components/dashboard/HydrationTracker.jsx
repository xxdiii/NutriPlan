import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Minus } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const HydrationTracker = () => {
    const { isDark } = useTheme();
    const [hydration, setHydration] = useState(0);
    const [goal] = useState(2500); // 2.5L Default Goal
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHydration();
    }, []);

    const loadHydration = async () => {
        try {
            const today = new Date();
            const data = await api.getHydration(today);
            if (data) {
                setHydration(data.amount);
            }
        } catch (error) {
            console.error('Error loading hydration:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateHydration = async (amount) => {
        try {
            const newAmount = Math.max(0, hydration + amount);
            setHydration(newAmount); // Optimistic update

            const today = new Date();
            await api.updateHydration(today, newAmount);
        } catch (error) {
            console.error('Error updating hydration:', error);
            // Revert on error if needed, but for now simple optimistic is fine
        }
    };

    const percentage = Math.min((hydration / goal) * 100, 100);

    return (
        <div className={`p-6 rounded-2xl shadow-lg relative overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
            {/* Background Water/Wave Effect */}
            <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out opacity-20"
                style={{
                    height: `${percentage}%`,
                    background: 'linear-gradient(to top, #3b82f6, #60a5fa)'
                }}
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                        <Droplet className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Daily Goal: {goal}ml
                    </span>
                </div>

                <div className="text-center mb-6">
                    <h3 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {hydration} <span className="text-lg font-normal text-gray-500">ml</span>
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {Math.round(percentage)}% Hydrated
                    </p>
                </div>

                <div className="flex items-center justify-center space-x-4">
                    <button
                        onClick={() => updateHydration(-250)}
                        disabled={hydration <= 0}
                        className={`p-3 rounded-xl transition-colors ${isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                            }`}
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => updateHydration(250)}
                        className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add 250ml</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HydrationTracker;
