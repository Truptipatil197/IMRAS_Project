/**
 * Migration: Create supplier_ratings table
 */

const { sequelize } = require('../config/database');

const createSupplierRatingsTable = async () => {
  const qi = sequelize.getQueryInterface();

  const [exists] = await sequelize.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'supplier_ratings'
  `);
  if (exists.length > 0) {
    console.log('✅ supplier_ratings table already exists');
    return;
  }

  await qi.createTable('supplier_ratings', {
    rating_id: {
      type: sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    supplier_id: {
      type: sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'suppliers', key: 'supplier_id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    po_id: {
      type: sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'purchase_orders', key: 'po_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    rating_type: {
      type: sequelize.DataTypes.ENUM('Overall', 'Delivery', 'Quality', 'Pricing', 'Communication'),
      allowNull: false
    },
    rating: {
      type: sequelize.DataTypes.DECIMAL(3, 2),
      allowNull: false
    },
    comments: {
      type: sequelize.DataTypes.TEXT,
      allowNull: true
    },
    rated_by: {
      type: sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    created_at: {
      type: sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  await qi.addIndex('supplier_ratings', ['supplier_id'], { name: 'idx_supplier_ratings_supplier_id' });
  await qi.addIndex('supplier_ratings', ['po_id'], { name: 'idx_supplier_ratings_po_id' });
  await qi.addIndex('supplier_ratings', ['rating_type'], { name: 'idx_supplier_ratings_rating_type' });

  console.log('✅ supplier_ratings table created');
};

if (require.main === module) {
  createSupplierRatingsTable()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createSupplierRatingsTable;

