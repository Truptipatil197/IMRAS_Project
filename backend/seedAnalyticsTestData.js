const db = require('./models');

async function seedAnalyticsTestData() {
    try {
        console.log('🌱 Seeding analytics test data...\n');
        
        // Get existing items
        const items = await db.Item.findAll({ limit: 10 });
        if (items.length === 0) {
            console.log('❌ No items found. Create items first!');
            process.exit(1);
        }
        
        const warehouse = await db.Warehouse.findOne();
        if (!warehouse) {
            console.log('❌ No warehouse found!');
            process.exit(1);
        }
        
        console.log('Creating historical stock movements for analytics...\n');
        
        const today = new Date();

        // Loop through first 10 items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Initial Stock = Higher to prevent negative balances
            let balance = 1500;

            // Insert initial GRN entry (6 months ago)
            await db.StockLedger.create({
                item_id: item.item_id,
                warehouse_id: warehouse.warehouse_id,
                transaction_type: 'GRN',
                quantity: balance,
                balance_qty: balance,
                transaction_date: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
                reference_type: 'Initial Stock',
                created_by: 1
            });

            // Create 6 months of usage
            for (let month = 5; month >= 0; month--) {
                const transactionDate = new Date(
                    today.getTime() - month * 30 * 24 * 60 * 60 * 1000
                );

                // Fast / Medium / Slow moving items
                let issueQty;
                if (i < 3) {
                    issueQty = 150 + Math.floor(Math.random() * 100); // 150–250
                } else if (i < 6) {
                    issueQty = 50 + Math.floor(Math.random() * 50); // 50–100
                } else {
                    issueQty = 10 + Math.floor(Math.random() * 20); // 10–30
                }

                // Ensure we never go below 0
                if (issueQty > balance) {
                    issueQty = balance;
                }

                // Subtract balance
                balance -= issueQty;

                // Create issue transaction
                await db.StockLedger.create({
                    item_id: item.item_id,
                    warehouse_id: warehouse.warehouse_id,
                    transaction_type: 'Issue',
                    quantity: -issueQty,
                    balance_qty: balance,
                    transaction_date: transactionDate,
                    reference_type: 'Order Fulfillment',
                    created_by: 1
                });

                console.log(`✅ ${item.item_name} — Month ${6 - month}: issued ${issueQty} units`);
            }
        }

        console.log('\n🎉 Analytics test data seeded successfully!');
        console.log('\nYou now have:');
        console.log('- 6 months of historical consumption data');
        console.log('- Fast, medium, and slow-moving items');
        console.log('- Valid stock balances (never negative)');
        console.log('- Data ready for charts & forecasting\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding analytics test data:', error);
        process.exit(1);
    }
}

seedAnalyticsTestData();
