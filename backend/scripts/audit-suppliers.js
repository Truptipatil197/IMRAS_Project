const { Item, SupplierItem, StockLedger, sequelize } = require('../models');
const { Op, literal } = require('sequelize');

async function auditSuppliers() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const lowStockItems = await Item.findAll({
            attributes: [
                'item_id', 'item_name', 'reorder_point',
                [
                    literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`),
                    'calculated_stock'
                ]
            ]
        });

        const needingReorder = lowStockItems.filter(i =>
            parseFloat(i.getDataValue('calculated_stock')) <= i.reorder_point
        );

        console.log(`Auditing ${needingReorder.length} items needing reorder:`);

        for (const item of needingReorder) {
            const preferredSupplier = await SupplierItem.findOne({
                where: { item_id: item.item_id, is_preferred: true }
            });
            console.log(`Item: ${item.item_name} (ID: ${item.item_id})`);
            console.log(`  Preferred Supplier found: ${preferredSupplier ? 'YES' : 'NO'}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

auditSuppliers();
