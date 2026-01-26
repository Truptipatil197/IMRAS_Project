const { Supplier, sequelize } = require('../models');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const s = await Supplier.findOne({ where: { is_active: true } });
        if (s) {
            console.log(`Found Active Supplier: ${s.supplier_name} (ID: ${s.supplier_id})`);
        } else {
            console.log('NO ACTIVE SUPPLIERS FOUND');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
