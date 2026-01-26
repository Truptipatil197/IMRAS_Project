/**
 * Diagnosis script for Route Logic with File Logging
 * Run with: node scripts/diagnose-routes.js
 */

const { sequelize } = require('../config/database');
const reorderController = require('../controllers/reorderController');
const { ReorderRule, Alert } = require('../models');
const fs = require('fs');

// Mock Express Request/Response
const mockReq = {
    query: {},
    user: { user_id: 1, role: 'Admin' }
};

const mockRes = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log(`\n✅ Response [${this.statusCode || 200}]`);
        return this;
    }
};

async function diagnose() {
    console.log('🔍 Starting Route Logic Diagnosis...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection OK');

        // Test 1: /rules Logic
        console.log('\nTesting /rules logic (ReorderRule.findAll)...');
        try {
            const rules = await ReorderRule.findAll({
                order: [['created_at', 'DESC']]
            });
            console.log(`✅ Rules fetched: ${rules.length}`);
        } catch (err) {
            console.error('❌ /rules Logic Failed');
            fs.writeFileSync('error_rules.log', err.stack || err.message);
        }

        // Test 2: /alerts Logic (Controller)
        console.log('\nTesting /alerts logic (reorderController.getReorderAlerts)...');
        try {
            await reorderController.getReorderAlerts(mockReq, mockRes);
        } catch (err) {
            console.error('❌ /alerts Logic Failed');
            // If controller catches error, it returns 500 but doesn't throw.
            // But we modified controller to Log error to console.
            // And we might catch other errors.
            fs.writeFileSync('error_alerts_toplevel.log', err.stack || err.message);
        }

    } catch (err) {
        console.error('❌ Diagnosis Setup Failed:', err);
        fs.writeFileSync('error_setup.log', err.stack || err.message);
    } finally {
        await sequelize.close();
    }
}

diagnose();
