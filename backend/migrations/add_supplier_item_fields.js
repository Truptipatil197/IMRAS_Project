/**
 * Migration: Add extended fields to supplier_items table
 */

const { sequelize } = require('../config/database');

const addSupplierItemFields = async () => {
  const qi = sequelize.getQueryInterface();
  const columns = [
    { name: 'max_order_qty', type: 'INT NULL' },
    { name: 'discount_percentage', type: 'DECIMAL(5,2) DEFAULT 0.0' },
    { name: 'effective_from', type: 'DATE NULL' },
    { name: 'effective_to', type: 'DATE NULL' },
    { name: 'is_preferred', type: 'TINYINT(1) DEFAULT 0' }
  ];

  for (const col of columns) {
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'supplier_items'
      AND COLUMN_NAME = '${col.name}'
    `);
    if (results.length === 0) {
      console.log(`Adding column supplier_items.${col.name}`);
      await sequelize.query(`ALTER TABLE supplier_items ADD COLUMN ${col.name} ${col.type}`);
    } else {
      console.log(`Column supplier_items.${col.name} already exists, skipping`);
    }
  }

  console.log('✅ supplier_items fields migration completed');
};

if (require.main === module) {
  addSupplierItemFields()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = addSupplierItemFields;

