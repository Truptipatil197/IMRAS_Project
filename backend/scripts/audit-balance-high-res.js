const { StockLedger, Item, sequelize } = require('../models');
const { fn, col, Op } = require('sequelize');

async function auditBalance() {
    try {
        await sequelize.authenticate();

        // Find items with multiple locations
        let items = await StockLedger.findAll({
            attributes: ['item_id', [fn('COUNT', fn('DISTINCT', col('location_id'))), 'loc_count']],
            group: ['item_id'],
            having: sequelize.literal('COUNT(DISTINCT location_id) > 1'),
            limit: 3,
            raw: true
        });

        if (items.length === 0) {
            console.log('No multi-location data found. Checking items with any history...');
            items = await StockLedger.findAll({
                attributes: ['item_id'],
                group: ['item_id'],
                limit: 3,
                raw: true
            });
        }

        for (const itemRecord of items) {
            const item = await Item.findByPk(itemRecord.item_id);
            if (!item) continue;

            const history = await StockLedger.findAll({
                where: { item_id: item.item_id },
                order: [['ledger_id', 'ASC']],
                raw: true
            });

            console.log(`\n--- ITEM: ${item.item_name} (ID: ${item.item_id}) ---`);
            console.log('ID | LOC | BATCH | Qty | Balance');

            let locBalances = {};
            let totalQtySum = 0;

            history.forEach(e => {
                const dimKey = `${e.location_id || 'NULL'}-${e.batch_id || 'NULL'}`;
                locBalances[dimKey] = e.balance_qty;
                totalQtySum += e.quantity;
                console.log(`${e.ledger_id} | ${e.location_id || 'NULL'} | ${e.batch_id || 'NULL'} | ${e.quantity} | ${e.balance_qty}`);
            });

            const latestEntry = history[history.length - 1];
            const sumOfLatestDims = Object.values(locBalances).reduce((a, b) => a + (parseFloat(b) || 0), 0);

            console.log(`- Qty Sum Total:   ${totalQtySum}`);
            console.log(`- Latest Entry Bal: ${latestEntry.balance_qty}`);
            console.log(`- Dim Latest Sum:   ${sumOfLatestDims}`);

            if (latestEntry.balance_qty === totalQtySum) {
                console.log('VERDICT: balance_qty is GLOBAL (Warehouse Total).');
            } else if (sumOfLatestDims === totalQtySum) {
                console.log('VERDICT: balance_qty is LOCAL (Location/Batch specific).');
            } else {
                console.log('VERDICT: DATA INCONSISTENT or complex logic.');
            }
        }

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        process.exit();
    }
}

auditBalance();
