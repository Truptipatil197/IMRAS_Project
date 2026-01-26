const { PurchaseRequisition, PRItem, sequelize } = require('../models');
const { Op } = require('sequelize');

async function checkPendingPRs() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const prs = await PurchaseRequisition.findAll({
            where: {
                status: { [Op.in]: ['Pending', 'Approved'] }
            },
            include: [{
                model: PRItem,
                as: 'prItems'
            }]
        });

        console.log(`Found ${prs.length} Pending/Approved PRs`);

        const itemIdsWithPRs = new Set();
        prs.forEach(pr => {
            pr.prItems.forEach(item => {
                itemIdsWithPRs.add(item.item_id);
            });
        });

        console.log('Item IDs already covered by pending PRs:', Array.from(itemIdsWithPRs));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkPendingPRs();
