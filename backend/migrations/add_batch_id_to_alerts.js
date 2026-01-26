/**
 * Migration: Add batch_id column to alerts table
 * Run this script to update your database schema
 */

const { sequelize } = require('../config/database');

const addBatchIdToAlerts = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Adding batch_id column to alerts table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'alerts' 
      AND COLUMN_NAME = 'batch_id'
    `);
    
    if (results.length > 0) {
      console.log('✅ batch_id column already exists in alerts table');
      return;
    }
    
    // Add batch_id column
    await queryInterface.addColumn('alerts', 'batch_id', {
      type: sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'batch_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    // Add index for better query performance
    await queryInterface.addIndex('alerts', ['batch_id'], {
      name: 'idx_alerts_batch_id'
    });
    
    console.log('✅ Successfully added batch_id column to alerts table');
    console.log('✅ Added index on batch_id');
    
  } catch (error) {
    console.error('❌ Error adding batch_id column:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addBatchIdToAlerts()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addBatchIdToAlerts;

