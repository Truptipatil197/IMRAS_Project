const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PurchaseRequisition, User, PRItem } = require('../models');
const { sequelize } = require('../config/database');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const prs = await PurchaseRequisition.findAll({
            where: {
                remarks: { [require('sequelize').Op.like]: '%Auto-generated%' }
            },
            include: [
                { model: User, as: 'requester' },
                { model: PRItem, as: 'prItems' }
            ]
        });

        console.log(`Found ${prs.length} auto-generated PRs:`);
        prs.forEach(pr => {
            console.log(`- PR: ${pr.pr_number}, Status: ${pr.status}, Requester: ${pr.requester?.full_name || 'NONE'}, RequesterRole: ${pr.requester?.role || 'NONE'}, CreatedAt: ${pr.createdAt}`);
        });

        const allPRs = await PurchaseRequisition.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'requester' }]
        });
        console.log('\nTop 5 recent PRs:');
        allPRs.forEach(pr => {
            console.log(`- PR: ${pr.pr_number}, Status: ${pr.status}, Requester: ${pr.requester?.full_name || 'NONE'}, Remarks: ${pr.remarks}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
