const API_URL = 'http://localhost:3000/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            // window.location.reload(); // excessive, maybe just let app handle it
        }
        const error = await response.json().catch(() => ({ message: 'Something went wrong' }));
        throw new Error(error.message || 'API Error');
    }
    return response.json();
};

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    login: async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return handleResponse(res);
    },

    register: async (name, email, password) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return handleResponse(res);
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

    saveMealPlan: async (planData) => {
        const res = await fetch(`${API_URL}/meal-plan`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(planData)
        });
        return handleResponse(res);
    },

    // Compliance
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
    }
};
