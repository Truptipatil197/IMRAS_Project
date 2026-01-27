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
            order: [['createdAt', 'DESC']]
        });

        console.log(`Total 'Pen' alerts: ${alerts.length}`);
        alerts.forEach(a => {
            console.log(`-----------------------------------`);
            console.log(`AlertId:  ${a.alert_id}`);
            console.log(`Type:     ${a.alert_type}`);
            console.log(`Severity: ${a.severity}`);
            console.log(`Message:  ${a.message}`);
            console.log(`Created:  ${a.createdAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
