const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const API_BASE_URL = 'http://localhost:5000';

async function verifyDashboardStats() {
    try {
        console.log('--- Verifying Dashboard Stats ---');

        // Login to get token
        const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: 'staff1',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('Login successful');

        // Call dashboard endpoint
        const dashboardRes = await axios.get(`${API_BASE_URL}/api/stock/staff/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Dashboard Stats:', JSON.stringify(dashboardRes.data, null, 2));

        if (dashboardRes.data.success) {
            console.log('✅ Dashboard endpoint returned success');
            const { stats } = dashboardRes.data;
            if (stats.pending_grns > 0 || stats.today_movements > 0 || stats.stock_count_tasks > 0) {
                console.log('✅ Found non-zero counts in stats');
            } else {
                console.log('ℹ️ All counts are 0, but this might be correct if database is empty');
            }
        } else {
            console.error('❌ Dashboard endpoint failed');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.response?.data || error.message);
    }
}

verifyDashboardStats();
