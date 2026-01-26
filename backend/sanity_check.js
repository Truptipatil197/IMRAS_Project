const { sequelize, PurchaseOrder, POItem, GRN, GRNItem, StockLedger, Item } = require('./models');
const { Op } = require('sequelize');

async function check() {
    console.log('--- STAFF DASHBOARD SANITY CHECK ---');

    try {
        // 1. Pending GRNs
        const pos = await PurchaseOrder.findAll({
            where: { status: { [Op.in]: ['Issued', 'In-Transit'] } },
            include: [{ model: POItem, as: 'poItems' }]
        });
        console.log(`PO count: ${pos.length}`);

        let pendingCount = 0;
        for (const po of pos) {
            let hasPending = false;
            const items = po.poItems || [];
            console.log(`Checking PO ${po.po_id} with ${items.length} items`);
            for (const item of items) {
                const received = await GRNItem.sum('accepted_qty', {
                    include: [{ model: GRN, as: 'grn', where: { po_id: po.po_id }, attributes: [] }],
                    where: { item_id: item.item_id }
                }) || 0;
                console.log(`  Item ${item.item_id}: Ordered=${item.ordered_qty}, Received=${received}`);
                if (item.ordered_qty > received) {
                    hasPending = true;
                    break;
                }
            }
            if (hasPending) pendingCount++;
        }
        console.log(`Final Pending GRNs: ${pendingCount}`);

        // 2. Today's Movements
        const today = new Date().toISOString().split('T')[0];
        const todayMovements = await StockLedger.count({
            where: {
                [Op.or]: [
                    { transaction_date: today },
                    { createdAt: { [Op.gte]: new Date(today + 'T00:00:00Z') } }
                ]
            }
        });
        console.log(`Today's Movements: ${todayMovements}`);

        // 3. Tasks
        const tasksCount = await Item.count({
            distinct: true,
            include: [{
                model: StockLedger,
                as: 'stockLedgers',
                required: false
            }]
        });
        console.log(`Stock Count Tasks: ${tasksCount}`);

        process.exit(0);
    } catch (e) {
        console.error('CRASHED:', e);
        process.exit(1);
    }
}

check();
