const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const { sequelize, User, Category, Item, Warehouse, Location, Supplier, SupplierItem, SupplierRating, PurchaseRequisition, PRItem, PurchaseOrder, POItem, GRN, GRNItem, Batch, StockLedger, Alert } = require('./backend/models');

async function analyzeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('--- Database Analysis Result ---');

        const tables = [
            { name: 'Users', model: User },
            { name: 'Categories', model: Category },
            { name: 'Items', model: Item },
            { name: 'Warehouses', model: Warehouse },
            { name: 'Locations', model: Location },
            { name: 'Suppliers', model: Supplier },
            { name: 'SupplierItems', model: SupplierItem },
            { name: 'PurchaseRequisitions', model: PurchaseRequisition },
            { name: 'PurchaseOrders', model: PurchaseOrder },
            { name: 'GRNs', model: GRN },
            { name: 'Batches', model: Batch },
            { name: 'StockLedgers', model: StockLedger },
            { name: 'Alerts', model: Alert }
        ];

        const stats = {};
        for (const t of tables) {
            stats[t.name] = await t.model.count();
        }
        console.table(stats);

        // Deep checks
        const itemsWithoutSuppliers = await Item.count({
            include: [{ model: SupplierItem, as: 'supplierItems', required: false }],
            where: sequelize.where(sequelize.col('supplierItems.item_id'), null)
        });
        console.log(`- Items without any assigned suppliers: ${itemsWithoutSuppliers}`);

        const itemsWithoutStock = await Item.count({
            include: [{ model: StockLedger, as: 'stockLedgers', required: false }],
            where: sequelize.where(sequelize.col('stockLedgers.item_id'), null)
        });
        console.log(`- Items with no stock ledger history: ${itemsWithoutStock}`);

        const warehousesWithoutLocations = await Warehouse.count({
            include: [{ model: Location, as: 'locations', required: false }],
            where: sequelize.where(sequelize.col('locations.warehouse_id'), null)
        });
        console.log(`- Warehouses with no storage locations: ${warehousesWithoutLocations}`);

        process.exit(0);
    } catch (error) {
        console.error('Analysis Error:', error);
        process.exit(1);
    }
}

analyzeDatabase();
