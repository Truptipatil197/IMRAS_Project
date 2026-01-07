const db = require('./models');

async function seedGRNTestData() {
    try {
        console.log('🌱 Seeding GRN test data...\n');
        
        // Step 1: Create a supplier
        const supplier = await db.Supplier.create({
            supplier_name: 'ABC Distributors',
            contact_person: 'Rajesh Kumar',
            email: 'rajesh@abc.com',
            phone: '+91-9876543210',
            address: 'Mumbai, Maharashtra',
            payment_terms_days: 30,
            avg_lead_time_days: 7,
            performance_rating: 4.5
        });
        console.log('✅ Supplier created:', supplier.supplier_id);
        
        // Step 2: Get existing items (make sure you have items)
        const items = await db.Item.findAll({ limit: 3 });
        if (items.length === 0) {
            console.log('❌ No items found. Create items first!');
            process.exit(1);
        }
        console.log('✅ Found items:', items.length);
        
        // Step 3: Create Purchase Requisition
        const pr = await db.PurchaseRequisition.create({
            pr_number: 'PR2025001',
            pr_date: new Date(),
            requested_by: 1, // Assuming user_id 1 exists
            status: 'Approved',
            approved_by: 1,
            approved_date: new Date(),
            remarks: 'Monthly stock replenishment'
        });
        console.log('✅ PR created:', pr.pr_id);
        
        // Step 4: Create PR Items
        for (let item of items) {
            await db.PRItem.create({
                pr_id: pr.pr_id,
                item_id: item.item_id,
                requested_qty: 100,
                justification: 'Stock below reorder point'
            });
        }
        console.log('✅ PR Items created');
        
        // Step 5: Create Purchase Order
        const po = await db.PurchaseOrder.create({
            po_number: 'PO2025001',
            po_date: new Date(),
            supplier_id: supplier.supplier_id,
            pr_id: pr.pr_id,
            status: 'Issued',
            expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            total_amount: 50000.00,
            created_by: 1
        });
        console.log('✅ PO created:', po.po_id);
        
        // Step 6: Create PO Items
        for (let item of items) {
            await db.POItem.create({
                po_id: po.po_id,
                item_id: item.item_id,
                ordered_qty: 100,
                unit_price: item.unit_price,
                total_price: item.unit_price * 100
            });
        }
        console.log('✅ PO Items created');
        
        console.log('\n🎉 GRN test data seeded successfully!');
        console.log(`\nYou can now create GRN for PO: ${po.po_number} (ID: ${po.po_id})`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding GRN test data:', error);
        process.exit(1);
    }
}

seedGRNTestData();