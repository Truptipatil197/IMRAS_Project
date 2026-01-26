const { StockLedger, Item, Warehouse, sequelize } = require('../models');
const { fn, col, Op } = require('sequelize');

async function testBalance() {
    try {
        await sequelize.authenticate();
        const item = await Item.findOne({ where: { item_name: 'Laptop' } });
        if (!item) return console.log('Laptop not found');

        const itemId = item.item_id;

        // Logic from stockController.js
        const latestWarehouseEntries = await StockLedger.findAll({
            attributes: [
                'warehouse_id',
                [fn('MAX', col('ledger_id')), 'max_id']
            ],
            where: { item_id: itemId },
            group: ['warehouse_id', 'location_id', 'batch_id'],
            raw: true
        });

        console.log('LATEST ENTRIES:', latestWarehouseEntries);

        const maxWhIds = latestWarehouseEntries.map(e => e.max_id);
        const warehouseData = await StockLedger.findAll({
            where: { ledger_id: { [Op.in]: maxWhIds } },
            include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }]
        });

        const warehouseMap = {};
        let totalStock = 0;

        for (const ledger of warehouseData) {
            const whId = ledger.warehouse_id;
            if (!warehouseMap[whId]) {
                warehouseMap[whId] = {
                    warehouse_id: whId,
                    warehouse_name: ledger.warehouse?.warehouse_name || 'Unknown',
                    total_stock: 0,
                    current_stock: 0,
                    locations: []
                };
            }

            const bal = parseFloat(ledger.balance_qty || 0);
            warehouseMap[whId].total_stock += bal;
            warehouseMap[whId].current_stock = warehouseMap[whId].total_stock;
            totalStock += bal;
        }

        console.log('STOCK BY WAREHOUSE:', JSON.stringify(warehouseMap, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testBalance();
