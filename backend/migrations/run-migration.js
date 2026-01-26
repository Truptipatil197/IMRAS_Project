/**
 * Standalone Migration Script: Add min_stock and max_stock to items table
 * Run with: node migrations/run-migration.js
 */

const { sequelize } = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

async function runMigration() {
    console.log('🔄 Starting migration: Add min_stock and max_stock to items table...\n');

    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Check if columns already exist
        const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'imras_db'}' 
        AND TABLE_NAME = 'items' 
        AND COLUMN_NAME IN ('min_stock', 'max_stock')
    `);

        if (results.length > 0) {
            console.log('⚠️  Columns already exist. Skipping migration.');
            console.log('   Existing columns:', results.map(r => r.COLUMN_NAME).join(', '));
            await sequelize.close();
            return;
        }

        console.log('📝 Adding min_stock column...');
        await sequelize.query(`
      ALTER TABLE items 
      ADD COLUMN min_stock INT NOT NULL DEFAULT 0 
      COMMENT 'Minimum stock level - triggers reorder when stock <= min_stock'
    `);
        console.log('✅ min_stock column added\n');

        console.log('📝 Adding max_stock column...');
        await sequelize.query(`
      ALTER TABLE items 
      ADD COLUMN max_stock INT NOT NULL DEFAULT 0 
      COMMENT 'Maximum stock level - reorder quantity = max_stock - current_stock'
    `);
        console.log('✅ max_stock column added\n');

        console.log('📝 Populating default values...');
        await sequelize.query(`
      UPDATE items 
      SET min_stock = reorder_point,
          max_stock = GREATEST(reorder_point + safety_stock + 100, reorder_point * 2)
      WHERE min_stock = 0 AND max_stock = 0
    `);
        console.log('✅ Default values populated\n');

        // Verify the changes
        const [verifyResults] = await sequelize.query(`
      SELECT 
        item_id, 
        item_name, 
        reorder_point, 
        min_stock, 
        max_stock, 
        safety_stock 
      FROM items 
      LIMIT 5
    `);

        console.log('📊 Sample data after migration:');
        console.table(verifyResults);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   - Added min_stock column to items table');
        console.log('   - Added max_stock column to items table');
        console.log('   - Populated default values based on existing reorder_point and safety_stock');
        console.log('\n🚀 You can now restart the server to use the new fields.');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run migration
runMigration();
