const { StockLedger, sequelize } = require('../models');

async function checkApi() {
    try {
        await sequelize.authenticate();
        const ledgers = await StockLedger.findAll();

        console.log(`Checking ${ledgers.length} total records...`);
        let count = 0;
        ledgers.forEach(l => {
            if (typeof l.quantity === 'string' || String(l.quantity).includes('+')) {
                console.log(`GLITCH FOUND: ID ${l.ledger_id} | Qty: "${l.quantity}" | Typed: ${typeof l.quantity}`);
                count++;
            }
        });

        console.log(`Finished. Found ${count} glitches.`);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkApi();
