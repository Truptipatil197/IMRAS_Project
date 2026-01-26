const { sequelize, PurchaseOrder, POItem, GRN, GRNItem, StockLedger, Item } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

async function debug() {
    const results = {};
    try {
        // 1. POs
        const pos = await PurchaseOrder.findAll({
            where: { status: { [Op.in]: ['Issued', 'In-Transit'] } },
            include: [{ model: POItem, as: 'poItems' }]
        });
        results.po_count = pos.length;
        results.po_ids = pos.map(p => p.po_id);

        if (pos.length > 0) {
            try {
                const receivedTotals = await GRNItem.findAll({
                    attributes: [
                        [sequelize.col('grn.po_id'), 'po_id'],
                        'item_id',
                        [sequelize.fn('SUM', sequelize.col('accepted_qty')), 'total_received']
                    ],
                    include: [{ model: GRN, as: 'grn', where: { po_id: results.po_ids }, attributes: [] }],
                    group: [sequelize.col('grn.po_id'), 'item_id'],
                    raw: true
                });
                results.received_totals = receivedTotals;
            } catch (e) {
                results.received_totals_error = e.message;
            }
        }

        // 2. Ledger
        const latestLedger = await StockLedger.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']]
        });
        results.latest_ledger = latestLedger.map(l => ({
            id: l.ledger_id,
            transaction_date: l.transaction_date,
            createdAt: l.createdAt,
            type: l.transaction_type
        }));

        // 3. Today check
        const todayStr = new Date().toISOString().split('T')[0];
        results.today_str = todayStr;
        results.movements_count = await StockLedger.count({ where: { transaction_date: todayStr } });

        fs.writeFileSync('debug_results.json', JSON.stringify(results, null, 2));
        console.log('Results written to debug_results.json');
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('debug_error.txt', error.stack);
        console.error('GLOBAL DEBUG ERROR');
        process.exit(1);
    }
}

debug();
