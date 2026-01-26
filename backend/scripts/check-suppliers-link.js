const { Item, SupplierItem, Supplier, sequelize } = require('../models');

async function checkSuppliers() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const needingReorder = [5, 6, 7, 8, 9, 10, 11];

        for (const itemId of needingReorder) {
            const suppliers = await SupplierItem.findAll({
                where: { item_id: itemId },
                include: [{ model: Supplier, as: 'supplier' }]
            });
            console.log(`Item ID: ${itemId}`);
            console.log(`  Total Suppliers: ${suppliers.length}`);
            suppliers.forEach(s => {
                console.log(`    - ${s.supplier ? s.supplier.supplier_name : 'No Name'} (Preferred: ${s.is_preferred})`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSuppliers();
