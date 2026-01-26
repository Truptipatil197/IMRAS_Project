const { StockLedger, Item, sequelize } = require('../models');
const { Op } = require('sequelize');

async function trace() {
    try {
        await sequelize.authenticate();
        const item = await Item.findOne({ where: { item_name: 'Laptop' } });
        if (!item) return console.log('Laptop not found');

        const entries = await StockLedger.findAll({
            where: { item_id: item.item_id },
            order: [['ledger_id', 'ASC']],
            raw: true
        });

        console.log(`Trace for ${item.item_name} (ID: ${item.item_id})`);
        console.log('ID | WH | LOC | Type | Qty | Balance');
        entries.forEach(e => {
            console.log(`${e.ledger_id} | ${e.warehouse_id} | ${e.location_id || 'NULL'} | ${e.transaction_type} | ${e.quantity} | ${e.balance_qty}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
trace();
