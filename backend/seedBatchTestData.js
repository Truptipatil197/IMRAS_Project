require('dotenv').config();
const db = require('./models');

async function seedBatchTestData() {
  try {
    console.log('🌱 Seeding batch test data with various expiry scenarios...\n');

    // -------------------------
    // 1) Load items (need at least 1)
    // -------------------------
    const items = await db.Item.findAll({ limit: 5 });

    if (!items || items.length === 0) {
      console.log('❌ No items found. Create items first!');
      process.exit(1);
    }

    // Ensure we have 5 entries to reference (duplicate last item if fewer)
    if (items.length < 5) {
      console.warn(`⚠️ Only ${items.length} items found. Duplicating last item to reach 5 references...`);
      while (items.length < 5) {
        items.push(items[items.length - 1]);
      }
    }

    // helper to safely get item_id
    const itemId = (idx) => items[idx].item_id;

    // -------------------------
    // 2) Get or create warehouse
    // -------------------------
    let warehouse = await db.Warehouse.findOne();
    if (!warehouse) {
      console.log('⚠️ No warehouse found. Creating a default warehouse...');
      warehouse = await db.Warehouse.create({
        warehouse_name: 'Default Warehouse - Seeder',
        address: 'Auto-created by seeder',
        city: 'N/A',
        contact_person: 'Seeder',
        phone: '0000000000',
        is_active: true
      });
    }

    // -------------------------
    // 3) Get or create GRN
    // -------------------------
    let grn = await db.GRN.findOne();
    if (!grn) {
      console.log('⚠️ No GRN found. Creating a dummy GRN...');
      const po = await db.PurchaseOrder.findOne();
      grn = await db.GRN.create({
        grn_number: 'GRN-TEST-001',
        grn_date: new Date(),
        po_id: po ? po.po_id : null,
        warehouse_id: warehouse.warehouse_id,
        received_by: 1,
        status: 'Completed'
      });
    }

    // -------------------------
    // 4) Ensure at least one GRN Item exists for the GRN (mandatory for Batch.grn_item_id)
    // -------------------------
    let grnItem = await db.GRNItem.findOne({ where: { grn_id: grn.grn_id } });
    if (!grnItem) {
      console.log('⚠️ No GRNItem found for the GRN. Creating a dummy GRNItem for the first item...');
      // Use the first item for creating a grn item
      grnItem = await db.GRNItem.create({
        grn_id: grn.grn_id,
        item_id: itemId(0),
        po_item_id: null,
        received_qty: 100,
        accepted_qty: 100,
        rejected_qty: 0,
        unit_price: 0
      });
    }

    const grnItemId = grnItem.grn_item_id || grnItem.id || grnItem.grn_itemId; // tolerate different pk names
    if (!grnItemId) {
      throw new Error('❌ Unable to determine grn_item identifier from created/found GRNItem.');
    }

    // -------------------------
    // 5) Prepare scenarios exactly as in your original file (only safe-guarded)
    // -------------------------
    const today = new Date();

    const batchScenarios = [
      {
        // Scenario 1: Already expired (3 days ago)
        item_id: itemId(0),
        batch_number: 'BATCH-EXPIRED-001',
        lot_number: 'LOT-EXP-001',
        manufacturing_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        quantity: 50,
        available_qty: 50,
        status: 'Active'
      },
      {
        // Scenario 2: Expiring in 5 days (Critical - 7 day alert)
        item_id: itemId(1),
        batch_number: 'BATCH-EXP-7DAY-001',
        lot_number: 'LOT-7D-001',
        manufacturing_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        quantity: 100,
        available_qty: 85,
        status: 'Active'
      },
      {
        // Scenario 3: Expiring in 20 days (Medium - 30 day alert)
        item_id: itemId(2),
        batch_number: 'BATCH-EXP-30DAY-001',
        lot_number: 'LOT-30D-001',
        manufacturing_date: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000),
        quantity: 150,
        available_qty: 120,
        status: 'Active'
      },
      {
        // Scenario 4: Valid batch (expiring in 200 days)
        item_id: itemId(3),
        batch_number: 'BATCH-VALID-001',
        lot_number: 'LOT-VALID-001',
        manufacturing_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000),
        quantity: 200,
        available_qty: 150,
        status: 'Active'
      },
      {
        // Scenario 5: Another expired batch (for testing disposal)
        item_id: itemId(0),
        batch_number: 'BATCH-EXPIRED-002',
        lot_number: 'LOT-EXP-002',
        manufacturing_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        quantity: 30,
        available_qty: 30,
        status: 'Active'
      },
      {
        // Scenario 6: Multiple batches for same item (FEFO testing)
        item_id: itemId(4),
        batch_number: 'BATCH-MULTI-A',
        lot_number: 'LOT-MA-001',
        manufacturing_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 40 * 24 * 60 * 60 * 1000),
        quantity: 80,
        available_qty: 70,
        status: 'Active'
      },
      {
        item_id: itemId(4),
        batch_number: 'BATCH-MULTI-B',
        lot_number: 'LOT-MB-001',
        manufacturing_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000),
        quantity: 120,
        available_qty: 120,
        status: 'Active'
      },
      {
        item_id: itemId(4),
        batch_number: 'BATCH-MULTI-C',
        lot_number: 'LOT-MC-001',
        manufacturing_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        expiry_date: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
        quantity: 100,
        available_qty: 100,
        status: 'Active'
      }
    ];

    // -------------------------
    // 6) Create batches (provide mandatory fields: warehouse_id, grn_id, grn_item_id)
    // -------------------------
    for (const batchData of batchScenarios) {
      const toCreate = {
        ...batchData,
        // attach required foreign keys/fields expected by your Batch model
        warehouse_id: warehouse.warehouse_id,
        grn_id: grn.grn_id,
        grn_item_id: grnItemId
      };

      const batch = await db.Batch.create(toCreate);

      const daysToExpiry = Math.floor((batch.expiry_date - today) / (1000 * 60 * 60 * 24));
      const expiryStatus = daysToExpiry < 0 ? 'EXPIRED' :
        daysToExpiry <= 7 ? 'EXPIRING SOON (7 days)' :
        daysToExpiry <= 30 ? 'EXPIRING SOON (30 days)' : 'VALID';

      console.log(`✅ Created batch: ${batch.batch_number} - ${expiryStatus} (${daysToExpiry} days)`);
    }

    console.log('\n🎉 Batch test data seeded successfully!');
    console.log('\nExpiry scenarios created:');
    console.log('- 2 expired batches (for disposal testing)');
    console.log('- 1 batch expiring in 5 days (7-day alert)');
    console.log('- 1 batch expiring in 20 days (30-day alert)');
    console.log('- 1 valid batch (200+ days)');
    console.log('- 3 batches for same item (FEFO testing)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding batch test data:', error);
    process.exit(1);
  }
}

seedBatchTestData();
