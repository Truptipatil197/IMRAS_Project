const { SupplierItem, Item, StockLedger, sequelize } = require('../models');
const { Op, literal } = require('sequelize');

async function fix() {
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

        console.log(`Fixing ${needingReorder.length} items needing reorder...`);

        for (const item of needingReorder) {
            // Check if preferred supplier exists
            const preferred = await SupplierItem.findOne({
                where: { item_id: item.item_id, is_preferred: true }
            });

            if (!preferred) {
                console.log(`Item: ${item.item_name} (ID: ${item.item_id}) has no preferred supplier. Linking to Supplier 1...`);

                // Check if ANY link exists
                const anyLink = await SupplierItem.findOne({
                    where: { item_id: item.item_id, supplier_id: 1 }
                });

                if (anyLink) {
                    await anyLink.update({ is_preferred: true });
                    console.log(`  Updated existing link to Preferred.`);
                } else {
                    await SupplierItem.create({
                        item_id: item.item_id,
                        supplier_id: 1,
                        unit_price: 100.00, // Dummy price
                        min_order_qty: 10,
                        is_preferred: true,
                        last_updated: new Date()
                    });
                    console.log(`  Created NEW preferred supplier link.`);
                }
            } else {
                console.log(`Item: ${item.item_name} already has preferred supplier: ${preferred.supplier_id}`);
            }
        }

        console.log('\n--- Data Fix Complete ---');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fix();
