const API_URL = 'http://localhost:3000/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
        }
        const error = await response.json().catch(() => ({ message: 'Something went wrong' }));
        throw new Error(error.message || error.error || 'API Error');
    }
    return response.json();
};

/**
 * Like handleResponse but also returns the parsed body on 4xx so callers
 * can inspect `requiresVerification` flags without catching errors.
 */
const handleAuthResponse = async (response) => {
    const data = await response.json().catch(() => ({ message: 'Something went wrong' }));
    if (!response.ok && response.status !== 400 && response.status !== 403) {
        throw new Error(data.message || data.error || 'API Error');
    }
    return { ...data, _status: response.status };
};

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    getCaptcha: async () => {
        const res = await fetch(`${API_URL}/auth/captcha`);
        return handleResponse(res);
    },

    login: async (email, password, captchaText, captchaToken) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, captchaText, captchaToken })
        });
        return handleAuthResponse(res);
    },

    register: async (name, email, password) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return handleAuthResponse(res);
    },

    verifyEmail: async (email, otp) => {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        return handleAuthResponse(res);
    },

    resendOtp: async (email) => {
        const res = await fetch(`${API_URL}/auth/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return handleAuthResponse(res);
    },

    forgotPassword: async (email) => {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return handleAuthResponse(res);
    },

    resetPassword: async (email, otp, newPassword) => {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        return handleAuthResponse(res);
    },

    // User Profile
    getUserProfile: async () => {
        try {
            const res = await fetch(`${API_URL}/profile`, {
                headers: getHeaders()
            });
            return await handleResponse(res);
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    saveUserProfile: async (profileData) => {
        const res = await fetch(`${API_URL}/profile`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(profileData)
        });
        return handleResponse(res);
    },

    // Meal Plan
    getMealPlan: async () => {
        try {
            const res = await fetch(`${API_URL}/meal-plan`, {
                headers: getHeaders()
            });
            return await handleResponse(res);
        } catch (error) {
            console.warn('No active meal plan found');
            return null;
        }
    },

    // Generates and saves a new weekly plan on the server.
    generateMealPlan: async ({ startDate, seed } = {}) => {
        const res = await fetch(`${API_URL}/meal-plan/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ startDate, seed })
        });
        return handleResponse(res);
    },

    getMealAlternatives: async (date, slot) => {
        const params = new URLSearchParams({ date, slot });
        const res = await fetch(`${API_URL}/meal-plan/alternatives?${params}`, { headers: getHeaders() });
        return handleResponse(res);
    },

    swapMeal: async (date, slot, recipeId) => {
        const res = await fetch(`${API_URL}/meal-plan/swap`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ date, slot, recipeId })
        });
        return handleResponse(res);
    },

    getShoppingList: async () => {
        const res = await fetch(`${API_URL}/meal-plan/shopping-list`, { headers: getHeaders() });
        return handleResponse(res);
    },

    // Recipes
    getRecipes: async (filters = {}) => {
        const params = new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
        );
        const res = await fetch(`${API_URL}/recipes?${params}`, { headers: getHeaders() });
        return handleResponse(res);
    },

    getCustomRecipes: async () => {
        const res = await fetch(`${API_URL}/recipes/custom`, { headers: getHeaders() });
        return handleResponse(res);
    },

    saveCustomRecipe: async (recipe, id = null) => {
        const res = await fetch(`${API_URL}/recipes/custom${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: getHeaders(),
            body: JSON.stringify(recipe)
        });
        return handleResponse(res);
    },

    deleteCustomRecipe: async (id) => {
        const res = await fetch(`${API_URL}/recipes/custom/${id}`, { method: 'DELETE', headers: getHeaders() });
        return handleResponse(res);
    },

    // Per-user data synced from the browser (pantry, shopping ticks, streak badges)
    getUserData: async () => {
        const res = await fetch(`${API_URL}/user-data`, { headers: getHeaders() });
        return handleResponse(res);
    },

    putUserData: async (key, value) => {
        const res = await fetch(`${API_URL}/user-data/${key}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ value })
        });
        return handleResponse(res);
    },

    // Compliance
    // All records in a range, keyed by date: { 'YYYY-MM-DD': { meals, date } }
    getComplianceRange: async (from, to) => {
        const params = new URLSearchParams(Object.entries({ from, to }).filter(([, v]) => v));
        const res = await fetch(`${API_URL}/compliance?${params}`, { headers: getHeaders() });
        return handleResponse(res);
    },

    getCompliance: async (date) => {
        // date should be YYYY-MM-DD
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const res = await fetch(`${API_URL}/compliance/${dateStr}`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    updateCompliance: async (date, meals) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const res = await fetch(`${API_URL}/compliance`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ date: dateStr, meals })
        });
        return handleResponse(res);
    },

    // Weight Logs
    getWeightLogs: async () => {
        const res = await fetch(`${API_URL}/weight-logs`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    addWeightLog: async (logData) => {
        const res = await fetch(`${API_URL}/weight-logs`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(logData)
        });
        return handleResponse(res);
    },

    deleteWeightLog: async (logId) => {
        const res = await fetch(`${API_URL}/weight-logs/${logId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    // Hydration
    getHydration: async (date) => {
        // date string YYYY-MM-DD
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const res = await fetch(`${API_URL}/hydration/${dateStr}`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    updateHydration: async (date, amount) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const res = await fetch(`${API_URL}/hydration`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ date: dateStr, amount })
        });
        return handleResponse(res);
    },

    // Favorites
    getFavorites: async () => {
        console.log('Fetching favorites...');
        const res = await fetch(`${API_URL}/favorites`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    addFavorite: async (recipe) => {
        console.log('Adding favorite:', recipe.id);
        const res = await fetch(`${API_URL}/favorites`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(recipe)
        });
        return handleResponse(res);
    },

    removeFavorite: async (recipeId) => {
        console.log('Removing favorite:', recipeId);
        const res = await fetch(`${API_URL}/favorites/${recipeId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    }
};
