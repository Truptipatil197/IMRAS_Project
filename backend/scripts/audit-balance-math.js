const { StockLedger, Item, sequelize } = require('../models');
const { fn, col, Op } = require('sequelize');

async function auditBalance() {
    try {
        await sequelize.authenticate();

        // Scan all items that have multi-location history if possible
        const items = await StockLedger.findAll({
            attributes: ['item_id'],
            group: ['item_id'],
            having: sequelize.literal('count(DISTINCT location_id) > 0'),
            limit: 5,
            raw: true
        });

        for (const itemRecord of items) {
            const item = await Item.findByPk(itemRecord.item_id);
            const history = await StockLedger.findAll({
                where: { item_id: item.item_id },
                order: [['ledger_id', 'ASC']],
                raw: true
            });

            console.log(`\n--- AUDIT: ${item.item_name} (ID: ${item.item_id}) ---`);
            console.log('ID | LOC | BATCH | Type | Qty | Balance (DB)');

            let locBalances = {};
            history.forEach(e => {
                const dimKey = `${e.location_id || 'NULL'}-${e.batch_id || 'NULL'}`;
                console.log(`${e.ledger_id} | ${e.location_id || 'NULL'} | ${e.batch_id || 'NULL'} | ${e.transaction_type} | ${e.quantity} | ${e.balance_qty}`);
                locBalances[dimKey] = e.balance_qty;
            });

            const latestEntry = history[history.length - 1];
            const sumOfLatestDims = Object.values(locBalances).reduce((a, b) => a + b, 0);

            console.log(`Global Latest Entry: ${latestEntry.balance_qty}`);
            console.log(`Sum of Dimension Latests: ${sumOfLatestDims}`);

            if (latestEntry.balance_qty === sumOfLatestDims) {
                console.log('VERDICT: balance_qty is DIMENSION-SPECIFIC (needs SUM).');
            } else {
                console.log('VERDICT: balance_qty is GLOBAL (take latest only).');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

auditBalance();
