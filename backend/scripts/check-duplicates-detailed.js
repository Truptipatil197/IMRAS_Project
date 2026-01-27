const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Alert, Item } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const alerts = await Alert.findAll({
            include: [{
                model: Item,
                as: 'item',
                where: { item_name: { [Op.like]: '%Pen%' } }
            }],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        console.log(`Total 'Pen' alerts found: ${alerts.length}`);

        // Find pairs with same message or same time
        for (let i = 0; i < alerts.length; i++) {
            for (let j = i + 1; j < alerts.length; j++) {
                const a1 = alerts[i];
                const a2 = alerts[j];

                // Compare time (within 5 seconds)
                const timeDiff = Math.abs(new Date(a1.createdAt) - new Date(a2.createdAt)) / 1000;

                if (timeDiff < 5) {
                    console.log(`\nPotential Duplicate Pair (Time Diff: ${timeDiff}s):`);
                    console.log(`- Alert 1 [ID: ${a1.alert_id}]: "${a1.message}"`);
                    console.log(`- Alert 2 [ID: ${a2.alert_id}]: "${a2.message}"`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
