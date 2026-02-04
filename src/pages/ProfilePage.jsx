import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
    ArrowLeft, User, Ruler, Weight, Calendar, Activity, Save, X, Edit2,
    Heart, AlertCircle, Pill, Leaf, Globe, ChefHat, ThumbsDown, DollarSign, MapPin, Package, Info
} from 'lucide-react';
import { calculateTDEE, calculateTargetCalories } from '../utils/calculations/tdee';
import { calculateMacros } from '../utils/calculations/macros';
import { createAndSaveMealPlan } from '../services/mealPlanGenerator';
import {
    BUDGET_RANGES, INDIAN_STATES, HEALTH_CONDITIONS, ALLERGENS, DIETARY_PREFERENCES, CUISINES, ACTIVITY_LEVELS, GOALS
} from '../utils/constants';
import { api } from '../services/api';

const ProfilePage = ({ setCurrentPage }) => {
    const { isDark } = useTheme();
    const [userProfile, setUserProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const data = await api.getUserProfile();
                if (data && Object.keys(data).length > 0) {
                    setUserProfile(data);
                    setFormData(data);
                } else {
                    // Fallback to localStorage if API empty/fails or handled in api service
                    const local = localStorage.getItem('userProfile');
                    if (local) {
                        const parsed = JSON.parse(local);
                        setUserProfile(parsed);
                        setFormData(parsed);
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                // Try localStorage as fallback
                const local = localStorage.getItem('userProfile');
                if (local) {
                    const parsed = JSON.parse(local);
                    setUserProfile(parsed);
                    setFormData(parsed);
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        // Recalculate targets based on new weight/goal
        const tdee = calculateTDEE(
            formData.weight,
            formData.height,
            formData.age,
            formData.gender,
            formData.activityLevel
        );

        const targetCalories = calculateTargetCalories(tdee, formData.goal);
        const macros = calculateMacros(targetCalories, formData.goal, formData.dietaryPreference);

        const updatedProfile = {
            ...formData,
            nutritionTargets: {
                tdee,
                targetCalories,
                macros
            }
        };

        // Detect if critical fields changed that require plan regeneration
        const needsRegeneration =
            JSON.stringify(userProfile.healthConditions) !== JSON.stringify(updatedProfile.healthConditions) ||
            JSON.stringify(userProfile.allergies) !== JSON.stringify(updatedProfile.allergies) ||
            userProfile.dietaryPreference !== updatedProfile.dietaryPreference ||
            userProfile.nutritionTargets.targetCalories !== updatedProfile.nutritionTargets.targetCalories ||
            userProfile.goal !== updatedProfile.goal;

        try {
            await api.saveUserProfile(updatedProfile);
            setUserProfile(updatedProfile);

            if (needsRegeneration) {
                console.log('🔄 critical profile changes detected, regenerating meal plan...');
                await createAndSaveMealPlan(updatedProfile);
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save changes backend');
        }

        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(userProfile);
        setIsEditing(false);
    };

    // Helper functions for array toggles
    const toggleArrayItem = (field, value) => {
        if (!isEditing) return;
        const currentArray = formData[field] || [];
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        setFormData({ ...formData, [field]: newArray });
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Loading your profile...
                    </p>
                </div>
            </div>
        );
    }

    // Show empty state if no profile
    if (!userProfile) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center max-w-md p-8">
                    <User className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        No Profile Found
                    </h2>
                    <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Please complete onboarding to set up your profile.
                    </p>
                    <button
                        onClick={() => setCurrentPage('onboarding')}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        Complete Onboarding
                    </button>
                </div>
            </div>
        );
    }

    const SectionHeader = ({ icon: Icon, title, description }) => (
        <div className="mb-6">
            <h3 className={`text-xl font-bold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Icon className={`w-6 h-6 mr-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                {title}
            </h3>
            {description && (
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {description}
                </p>
            )}
        </div>
    );

    const InputField = ({ label, name, type = "text", icon: Icon }) => (
        <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {label}
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <input
                    type={type}
                    value={formData[name] || ''}
                    onChange={(e) => setFormData({ ...formData, [name]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                    disabled={!isEditing}
                    className={`block w-full pl-10 pr-3 py-2 rounded-xl transition-colors ${isEditing
                        ? isDark
                            ? 'bg-gray-800 border border-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white'
                            : 'bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900'
                        : isDark
                            ? 'bg-gray-800/50 border-transparent text-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 border-transparent text-gray-600 cursor-not-allowed'
                        }`}
                />
            </div>
        </div>
    );

    const SelectableButton = ({ label, selected, onClick, icon }) => (
        <button
            onClick={onClick}
            disabled={!isEditing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selected
                ? 'bg-emerald-600 text-white shadow-md'
                : isEditing
                    ? isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                } flex items-center space-x-2`}
        >
            {icon && <span>{icon}</span>}
            <span>{label}</span>
        </button>
    );

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
            }`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 backdrop-blur-md border-b ${isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
                }`}>
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => {
                                    const returnPage = localStorage.getItem('returnPage') || 'dashboard';
                                    localStorage.removeItem('returnPage'); // Clear after use
                                    setCurrentPage(returnPage);
                                }}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                                    }`}
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-bold">My Profile</h1>
                        </div>
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center space-x-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-emerald-400' : 'bg-white hover:bg-gray-50 text-emerald-600 shadow-sm'
                                    }`}
                            >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit Profile</span>
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleCancel}
                                    className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center space-x-2 ${isDark ? 'hover:bg-gray-800 text-red-400' : 'hover:bg-gray-100 text-red-600'
                                        }`}
                                >
                                    <X className="w-4 h-4" />
                                    <span>Cancel</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* 1. Physical Stats */}
                <div className={`p-6 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <SectionHeader icon={User} title="Physical Stats" description="Your baseline metrics for calorie calculation" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <InputField label="Weight (kg)" name="weight" type="number" icon={Weight} />
                            <InputField label="Height (cm)" name="height" type="number" icon={Ruler} />
                        </div>
                        <div className="space-y-4">
                            <InputField label="Age" name="age" type="number" icon={Calendar} />
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Gender</label>
                                <div className="flex items-center space-x-3 mt-1">
                                    {['male', 'female', 'other'].map(g => (
                                        <SelectableButton
                                            key={g}
                                            label={g.charAt(0).toUpperCase() + g.slice(1)}
                                            selected={formData.gender === g}
                                            onClick={() => setFormData({ ...formData, gender: g })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Health & Safety */}
                <div className={`p-6 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <SectionHeader icon={Heart} title="Health & Safety" description="Manage conditions and allergies for safe meal planning" />

                    {/* Conditions */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Health Conditions</label>
                        <div className="flex flex-wrap gap-2">
                            {HEALTH_CONDITIONS.map(cond => (
                                <SelectableButton
                                    key={cond.id}
                                    label={cond.name}
                                    selected={(formData.healthConditions || []).includes(cond.id)}
                                    onClick={() => toggleArrayItem('healthConditions', cond.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Allergies */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Allergies</label>
                        <div className="flex flex-wrap gap-2">
                            {ALLERGENS.map(allg => (
                                <SelectableButton
                                    key={allg.id}
                                    label={allg.name}
                                    selected={(formData.allergies || []).includes(allg.id)}
                                    onClick={() => toggleArrayItem('allergies', allg.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Medications */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Current Medications
                        </label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <Pill className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            </div>
                            <textarea
                                value={formData.medications || ''}
                                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                                disabled={!isEditing}
                                rows={2}
                                className={`block w-full pl-10 pr-3 py-2 rounded-xl resize-none transition-colors ${isEditing
                                    ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    }`}
                                placeholder={isEditing ? "e.g., Metformin, Thyroxine..." : "None listed"}
                            />
                        </div>
                    </div>

                    {/* Pregnancy */}
                    {formData.gender === 'female' && (
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isPregnant || false}
                                    onChange={(e) => setFormData({ ...formData, isPregnant: e.target.checked })}
                                    disabled={!isEditing}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Pregnant</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isBreastfeeding || false}
                                    onChange={(e) => setFormData({ ...formData, isBreastfeeding: e.target.checked })}
                                    disabled={!isEditing}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Breastfeeding</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* 3. Dietary Preferences */}
                <div className={`p-6 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <SectionHeader icon={Leaf} title="Diet & Taste" description="Customize your meal recommendations" />

                    {/* Diet Type */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Dietary Preference</label>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_PREFERENCES.map(diet => (
                                <SelectableButton
                                    key={diet.id}
                                    label={diet.name}
                                    selected={formData.dietaryPreference === diet.id}
                                    onClick={() => setFormData({ ...formData, dietaryPreference: diet.id })}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Cuisines */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Favorite Cuisines</label>
                        <div className="flex flex-wrap gap-2">
                            {CUISINES.map(cuisine => (
                                <SelectableButton
                                    key={cuisine.id}
                                    label={cuisine.name}
                                    icon={cuisine.flag}
                                    selected={(formData.cuisines || []).includes(cuisine.id)}
                                    onClick={() => toggleArrayItem('cuisines', cuisine.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Cooking Skill */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cooking Skill</label>
                        <div className="flex flex-wrap gap-2">
                            {['beginner', 'intermediate', 'advanced'].map(skill => (
                                <SelectableButton
                                    key={skill}
                                    label={skill.charAt(0).toUpperCase() + skill.slice(1)}
                                    icon={<ChefHat className="w-4 h-4" />}
                                    selected={formData.cookingSkill === skill}
                                    onClick={() => setFormData({ ...formData, cookingSkill: skill })}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Dislikes */}
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Disliked Foods
                        </label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <ThumbsDown className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            </div>
                            <textarea
                                value={formData.dislikedFoods || ''}
                                onChange={(e) => setFormData({ ...formData, dislikedFoods: e.target.value })}
                                disabled={!isEditing}
                                rows={2}
                                className={`block w-full pl-10 pr-3 py-2 rounded-xl resize-none transition-colors ${isEditing
                                    ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    }`}
                                placeholder={isEditing ? "e.g., mushrooms, okra..." : "None"}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Logistics & Goals */}
                <div className={`p-6 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <SectionHeader icon={Activity} title="Goals & Logistics" description="Fine-tune your fitness targets and planning" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Activity Level */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Activity Level
                            </label>
                            <div className="relative">
                                <Activity className={`absolute left-3 top-2.5 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <select
                                    value={formData.activityLevel}
                                    onChange={(e) => setFormData({ ...formData, activityLevel: parseFloat(e.target.value) })}
                                    disabled={!isEditing}
                                    className={`block w-full pl-10 pr-3 py-2 rounded-xl appearance-none transition-colors ${isEditing
                                        ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <option value={1.2}>Sedentary</option>
                                    <option value={1.375}>Lightly Active</option>
                                    <option value={1.55}>Moderately Active</option>
                                    <option value={1.725}>Very Active</option>
                                    <option value={1.9}>Extra Active</option>
                                </select>
                            </div>
                        </div>

                        {/* Goal */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Fitness Goal
                            </label>
                            <div className="relative">
                                <Activity className={`absolute left-3 top-2.5 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <select
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                    disabled={!isEditing}
                                    className={`block w-full pl-10 pr-3 py-2 rounded-xl appearance-none transition-colors ${isEditing
                                        ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                        : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <option value="lose">Lose Weight</option>
                                    <option value="maintain">Maintain Weight</option>
                                    <option value="gain">Gain Muscle</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Region */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Region</label>
                        <div className="relative">
                            <MapPin className={`absolute left-3 top-2.5 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <select
                                value={formData.region || ''}
                                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                disabled={!isEditing}
                                className={`block w-full pl-10 pr-3 py-2 rounded-xl appearance-none transition-colors ${isEditing
                                    ? isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    : isDark ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <option value="">Select Region</option>
                                {INDIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Budget</label>
                        <div className="flex flex-wrap gap-2">
                            {BUDGET_RANGES.map(b => (
                                <SelectableButton
                                    key={b.value}
                                    label={b.label}
                                    icon={<DollarSign className="w-4 h-4" />}
                                    selected={formData.budget === b.value}
                                    onClick={() => setFormData({ ...formData, budget: b.value })}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Servings & Prep */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Servings per meal</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(num => (
                                    <SelectableButton
                                        key={num}
                                        label={num.toString()}
                                        selected={formData.servings === num}
                                        onClick={() => setFormData({ ...formData, servings: num })}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Meal Prep</label>
                            <div className="flex gap-2 flex-wrap">
                                {[{ id: 'daily', l: 'Daily' }, { id: 'batch_3', l: '3 Days' }, { id: 'batch_7', l: 'Weekly' }].map(mp => (
                                    <SelectableButton
                                        key={mp.id}
                                        label={mp.l}
                                        selected={formData.mealPrepPreference === mp.id}
                                        onClick={() => setFormData({ ...formData, mealPrepPreference: mp.id })}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
