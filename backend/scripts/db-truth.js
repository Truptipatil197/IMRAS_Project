const { Item, StockLedger, PurchaseRequisition, sequelize } = require('../models');
const { Op, literal } = require('sequelize');

async function truth() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // 1. Total Items
        const totalItems = await Item.count({ where: { is_active: true } });
        console.log(`Total Active Items: ${totalItems}`);

        // 2. Sample Stock Check
        const inventory = await Item.findAll({
            attributes: [
                'item_id', 'item_name', 'reorder_point',
                [literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`), 'calculated_stock']
            ],
            limit: 5,
            where: { is_active: true }
        });

        console.log('\n--- Inventory Truth (Top 5) ---');
        inventory.forEach(i => {
            console.log(`Item: ${i.item_name} | Reorder Point: ${i.reorder_point} | Current Stock: ${i.get('calculated_stock')}`);
        });

        // 3. Automation Truth
        const pendingPRs = await PurchaseRequisition.count({ where: { status: 'Pending' } });
        console.log(`\nPending PRs in Database: ${pendingPRs}`);

        const belowReorder = inventory.filter(i => parseFloat(i.get('calculated_stock')) < parseFloat(i.reorder_point)).length;
        console.log(`Items Below Reorder (in sample): ${belowReorder}`);

    } catch (err) {
        console.error('Truth Failed:', err);
    } finally {
        process.exit();
    }
}

truth();
