const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PurchaseRequisition, PRItem } = require('../models');
const { sequelize } = require('../config/database');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const prs = await PurchaseRequisition.findAll({
            where: {
                remarks: { [require('sequelize').Op.like]: '%Auto-generated%' }
            }
        });

        console.log(`Checking ${prs.length} auto-generated PRs for items:`);
        for (const pr of prs) {
            const items = await PRItem.findAll({ where: { pr_id: pr.pr_id } });
            console.log(`- PR: ${pr.pr_number}, Items count: ${items.length}`);
            if (items.length > 0) {
                items.forEach(it => {
                    console.log(`  Item ID: ${it.item_id}, Qty: ${it.requested_qty}`);
                });
            } else {
                console.log(`  ❌ NO ITEMS FOUND for PR ${pr.pr_id}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
