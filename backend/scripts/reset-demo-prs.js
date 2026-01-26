const { PurchaseRequisition, PRItem, Alert, sequelize } = require('../models');
const { Op } = require('sequelize');

async function reset() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // 1. Delete associated PR Items first
        const autoPRs = await PurchaseRequisition.findAll({
            where: { pr_number: { [Op.like]: 'PR-AUTO%' } }
        });
        const prIds = autoPRs.map(p => p.pr_id);

        if (prIds.length > 0) {
            console.log(`Cleaning up ${prIds.length} automated PRs...`);
            await PRItem.destroy({ where: { pr_id: prIds } });
            await PurchaseRequisition.destroy({ where: { pr_id: prIds } });
        }

        // 2. Delete automated Alerts
        const alertCount = await Alert.destroy({
            where: {
                alert_type: 'Reorder',
                message: { [Op.like]: '%PR-AUTO%' }
            }
        });

        console.log(`Deleted ${alertCount} automated alerts.`);
        console.log('\n--- Reset Complete. Ready for "Run Now" test. ---');

    } catch (err) {
        console.error('Reset Failed:', err.stack || err.message);
    } finally {
        process.exit();
    }
}

reset();
