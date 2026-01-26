/**
 * Migration: Add extended fields to suppliers table
 */

const { sequelize } = require('../config/database');

const addSupplierFields = async () => {
  const qi = sequelize.getQueryInterface();
  const columns = [
    { name: 'alternate_phone', type: 'STRING(20)' },
    { name: 'city', type: 'STRING(50)' },
    { name: 'state', type: 'STRING(50)' },
    { name: 'country', type: "STRING(50) DEFAULT 'India'" },
    { name: 'postal_code', type: 'STRING(20)' },
    { name: 'gstin', type: 'STRING(20)' },
    { name: 'pan_number', type: 'STRING(20)' },
    { name: 'credit_limit', type: 'DECIMAL(12,2) DEFAULT 0.0' },
    { name: 'bank_details', type: 'TEXT' }
  ];

  for (const col of columns) {
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'suppliers'
      AND COLUMN_NAME = '${col.name}'
    `);
    if (results.length === 0) {
      console.log(`Adding column suppliers.${col.name}`);
      await sequelize.query(`ALTER TABLE suppliers ADD COLUMN ${col.name} ${col.type}`);
    } else {
      console.log(`Column suppliers.${col.name} already exists, skipping`);
    }
  }

  console.log('✅ supplier fields migration completed');
};

if (require.main === module) {
  addSupplierFields()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = addSupplierFields;

