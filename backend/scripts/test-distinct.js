const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PurchaseRequisition, User, PRItem, Item, PurchaseOrder } = require('../models');
const { sequelize } = require('../config/database');

async function simulate() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        console.log('--- Query WITHOUT distinct: true ---');
        const res1 = await PurchaseRequisition.findAndCountAll({
            include: [{ model: PRItem, as: 'prItems' }],
            limit: 20,
            offset: 0
        });
        console.log(`Count: ${res1.count}, Rows length: ${res1.rows.length}`);

        console.log('\n--- Query WITH distinct: true ---');
        const res2 = await PurchaseRequisition.findAndCountAll({
            include: [{ model: PRItem, as: 'prItems' }],
            limit: 20,
            offset: 0,
            distinct: true
        });
        console.log(`Count: ${res2.count}, Rows length: ${res2.rows.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

simulate();
