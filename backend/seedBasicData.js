const db = require('./models');

async function seedData() {
    try {
        console.log('🌱 Seeding basic test data...\n');
        
        // Create categories
        const categories = await db.Category.bulkCreate([
            { category_name: 'Groceries - Rice & Grains', description: 'Rice, wheat, pulses' },
            { category_name: 'Groceries - Oil & Ghee', description: 'Cooking oils and ghee' },
            { category_name: 'Beverages', description: 'Tea, coffee, drinks' },
        ]);
        console.log('✅ Categories created:', categories.length);
        
        // Create warehouses
        const warehouses = await db.Warehouse.bulkCreate([
            {
                warehouse_name: 'Central Warehouse - Nagpur',
                address: 'Plot No. 45, MIDC Hingna',
                city: 'Nagpur',
                contact_person: 'Ramesh Deshmukh',
                phone: '+91-712-2345678'
            }
        ]);
        console.log('✅ Warehouses created:', warehouses.length);
        
        // Create locations
        const locations = await db.Location.bulkCreate([
            { warehouse_id: 1, aisle: 'A', rack: '01', bin: '01', location_code: 'NGP-A-01-01', capacity: 500 },
            { warehouse_id: 1, aisle: 'A', rack: '01', bin: '02', location_code: 'NGP-A-01-02', capacity: 500 },
        ]);
        console.log('✅ Locations created:', locations.length);
        
        console.log('\n🎉 Basic test data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();