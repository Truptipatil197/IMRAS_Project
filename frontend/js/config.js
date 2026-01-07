/**
 * IMRAS Configuration
 * API endpoints and application settings
 */

const CONFIG = {
    API_BASE_URL: 'http://localhost:5000',
    
    ENDPOINTS: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        ME: '/api/auth/me',
        CHANGE_PASSWORD: '/api/auth/change-password'
    },
    
    STORAGE_KEYS: {
        TOKEN: 'imras_token',
        USER: 'imras_user',
        REMEMBER_ME: 'imras_remember'
    },
    
    DASHBOARDS: {
        Admin: 'pages/admin-dashboard.html',
        Manager: 'pages/manager-dashboard.html',
        Staff: 'pages/staff-dashboard.html'
    },
    
    // Token expiry (24 hours in milliseconds)
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000,
    
    // Test Credentials (for development only - remove in production)
    TEST_CREDENTIALS: {
        admin: { username: 'admin', password: 'password123' },
        manager: { username: 'manager1', password: 'password123' },
        staff: { username: 'staff1', password: 'password123' }
    }
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

