const { sequelize } = require('../models');
const batchController = require('../controllers/batchController');
const reorderController = require('../controllers/reorderController');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        console.log('1. Triggering Expiry check...');
        // Simulate req/res for the controller
        const mockRes = {
            status: () => ({ json: (data) => console.log('   Check Expiry Results:', JSON.stringify(data.data.summary)) })
        };
        await batchController.checkExpiryAlerts({}, mockRes);

        console.log('2. Triggering Reorder Point check...');
        const mockRes2 = {
            status: () => ({ json: (data) => console.log('   Check Reorder Results:', JSON.stringify({ items_needing_reorder: data.data.items_needing_reorder })) })
        };
        await reorderController.checkReorderPoints({}, mockRes2);

        console.log('\n--- Sync Complete. Dashboards should now be populated. ---');

    } catch (err) {
        console.error('Fix Failed:', err.stack || err.message);
    } finally {
        process.exit();
    }
}

fix();
