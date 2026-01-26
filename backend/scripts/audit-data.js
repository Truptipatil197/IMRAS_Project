const { sequelize, Item, Alert, StockLedger } = require('../models');
const { fn, col, literal } = require('sequelize');

async function audit() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const itemCount = await Item.count();
        console.log('Total Items:', itemCount);

        const alertCount = await Alert.count({
            where: { alert_type: ['Reorder', 'Critical Stock'] }
        });
        console.log('Reorder Alerts in DB:', alertCount);

        const ledgerCount = await StockLedger.count();
        console.log('Total StockLedger Records:', ledgerCount);

        const lowStockItems = await Item.findAll({
            attributes: [
                'item_id', 'item_name', 'reorder_point', 'safety_stock',
                [
                    literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`),
                    'calculated_stock'
                ]
            ]
        });

        console.log('\n--- Stock Audit (First 5 items) ---');
        lowStockItems.slice(0, 5).forEach(item => {
            console.log(`${item.item_name} (ID: ${item.item_id}):`);
            console.log(`  Stock: ${item.getDataValue('calculated_stock')}`);
            console.log(`  Reorder Point: ${item.reorder_point}`);
            console.log(`  Safety Stock: ${item.safety_stock}`);
        });

        const needingReorder = lowStockItems.filter(i =>
            parseFloat(i.getDataValue('calculated_stock')) <= i.reorder_point
        );
        console.log('\nTotal Items Needing Reorder:', needingReorder.length);

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        process.exit();
    }
}

audit();
