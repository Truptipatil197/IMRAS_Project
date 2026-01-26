const { StockLedger } = require('./models');
const fs = require('fs');

async function debug() {
    try {
        const ledgers = await StockLedger.findAll({
            limit: 10,
            order: [['ledger_id', 'DESC']]
        });

        const output = ledgers.map(l => ({
            ledger_id: l.ledger_id,
            transaction_date: l.transaction_date,
            createdAt: l.createdAt,
            type: l.transaction_type
        }));

        fs.writeFileSync('ledger_debug.json', JSON.stringify(output, null, 2));
        console.log('Ledger debug wrote to ledger_debug.json');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
