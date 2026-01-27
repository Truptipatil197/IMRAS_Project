const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PurchaseRequisition, User } = require('../models');
const { sequelize } = require('../config/database');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // Get raw data to see ID values
        const [results] = await sequelize.query("SELECT pr_id, pr_number, requested_by, status FROM purchase_requisitions WHERE remarks LIKE '%Auto-generated%'");

        console.log('Raw PR data:');
        for (const row of results) {
            console.log(`- PR: ${row.pr_number}, requested_by: ${row.requested_by}, status: ${row.status}`);

            // Check if user exists
            const user = await User.findByPk(row.requested_by);
            if (user) {
                console.log(`  User found: ${user.full_name} (${user.user_id})`);
            } else {
                console.log(`  ❌ USER NOT FOUND for ID ${row.requested_by}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
