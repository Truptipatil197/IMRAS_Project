const { Item, StockLedger, sequelize } = require('../models');
const { fn, col, literal } = require('sequelize');

async function reconcile() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const results = await sequelize.query(`
        SELECT 
            i.item_id, 
            i.item_name, 
            i.reorder_point,
            (SELECT SUM(quantity) FROM stock_ledgers WHERE item_id = i.item_id) as ledger_sum
        FROM items i
        WHERE i.is_active = 1
        LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

        console.log('\n--- Stock Reconciliation ---');
        console.log('ID | Item Name | RP | Ledger Sum');
        results.forEach(r => {
            console.log(`${r.item_id} | ${r.item_name.padEnd(20)} | ${r.reorder_point} | ${r.ledger_sum || 0}`);
        });

    } catch (err) {
        console.error('Reconcile Failed:', err);
    } finally {
        process.exit();
    }
}

reconcile();
