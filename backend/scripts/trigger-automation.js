const scheduler = require('../jobs/reorderScheduler');
const { sequelize } = require('../models');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        console.log('Starting Manual Automation Trigger...');
        const result = await scheduler.runNow(1); // User ID 1 (admin)

        console.log('\n--- Automation Result ---');
        console.log(JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Execution Failed:', err.stack || err.message);
    } finally {
        process.exit();
    }
}

run();
