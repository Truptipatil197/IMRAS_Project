const { StockLedger, sequelize } = require('../models');

async function checkLedger() {
    try {
        await sequelize.authenticate();
        const ledgers = await StockLedger.findAll({
            limit: 20,
            order: [['ledger_id', 'DESC']],
            raw: true
        });

        console.log('ID | Type | Qty | Balance | Raw Qty Type');
        ledgers.forEach(l => {
            console.log(`${l.ledger_id} | ${l.transaction_type} | ${l.quantity} | ${l.balance_qty} | ${typeof l.quantity}`);
        });

    } catch (err) {
        console.error('Ledger check failed:', err);
    } finally {
        process.exit();
    }
}

checkLedger();
