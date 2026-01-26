const { Item, StockLedger, User, Warehouse, sequelize } = require('../models');

async function inject() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const item = await Item.findOne({ where: { item_name: 'Laptop' } });
        if (!item) {
            console.error('Laptop not found');
            return;
        }

        const user = await User.findOne({ order: [['user_id', 'ASC']] });
        const warehouse = await Warehouse.findOne({ order: [['warehouse_id', 'ASC']] });

        console.log(`Injecting 100 stock for ${item.item_name}...`);

        await StockLedger.create({
            item_id: item.item_id,
            warehouse_id: warehouse.warehouse_id,
            transaction_type: 'Adjustment',
            quantity: 100,
            balance_qty: 100,
            transaction_date: new Date(),
            reference_type: 'Manual Demo Adjustment',
            created_by: user.user_id
        });

        console.log('✅ Stock injected successfully. Please refresh the Inventory tab!');

    } catch (err) {
        console.error('Inject Failed:', err);
    } finally {
        process.exit();
    }
}

inject();
