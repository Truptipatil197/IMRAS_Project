const db = require('./models');

async function seedReorderTestData() {
    try {
        console.log('🌱 Seeding reorder test data...\n');
        
        // Get existing items
        const items = await db.Item.findAll({ limit: 5 });
        
        if (items.length === 0) {
            console.log('❌ No items found. Create items first!');
            process.exit(1);
        }
        
        // Update some items to have stock below reorder point
        // This simulates low stock scenario
        for (let i = 0; i < Math.min(3, items.length); i++) {
            await items[i].update({
                reorder_point: 100,
                safety_stock: 50
            });
            console.log(`✅ Updated ${items[i].item_name} - Reorder point: 100, Safety stock: 50`);
        }
        
        // Create a supplier if doesn't exist
        let supplier = await db.Supplier.findOne();
        if (!supplier) {
            supplier = await db.Supplier.create({
                supplier_name: 'XYZ Suppliers Ltd',
                contact_person: 'Amit Kumar',
                email: 'amit@xyzsuppliers.com',
                phone: '+91-9876543210',
                address: 'Delhi, India',
                payment_terms_days: 30,
                avg_lead_time_days: 7,
                performance_rating: 4.5
            });
            console.log('✅ Supplier created:', supplier.supplier_id);
        }
        
        // Link supplier with items (add pricing)
        for (let item of items) {
            const exists = await db.SupplierItem.findOne({
                where: { supplier_id: supplier.supplier_id, item_id: item.item_id }
            });
            
            if (!exists) {
                await db.SupplierItem.create({
                    supplier_id: supplier.supplier_id,
                    item_id: item.item_id,
                    unit_price: item.unit_price * 0.95, // 5% discount
                    min_order_qty: 50
                });
                console.log(`✅ Linked ${item.item_name} with supplier`);
            }
        }
        
        console.log('\n🎉 Reorder test data seeded successfully!');
        console.log('\nNow you can:');
        console.log('1. Run reorder check to create alerts');
        console.log('2. Create PRs from alerts');
        console.log('3. Approve PRs');
        console.log('4. Create POs from approved PRs\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding reorder test data:', error);
        process.exit(1);
    }
}

seedReorderTestData();