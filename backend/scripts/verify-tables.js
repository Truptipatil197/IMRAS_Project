/**
 * Verify Tables and Associations Script
 * Run with: node scripts/verify-tables.js
 */
const { sequelize } = require('../config/database');
const { User, Item, Alert, ReorderRule, SupplierItem, StockLedger, SchedulerLog, Warehouse } = require('../models');
const fs = require('fs');

async function verify() {
    let log = 'Starting Verification...\n';
    try {
        await sequelize.authenticate();
        log += '✅ Database connection OK\n';

        const users = await User.count();
        log += `✅ Users: ${users}\n`;

        const items = await Item.count();
        log += `✅ Items: ${items}\n`;

        try {
            const warehouses = await Warehouse.count();
            log += `✅ Warehouses: ${warehouses}\n`;
        } catch (e) { log += `❌ Warehouse Error: ${e.message}\n`; }

        try {
            // Test the specific query causing issues in getCurrentStockMaps
            const ledgers = await StockLedger.findOne({
                include: [{
                    model: Warehouse,
                    as: 'warehouse',
                    required: false
                }]
            });
            log += `✅ StockLedger Association Check: ${ledgers ? 'Found One' : 'Empty (OK)'}\n`;
        } catch (e) {
            log += `❌ StockLedger Association FAILED: ${e.message}\n`;
            console.error(e);
        }

        try {
            const alerts = await Alert.count();
            log += `✅ Alerts: ${alerts}\n`;
        } catch (e) { log += `❌ Alerts Error: ${e.message}\n`; }

    } catch (error) {
        log += `❌ Fatal Error: ${error.message}\n`;
        log += error.stack;
    } finally {
        await sequelize.close();
        fs.writeFileSync('table_verification.log', log);
        console.log(log);
    }
}

verify();
