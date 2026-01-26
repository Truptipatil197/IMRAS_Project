/**
 * Diagnosis script for Reorder Automation errors
 * Run with: node scripts/diagnose-reorder.js
 */

const { sequelize } = require('../config/database');
const { Item, Alert, ReorderRule, SupplierItem, Supplier, Category } = require('../models');
const { Op, literal } = require('sequelize');

async function diagnose() {
    console.log('🔍 Starting diagnosis...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection OK');

        // Test 1: ReorderRule (simple find)
        console.log('\nTesting ReorderRule.findAll()...');
        try {
            const rules = await ReorderRule.findAll({ limit: 1 });
            console.log(`✅ ReorderRule OK. Found ${rules.length} rules.`);
        } catch (err) {
            console.error('❌ ReorderRule failed:', err.message);
        }

        // Test 2: Alert Query (complex include)
        console.log('\nTesting Alert Query (Complex)...');
        try {
            const alerts = await Alert.findAll({
                limit: 1,
                include: [
                    {
                        model: Item,
                        as: 'item',
                        attributes: ['item_id', 'sku', 'item_name'],
                        include: [
                            {
                                model: SupplierItem,
                                as: 'supplierItems',
                                where: { is_preferred: true },
                                required: false,
                                include: [{ model: Supplier }]
                            }
                        ]
                    }
                ]
            });
            console.log(`✅ Alert Query OK. Found ${alerts.length} alerts.`);
        } catch (err) {
            console.error('❌ Alert Query failed:', err.message);
            console.error(err);
        }

        // Test 3: SchedulerLog table
        console.log('\nTesting SchedulerLog table...');
        try {
            const { SchedulerLog } = require('../models');
            const count = await SchedulerLog.count();
            console.log(`✅ SchedulerLog OK. Count: ${count}`);
        } catch (err) {
            console.error('❌ SchedulerLog failed:', err.message);
        }

    } catch (err) {
        console.error('❌ Diagnosis setup failed:', err);
    } finally {
        await sequelize.close();
    }
}

diagnose();
