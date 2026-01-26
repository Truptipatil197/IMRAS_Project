/**
 * Script to ensure automation tables exist
 * Run with: node migrations/ensure-automation-tables.js
 */

const { sequelize } = require('../config/database');
const SchedulerLog = require('../models/SchedulerLog');
const ReorderHistory = require('../models/ReorderHistory');
const ReorderLog = require('../models/ReorderLog');
const ReorderRule = require('../models/ReorderRule');
const ReorderQueue = require('../models/ReorderQueue');
const Alert = require('../models/Alert');

async function ensureTables() {
    console.log('🔄 Checking and creating automation tables...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync specific tables
        // alter: true adds missing columns/tables without dropping data
        console.log('📦 Syncing SchedulerLog...');
        await SchedulerLog.sync({ alter: true });

        console.log('📦 Syncing ReorderHistory...');
        await ReorderHistory.sync({ alter: true });

        console.log('📦 Syncing ReorderLog...');
        await ReorderLog.sync({ alter: true });

        console.log('📦 Syncing ReorderRule...');
        await ReorderRule.sync({ alter: true });

        console.log('📦 Syncing ReorderQueue...');
        await ReorderQueue.sync({ alter: true });

        console.log('📦 Syncing Alert...');
        await Alert.sync({ alter: true });

        console.log('\n✅ All automation tables synced successfully!');

    } catch (error) {
        console.error('\n❌ Failed to sync tables:', error);
    } finally {
        await sequelize.close();
    }
}

ensureTables();
