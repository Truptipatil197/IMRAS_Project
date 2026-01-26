require('dotenv').config();
const db = require('./models');

async function seedSupplierTestData() {
  try {
    console.log('🌱 Seeding supplier test data...\n');

    const items = await db.Item.findAll({ limit: 10 });
    if (!items.length) {
      console.log('❌ No items found. Create items first!');
      process.exit(1);
    }

    const suppliers = [
      {
        supplier_name: 'Premium Foods India Pvt Ltd',
        contact_person: 'Amit Kumar',
        email: 'amit@premiumfoods.com',
        phone: '+91-9876543210',
        address: '123 Industrial Area, Phase 2',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postal_code: '400001',
        gstin: '27AABCU9603R1ZM',
        pan_number: 'AABCU9603R',
        payment_terms_days: 30,
        avg_lead_time_days: 5,
        credit_limit: 1000000.0,
        performance_rating: 4.7,
        is_active: true
      },
      {
        supplier_name: 'Quick Logistics Suppliers',
        contact_person: 'Priya Sharma',
        email: 'priya@quicklogistics.com',
        phone: '+91-9876543220',
        address: '456 Trade Center',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        postal_code: '110001',
        gstin: '07AABCU9604R1ZN',
        pan_number: 'AABCU9604R',
        payment_terms_days: 45,
        avg_lead_time_days: 3,
        credit_limit: 500000.0,
        performance_rating: 4.2,
        is_active: true
      },
      {
        supplier_name: 'Budget Wholesale Ltd',
        contact_person: 'Rahul Verma',
        email: 'rahul@budgetwholesale.com',
        phone: '+91-9876543230',
        address: '789 Market Road',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        postal_code: '411001',
        payment_terms_days: 30,
        avg_lead_time_days: 10,
        credit_limit: 300000.0,
        performance_rating: 3.5,
        is_active: true
      },
      {
        supplier_name: 'Unreliable Traders',
        contact_person: 'Suresh Patel',
        email: 'suresh@unreliable.com',
        phone: '+91-9876543240',
        address: '321 Old Market',
        city: 'Nagpur',
        state: 'Maharashtra',
        country: 'India',
        postal_code: '440001',
        payment_terms_days: 15,
        avg_lead_time_days: 12,
        credit_limit: 200000.0,
        performance_rating: 2.8,
        is_active: true
      },
      {
        supplier_name: 'Inactive Suppliers Co',
        contact_person: 'Deepak Singh',
        email: 'deepak@inactive.com',
        phone: '+91-9876543250',
        address: '654 Commerce Street',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postal_code: '560001',
        payment_terms_days: 30,
        avg_lead_time_days: 7,
        credit_limit: 400000.0,
        performance_rating: 4.0,
        is_active: false
      }
    ];

    console.log('Creating suppliers...\n');

    for (let index = 0; index < suppliers.length; index++) {
      const supplierData = suppliers[index];

      const supplier = await db.Supplier.create(supplierData);
      await supplier.reload();

      console.log(`✅ Created: ${supplier.supplier_name}`);

      const itemsCount = items.length;

      if (index === 0) {
        for (let i = 0; i < Math.min(8, itemsCount); i++) {
          const item = items[i];
          const discountPct = 5 + Math.random() * 3;
          const supplierPrice = item.unit_price * (1 - discountPct / 100);

          await db.SupplierItem.create({
            supplier_id: supplier.supplier_id,
            item_id: item.item_id,
            unit_price: supplierPrice.toFixed(2),
            min_order_qty: 50,
            max_order_qty: 5000
          });
        }
        console.log("   → Premium items linked");
      }

      if (index === 1) {
        for (let i = 0; i < Math.min(6, itemsCount); i++) {
          const item = items[i];
          const discountPct = 3 + Math.random() * 2;
          const supplierPrice = item.unit_price * (1 - discountPct / 100);

          await db.SupplierItem.create({
            supplier_id: supplier.supplier_id,
            item_id: item.item_id,
            unit_price: supplierPrice.toFixed(2),
            min_order_qty: 100,
            max_order_qty: 4000
          });
        }
        console.log("   → Moderate pricing linked");
      }

      if (index === 2) {
        for (let i = 0; i < Math.min(10, itemsCount); i++) {
          const item = items[i];
          const discountPct = 8 + Math.random() * 2;
          const supplierPrice = item.unit_price * (1 - discountPct / 100);

          await db.SupplierItem.create({
            supplier_id: supplier.supplier_id,
            item_id: item.item_id,
            unit_price: supplierPrice.toFixed(2),
            min_order_qty: 200,
            max_order_qty: 6000
          });
        }
        console.log("   → Budget pricing linked");
      }

      if (index === 3) {
        for (let i = 0; i < Math.min(5, itemsCount); i++) {
          const item = items[i];
          const discountPct = 4 + Math.random() * 2;
          const supplierPrice = item.unit_price * (1 - discountPct / 100);

          await db.SupplierItem.create({
            supplier_id: supplier.supplier_id,
            item_id: item.item_id,
            unit_price: supplierPrice.toFixed(2),
            min_order_qty: 150,
            max_order_qty: 3000
          });
        }
        console.log("   → Average pricing linked");
      }
    }

    console.log("\n🎉 Supplier test data seeded successfully!\n");
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding supplier test data:', error);
    process.exit(1);
  }
}

seedSupplierTestData();

