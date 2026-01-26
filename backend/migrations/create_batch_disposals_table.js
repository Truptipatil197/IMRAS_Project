/**
 * Migration: Create batch_disposals table
 * Run this script to create the batch_disposals table for tracking batch disposals
 */

const { sequelize } = require('../config/database');

const createBatchDisposalsTable = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Creating batch_disposals table...');
    
    // Check if table already exists
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'batch_disposals'
    `);
    
    if (results.length > 0) {
      console.log('✅ batch_disposals table already exists');
      return;
    }
    
    // Create batch_disposals table
    await queryInterface.createTable('batch_disposals', {
      disposal_id: {
        type: sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      batch_id: {
        type: sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'batch_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      disposal_qty: {
        type: sequelize.DataTypes.INTEGER,
        allowNull: false
      },
      disposal_reason: {
        type: sequelize.DataTypes.STRING(200),
        allowNull: false
      },
      disposal_method: {
        type: sequelize.DataTypes.STRING(100),
        allowNull: true
      },
      disposal_date: {
        type: sequelize.DataTypes.DATEONLY,
        allowNull: false
      },
      disposal_cost: {
        type: sequelize.DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.0
      },
      remarks: {
        type: sequelize.DataTypes.TEXT,
        allowNull: true
      },
      disposed_by: {
        type: sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onDelete: 'RESTRICT',
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
    
    // Add indexes
    await queryInterface.addIndex('batch_disposals', ['batch_id'], {
      name: 'idx_batch_disposals_batch_id'
    });
    
    await queryInterface.addIndex('batch_disposals', ['disposed_by'], {
      name: 'idx_batch_disposals_disposed_by'
    });
    
    await queryInterface.addIndex('batch_disposals', ['disposal_date'], {
      name: 'idx_batch_disposals_disposal_date'
    });
    
    console.log('✅ Successfully created batch_disposals table');
    console.log('✅ Added indexes on batch_id, disposed_by, and disposal_date');
    
  } catch (error) {
    console.error('❌ Error creating batch_disposals table:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createBatchDisposalsTable()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createBatchDisposalsTable;

