const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PurchaseRequisition, User, PRItem, Item, PurchaseOrder } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function simulate() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // Logic from reorderController.getAllPurchaseRequisitions
        const whereClause = {};
        const limit = 20;
        const offset = 0;

        const { rows, count } = await PurchaseRequisition.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'requester', attributes: ['user_id', 'full_name'] },
                { model: User, as: 'approver', attributes: ['user_id', 'full_name'], required: false },
                { model: PRItem, as: 'prItems', include: [{ model: Item, as: 'item', attributes: ['unit_price'] }] },
                { model: PurchaseOrder, as: 'purchaseOrders', attributes: ['po_id'], required: false }
            ],
            order: [['pr_date', 'DESC'], ['createdAt', 'DESC']], // Added createdAt to be sure
            limit: parseInt(limit, 10),
            offset
        });

        console.log(`Total count from query: ${count}`);
        console.log(`Rows returned: ${rows.length}`);

        rows.forEach(pr => {
            const isAuto = pr.remarks && pr.remarks.includes('Auto-generated');
            console.log(`- [${isAuto ? 'AUTO' : 'MANUAL'}] PR: ${pr.pr_number}, Date: ${pr.pr_date}, Status: ${pr.status}, Items: ${pr.prItems.length}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

simulate();
