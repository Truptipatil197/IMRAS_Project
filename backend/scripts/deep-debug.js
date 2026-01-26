const { sequelize, Item, Alert, StockLedger, SupplierItem, Supplier } = require('../models');
const { fn, col, literal, Op } = require('sequelize');

async function debug() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // 1. REPLICATE STATISTICS QUERY
        const items = await Item.findAll({
            attributes: [
                'item_id',
                'reorder_point',
                'safety_stock',
                'is_active',
                [
                    literal(`(
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM stock_ledgers
                    WHERE stock_ledgers.item_id = Item.item_id
                )`),
                    'current_stock'
                ]
            ],
            where: { is_active: true }
        });

        console.log(`\n--- Statistics Debug ---`);
        console.log(`Active Items found: ${items.length}`);

        let critical = 0;
        let urgent = 0;

        items.forEach(item => {
            const stock = item.dataValues.current_stock || 0;
            const rp = item.reorder_point || 0;
            if (stock === 0) critical++;
            else if (stock < rp) urgent++;
        });
        console.log(`Calculated Critical: ${critical}, Urgent: ${urgent}`);
        if (items.length > 0) {
            console.log(`Sample DataValues for Item 1:`, JSON.stringify(items[0].dataValues));
        }

        // 2. REPLICATE ALERTS QUERY
        const alerts = await Alert.findAll({
            where: { alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } },
            order: [['createdAt', 'DESC']]
        });

        console.log(`\n--- Alerts Debug ---`);
        console.log(`Reorder Alerts found: ${alerts.length}`);

        if (alerts.length > 0) {
            const a = alerts[0];
            console.log(`Processing Alert ID: ${a.alert_id}, Item ID: ${a.item_id}`);

            const item = await Item.findByPk(a.item_id);
            console.log(`Associated Item: ${item ? item.item_name : 'NOT FOUND'}`);

            const sItem = await SupplierItem.findOne({
                where: { item_id: a.item_id, is_preferred: true },
                include: [{ model: Supplier }]
            });
            console.log(`Preferred Supplier: ${sItem && sItem.Supplier ? sItem.Supplier.supplier_name : 'NONE'}`);
        }

    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        process.exit();
    }
}

debug();
