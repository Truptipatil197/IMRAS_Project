const { PurchaseRequisition, PRItem, sequelize } = require('../models');
const fs = require('fs');

async function verify() {
    let output = '';
    try {
        await sequelize.authenticate();
        output += '✅ DB Connected\n';

        const prCount = await PurchaseRequisition.count();
        output += `Total Purchase Requisitions: ${prCount}\n\n`;

        const prs = await PurchaseRequisition.findAll({
            order: [['createdAt', 'DESC']]
        });

        output += '--- ALL Purchase Requisitions ---\n';
        for (const pr of prs) {
            const itemLinks = await PRItem.findAll({ where: { pr_id: pr.pr_id } });
            output += `[${pr.status}] ID: ${pr.pr_id}, Num: ${pr.pr_number}, Date: ${pr.pr_date}, Items: ${itemLinks.length}, Remarks: ${pr.remarks}\n`;
        }

    } catch (err) {
        output += `Error: ${err.message}\n`;
    } finally {
        fs.writeFileSync('scripts/pr_verification.log', output);
        console.log('Results written to scripts/pr_verification.log');
        process.exit();
    }
}

verify();
