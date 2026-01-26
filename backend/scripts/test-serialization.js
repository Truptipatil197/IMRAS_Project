const { Item, sequelize } = require('../models');
const { literal } = require('sequelize');

async function test() {
    try {
        await sequelize.authenticate();
        const item = await Item.findOne({
            where: { item_name: 'Laptop' },
            attributes: {
                include: [
                    [
                        literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`),
                        'current_stock'
                    ]
                ]
            }
        });

        if (item) {
            console.log(`--- SEZ TEST: ${item.item_name} ---`);
            console.log('Value via get:', item.get('current_stock'));
            console.log('Value via JSON:', item.toJSON().current_stock);
        } else {
            console.log('Laptop not found');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        process.exit();
    }
}

test();
