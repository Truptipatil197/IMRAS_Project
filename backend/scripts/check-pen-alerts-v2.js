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

        console.log(`Alert count: ${alerts.length}`);

        alerts.forEach(a => {
            console.log(`ID: ${a.alert_id} | Type: ${a.alert_type} | Severity: ${a.severity} | Message: ${a.message} | CreatedAt: ${a.createdAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
