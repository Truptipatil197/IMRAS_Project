const { Item, sequelize } = require('../models');
const { Op } = require('sequelize');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // Replicate the query in reorderService.js:30
        const query = {
            where: {
                is_active: true,
                [Op.or]: [
                    { min_stock: { [Op.gt]: 0 } },
                    { reorder_point: { [Op.gt]: 0 } }
                ]
            }
        };

        console.log('Query:', JSON.stringify(query, null, 2));

        const totalActive = await Item.count({ where: { is_active: true } });
        console.log('Total is_active items:', totalActive);

        const items = await Item.findAll(query);
        console.log('Items matching reorder criteria:', items.length);

        if (items.length === 0) {
            console.log('\n--- Sample items check ---');
            const samples = await Item.findAll({ limit: 5 });
            samples.forEach(s => {
                console.log(`Item: ${s.item_name}`);
                console.log(`  is_active: ${s.is_active}`);
                console.log(`  min_stock: ${s.min_stock}`);
                console.log(`  reorder_point: ${s.reorder_point}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
