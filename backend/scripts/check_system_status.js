/**
 * COMPREHENSIVE SYSTEM VERIFICATION
 * This script checks the current state of the reorder system
 * WITHOUT making any changes - READ ONLY
 */

const {
    sequelize,
    Item,
    StockLedger,
    Alert,
    PurchaseRequisition,
    PRItem,
    PurchaseOrder,
    POItem,
    Supplier,
    User
} = require('../models');
const { Op, fn, col } = require('sequelize');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`),
    step: (msg) => console.log(`\n${colors.bright}${colors.magenta}▶ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}  ✓ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}  ℹ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}  ⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}  ✗ ${msg}${colors.reset}`),
    data: (msg) => console.log(`    ${msg}`)
};

const verifySystem = async () => {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          IMRAS REORDER SYSTEM - COMPREHENSIVE VERIFICATION         ║');
    console.log('║                        READ-ONLY CHECK                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    try {
        // 1. Check Stock Levels
        log.header();
        log.step('1. CHECKING STOCK LEVELS');

        const items = await Item.findAll({
            where: { is_active: true },
            attributes: ['item_id', 'sku', 'item_name', 'reorder_point', 'min_stock', 'safety_stock']
        });

        const stockResults = await StockLedger.findAll({
            attributes: [
                'item_id',
                [fn('COALESCE', fn('SUM', col('quantity')), 0), 'current_stock']
            ],
            group: ['item_id'],
            raw: true
        });

        const stockMap = {};
        stockResults.forEach(r => {
            stockMap[r.item_id] = parseFloat(r.current_stock || 0);
        });

        log.info(`Total active items: ${items.length}`);

        let belowReorder = 0;
        let critical = 0;
        let outOfStock = 0;

        console.log('\n  Items Status:');
        items.slice(0, 10).forEach(item => {
            const stock = stockMap[item.item_id] || 0;
            const reorderPt = item.reorder_point || 0;
            const safety = item.safety_stock || 0;

            let status = '✓ Good';
            if (stock === 0) {
                status = '✗ OUT OF STOCK';
                outOfStock++;
            } else if (stock < safety) {
                status = '⚠ CRITICAL';
                critical++;
            } else if (stock <= reorderPt) {
                status = '⚠ Below Reorder';
                belowReorder++;
            }

            log.data(`${item.sku.padEnd(15)} | Stock: ${String(stock).padStart(6)} | Reorder: ${String(reorderPt).padStart(6)} | ${status}`);
        });

        log.info(`Out of Stock: ${outOfStock}, Critical: ${critical}, Below Reorder: ${belowReorder}`);

        // 2. Check Alerts
        log.header();
        log.step('2. CHECKING REORDER ALERTS');

        const totalAlerts = await Alert.count({
            where: { alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } }
        });

        const unreadAlerts = await Alert.count({
            where: {
                alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] },
                is_read: false
            }
        });

        const criticalAlerts = await Alert.count({
            where: {
                alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] },
                severity: 'Critical'
            }
        });

        log.info(`Total Alerts: ${totalAlerts}`);
        log.info(`Unread Alerts: ${unreadAlerts}`);
        log.info(`Critical Alerts: ${criticalAlerts}`);

        const recentAlerts = await Alert.findAll({
            where: { alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } },
            order: [['created_at', 'DESC']],
            limit: 5,
            include: [{ model: Item, as: 'item', attributes: ['sku', 'item_name'] }]
        });

        if (recentAlerts.length > 0) {
            console.log('\n  Recent Alerts:');
            recentAlerts.forEach((alert, idx) => {
                const itemName = alert.item ? alert.item.item_name : 'Unknown';
                const sku = alert.item ? alert.item.sku : 'N/A';
                log.data(`${idx + 1}. [${alert.severity}] ${itemName} (${sku}) - ${alert.is_read ? 'Read' : 'UNREAD'}`);
            });
        } else {
            log.warning('No alerts found in the system');
        }

        // 3. Check Purchase Requisitions
        log.header();
        log.step('3. CHECKING PURCHASE REQUISITIONS');

        const allPRs = await PurchaseRequisition.findAll({
            include: [
                { model: PRItem, as: 'prItems' },
                { model: User, as: 'requester', attributes: ['full_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        const prStats = {
            total: allPRs.length,
            pending: allPRs.filter(pr => pr.status === 'Pending').length,
            approved: allPRs.filter(pr => pr.status === 'Approved').length,
            rejected: allPRs.filter(pr => pr.status === 'Rejected').length
        };

        log.info(`Total PRs: ${prStats.total}`);
        log.info(`Pending: ${prStats.pending}, Approved: ${prStats.approved}, Rejected: ${prStats.rejected}`);

        if (allPRs.length > 0) {
            console.log('\n  Recent PRs:');
            allPRs.forEach((pr, idx) => {
                const requester = pr.requester ? pr.requester.full_name : 'Unknown';
                const itemCount = pr.prItems ? pr.prItems.length : 0;
                log.data(`${idx + 1}. ${pr.pr_number} | Status: ${pr.status.padEnd(10)} | Items: ${itemCount} | By: ${requester}`);
            });
        } else {
            log.warning('No PRs found in the system');
        }

        // 4. Check Purchase Orders
        log.header();
        log.step('4. CHECKING PURCHASE ORDERS');

        const allPOs = await PurchaseOrder.findAll({
            include: [
                { model: POItem, as: 'poItems' },
                { model: Supplier, as: 'supplier', attributes: ['supplier_name'] },
                { model: PurchaseRequisition, as: 'purchaseRequisition', attributes: ['pr_number'] }
            ],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        const poStats = {
            total: allPOs.length,
            issued: allPOs.filter(po => po.status === 'Issued').length,
            inTransit: allPOs.filter(po => po.status === 'In-Transit').length,
            completed: allPOs.filter(po => po.status === 'Completed').length
        };

        log.info(`Total POs: ${poStats.total}`);
        log.info(`Issued: ${poStats.issued}, In-Transit: ${poStats.inTransit}, Completed: ${poStats.completed}`);

        if (allPOs.length > 0) {
            console.log('\n  All Purchase Orders:');
            allPOs.forEach((po, idx) => {
                const supplier = po.supplier ? po.supplier.supplier_name : 'Unknown';
                const prNumber = po.purchaseRequisition ? po.purchaseRequisition.pr_number : 'No PR';
                const itemCount = po.poItems ? po.poItems.length : 0;
                const amount = po.total_amount || 0;
                log.data(`${idx + 1}. ${po.po_number} | Status: ${po.status.padEnd(12)} | Items: ${itemCount} | Amount: $${amount} | Supplier: ${supplier}`);
                log.data(`    Linked to: ${prNumber} | Created: ${po.createdAt.toISOString().split('T')[0]}`);
            });
        } else {
            log.warning('No POs found in the system');
        }

        // 5. Check PR to PO Linkage
        log.header();
        log.step('5. CHECKING PR TO PO LINKAGE');

        const approvedPRs = await PurchaseRequisition.findAll({
            where: { status: 'Approved' },
            include: [
                { model: PurchaseOrder, as: 'purchaseOrders', required: false }
            ]
        });

        const prsWithPO = approvedPRs.filter(pr => pr.purchaseOrders && pr.purchaseOrders.length > 0);
        const prsWithoutPO = approvedPRs.filter(pr => !pr.purchaseOrders || pr.purchaseOrders.length === 0);

        log.info(`Approved PRs: ${approvedPRs.length}`);
        log.info(`PRs with PO: ${prsWithPO.length}`);
        log.info(`PRs WITHOUT PO: ${prsWithoutPO.length}`);

        if (prsWithoutPO.length > 0) {
            log.warning('Found approved PRs without POs:');
            prsWithoutPO.forEach((pr, idx) => {
                const daysSince = Math.ceil((Date.now() - new Date(pr.approved_date).getTime()) / (1000 * 60 * 60 * 24));
                log.data(`${idx + 1}. ${pr.pr_number} - Approved ${daysSince} days ago`);
            });
        } else {
            log.success('All approved PRs have been converted to POs');
        }

        // 6. Check Suppliers
        log.header();
        log.step('6. CHECKING SUPPLIERS');

        const suppliers = await Supplier.findAll({
            attributes: ['supplier_id', 'supplier_name', 'is_active', 'email']
        });

        const activeSuppliers = suppliers.filter(s => s.is_active);

        log.info(`Total Suppliers: ${suppliers.length}`);
        log.info(`Active Suppliers: ${activeSuppliers.length}`);

        if (activeSuppliers.length > 0) {
            console.log('\n  Active Suppliers:');
            activeSuppliers.forEach((s, idx) => {
                log.data(`${idx + 1}. ${s.supplier_name} (ID: ${s.supplier_id}) - ${s.email || 'No email'}`);
            });
        } else {
            log.error('No active suppliers found! This will prevent PO creation.');
        }

        // 7. Summary and Issues
        log.header();
        log.step('7. SYSTEM HEALTH SUMMARY');

        const issues = [];

        if (belowReorder > 0 && unreadAlerts === 0) {
            issues.push(`${belowReorder} items below reorder point but no unread alerts`);
        }

        if (prsWithoutPO.length > 0) {
            issues.push(`${prsWithoutPO.length} approved PRs waiting for PO conversion`);
        }

        if (activeSuppliers.length === 0) {
            issues.push('No active suppliers available for PO creation');
        }

        if (poStats.total === 0 && prStats.approved > 0) {
            issues.push('Approved PRs exist but no POs created - conversion may be failing');
        }

        if (issues.length === 0) {
            log.success('System is healthy - no issues detected');
        } else {
            log.warning(`Found ${issues.length} potential issues:`);
            issues.forEach((issue, idx) => {
                log.data(`${idx + 1}. ${issue}`);
            });
        }

        // Final Stats
        console.log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
        console.log(`${colors.bright}FINAL STATISTICS:${colors.reset}`);
        console.log(`  Items: ${items.length} total, ${belowReorder} need reorder`);
        console.log(`  Alerts: ${totalAlerts} total, ${unreadAlerts} unread`);
        console.log(`  PRs: ${prStats.total} total (${prStats.pending} pending, ${prStats.approved} approved)`);
        console.log(`  POs: ${poStats.total} total (${poStats.issued} issued, ${poStats.completed} completed)`);
        console.log(`  Suppliers: ${activeSuppliers.length} active`);
        console.log(colors.cyan + '='.repeat(70) + colors.reset);

    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        console.error(error);
    } finally {
        await sequelize.close();
    }
};

verifySystem();
