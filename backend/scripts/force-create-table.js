const { sequelize } = require('../models');

async function createTable() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        console.log('Attempting manual table creation...');
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS reorder_queue (
        queue_id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        warehouse_id INT,
        current_stock DECIMAL(10, 2) NOT NULL,
        reorder_point DECIMAL(10, 2) NOT NULL,
        safety_stock DECIMAL(10, 2) DEFAULT 0,
        suggested_quantity DECIMAL(10, 2) NOT NULL,
        priority_score INT DEFAULT 50,
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        pr_id INT,
        alert_id INT,
        processed_at DATETIME,
        failure_reason TEXT,
        retry_count INT DEFAULT 0,
        scheduler_log_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (item_id),
        INDEX (warehouse_id),
        INDEX (status)
      ) ENGINE=InnoDB;
    `);

        console.log('✅ SQL Execution finished.');

        const [results] = await sequelize.query("SHOW TABLES LIKE 'reorder_queue'");
        if (results.length > 0) {
            console.log('🎉 Table reorder_queue NOW EXISTS!');
        } else {
            console.log('❌ TABLE STILL MISSING AFTER SQL CREATE!');
        }

    } catch (err) {
        console.error('SQL Failed:', err.stack || err.message);
    } finally {
        process.exit();
    }
}

createTable();
