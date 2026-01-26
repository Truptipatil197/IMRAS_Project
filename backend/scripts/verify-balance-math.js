const { StockLedger, Item, Warehouse, Location, sequelize } = require('../models');
const { fn, col, Op } = require('sequelize');

async function verify() {
    try {
        await sequelize.authenticate();

        // 1. Setup Data
        const item = await Item.findOne({ where: { item_name: 'Laptop' } });
        if (!item) return console.log('Laptop not found');

        const warehouse = await Warehouse.findByPk(1);
        const location = await Location.findOne({ where: { warehouse_id: 1 } });

        if (!location) return console.log('No location found in WH 1');

        console.log(`--- INITIAL STATE (${item.item_name}) ---`);
        const initialTotal = await getWarehouseTotal(item.item_id, warehouse.warehouse_id);
        console.log(`Total Warehouse Stock: ${initialTotal}`);

        // 2. Perform Mock Transfer to specific Location
        const transferQty = 10;
        console.log(`\n--- SIMULATING TRANSFER OF ${transferQty} UNITS TO ${location.location_code} ---`);

        // a. Record 'Out' from NULL location
        const currentNull = await getDimensionStock(item.item_id, warehouse.warehouse_id, null);
        await StockLedger.create({
            item_id: item.item_id,
            warehouse_id: warehouse.warehouse_id,
            location_id: null,
            transaction_type: 'Transfer',
            quantity: -transferQty,
            balance_qty: currentNull - transferQty,
            transaction_date: new Date(),
            created_by: 1
        });

        // b. Record 'In' to SPECIFIC location
        const currentLoc = await getDimensionStock(item.item_id, warehouse.warehouse_id, location.location_id);
        await StockLedger.create({
            item_id: item.item_id,
            warehouse_id: warehouse.warehouse_id,
            location_id: location.location_id,
            transaction_type: 'Transfer',
            quantity: transferQty,
            balance_qty: currentLoc + transferQty,
            transaction_date: new Date(),
            created_by: 1
        });

        console.log('\n--- VERIFICATION ---');
        const finalTotal = await getWarehouseTotal(item.item_id, warehouse.warehouse_id);
        console.log(`Final Warehouse Stock (must be ${initialTotal}): ${finalTotal}`);

        const latestNullRecord = await StockLedger.findOne({ where: { item_id: item.item_id, location_id: null }, order: [['ledger_id', 'DESC']] });
        const latestLocRecord = await StockLedger.findOne({ where: { item_id: item.item_id, location_id: location.location_id }, order: [['ledger_id', 'DESC']] });

        console.log(`Latest NULL Balance: ${latestNullRecord.balance_qty}`);
        console.log(`Latest LOC Balance:  ${latestLocRecord.balance_qty}`);

        if (finalTotal === initialTotal) {
            console.log('\n✅ SUCCESS: Calculation is accurate Across Multiple Locations!');
        } else {
            console.log('\n❌ FAILURE: Stock leak detected!');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        process.exit();
    }
}

async function getWarehouseTotal(item_id, warehouse_id) {
    const latestBalances = await StockLedger.findAll({
        attributes: [
            [fn('MAX', col('ledger_id')), 'max_id']
        ],
        where: { item_id, warehouse_id },
        group: ['item_id', 'warehouse_id', 'location_id', 'batch_id'],
        raw: true
    });

    if (latestBalances.length === 0) return 0;

    const maxIds = latestBalances.map(b => b.max_id);
    const sumResult = await StockLedger.sum('balance_qty', {
        where: { ledger_id: { [Op.in]: maxIds } }
    });
    return parseFloat(sumResult || 0);
}

async function getDimensionStock(item_id, warehouse_id, location_id) {
    const latest = await StockLedger.findOne({
        where: { item_id, warehouse_id, location_id },
        order: [['ledger_id', 'DESC']],
        raw: true
    });
    return parseFloat(latest?.balance_qty || 0);
}

verify();
