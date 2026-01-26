const { sequelize, Supplier, PurchaseOrder, StockLedger, Item, POItem } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

async function investigate() {
    const results = {};
    try {
        results.supplier_count = await Supplier.count();
        results.completed_po_count = await PurchaseOrder.count({ where: { status: 'Completed' } });
        results.issue_count = await StockLedger.count({ where: { transaction_type: 'Issue' } });

        // Check association
        const poWithItems = await PurchaseOrder.findOne({
            include: [{ model: POItem, as: 'poItems' }]
        });

        results.po_item_association_test = {
            po_id: poWithItems ? poWithItems.po_id : null,
            item_count: (poWithItems && poWithItems.poItems) ? poWithItems.poItems.length : 'MISSING'
        };

        // Check raw table for items
        const rawPOItemsCount = await POItem.count();
        results.raw_po_items_count = rawPOItemsCount;

        fs.writeFileSync('investigate_results.json', JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        fs.writeFileSync('investigate_error.txt', e.stack);
        process.exit(1);
    }
}

investigate();
