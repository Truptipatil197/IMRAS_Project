const { Item, StockLedger, PurchaseRequisition, PRItem, SupplierItem, sequelize, User } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const fs = require('fs');

async function check() {
    let log = '';
    try {
        await sequelize.authenticate();
        log += '✅ DB Connected\n';

        const items = await Item.findAll({
            where: { is_active: true }
        });

        log += `Auditing ${items.length} items:\n\n`;

        for (const item of items) {
            // 1. Get current stock
            const stockResult = await StockLedger.findOne({
                attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'total']],
                where: { item_id: item.item_id },
                raw: true
            });
            const stock = parseFloat(stockResult?.total || 0);

            // 2. Reorder point
            const rp = item.reorder_point || 0;
            const min = item.min_stock || 0;

            // 3. Existing PR
            const existingPR = await PurchaseRequisition.findOne({
                include: [{
                    model: PRItem,
                    as: 'prItems',
                    where: { item_id: item.item_id },
                    required: true
                }],
                where: {
                    status: { [Op.in]: ['Pending', 'Approved'] }
                }
            });

            // 4. Supplier
            const supplier = await SupplierItem.findOne({
                where: { item_id: item.item_id, is_preferred: true }
            });

            const status = (stock <= (min || rp)) ? 'NEED' : 'OK';

            log += `[${status}] Item: ${item.item_name} (ID: ${item.item_id})\n`;
            log += `  Stock: ${stock}, Min: ${min}, RP: ${rp}\n`;
            log += `  Existing PR: ${existingPR ? 'YES (' + existingPR.pr_number + ')' : 'NO'}\n`;
            log += `  Preferred Supplier: ${supplier ? 'YES' : 'NO'}\n`;
            log += `  ---\n`;
        }

        // Check system user
        const systemUser = await User.findOne({
            where: { role: { [Op.in]: ['Admin', 'Manager'] }, is_active: true }
        });
        log += `\nSystem User for PR creation: ${systemUser ? systemUser.username : 'MISSING'}\n`;

    } catch (err) {
        log += `Error: ${err.message}\n`;
        console.error(err);
    } finally {
        fs.writeFileSync('scripts/audit_results.log', log);
        console.log('Results written to scripts/audit_results.log');
        process.exit();
    }
}

check();
