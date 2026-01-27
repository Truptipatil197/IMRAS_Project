const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const { isAdmin, isManager, isStaff } = require('../middleware/roleMiddleware');
const {
    Item,
    Alert,
    StockLedger,
    SupplierItem,
    Supplier,
    PurchaseRequisition,
    PurchaseOrder,
    PRItem,
    User,
    ReorderRule,
    sequelize
} = require('../models');
const { Op, literal } = require('sequelize');

/**
 * 1. Reorder Statistics (Inline)
 */
router.get('/statistics', verifyToken, async (req, res) => {
    try {
        const items = await Item.findAll({
            attributes: [
                'item_id', 'reorder_point', 'safety_stock',
                [literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`), 'stock']
            ],
            where: { is_active: true },
            raw: true
        });

        let critical = 0;
        let urgent = 0;

        items.forEach(item => {
            const stock = parseFloat(item.stock || 0);
            const rp = parseFloat(item.reorder_point || 0);
            const ss = parseFloat(item.safety_stock || item.reorder_point || 0);

            if (stock === 0) critical++;
            else if (stock < rp) urgent++;
        });

        const autoPrs = await PurchaseRequisition.count({ where: { pr_number: { [Op.like]: 'PR-AUTO-%' } } });

        res.json({
            success: true,
            stats: {
                critical,
                urgent,
                auto_prs_created: autoPrs,
                estimated_savings: autoPrs * 1500 // Demo/Estimated value
            }
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2. Reorder Dashboard (Inline)
 * Added to fix Manager Dashboard Cards
 */
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        console.log('[DEBUG] GET /dashboard - fetching robust counts');

        // 1. Stock Status Counts via Subquery
        const items = await Item.findAll({
            attributes: [
                'item_id', 'reorder_point', 'safety_stock',
                [literal(`(SELECT COALESCE(SUM(quantity), 0) FROM stock_ledgers WHERE stock_ledgers.item_id = Item.item_id)`), 'stock']
            ],
            where: { is_active: true },
            raw: true
        });

        let good = 0; let low = 0; let critical = 0; let out = 0;
        items.forEach(i => {
            const s = parseFloat(i.stock || 0);
            const rp = parseFloat(i.reorder_point || 0);
            const ss = parseFloat(i.safety_stock || 0);

            if (s === 0) out++;
            else if (s < ss) critical++;
            else if (s < rp) low++;
            else good++;
        });

        const totalItems = items.length || 1;

        // 2. PR / PO / Alert Counts
        const [unreadAlerts, criticalAlerts, pendingPRs, activePOs] = await Promise.all([
            Alert.count({ where: { is_read: false, alert_type: { [Op.in]: ['Reorder', 'Critical Stock', 'Low Stock'] } } }),
            Alert.count({ where: { severity: 'Critical', alert_type: { [Op.in]: ['Reorder', 'Critical Stock', 'Low Stock'] } } }),
            PurchaseRequisition.count({ where: { status: 'Pending' } }),
            PurchaseOrder.count({ where: { status: { [Op.in]: ['Issued', 'In-Transit'] } } })
        ]);

        res.json({
            success: true,
            alerts: {
                total_unread: unreadAlerts,
                critical_count: criticalAlerts,
                items_below_safety_stock: critical + out
            },
            purchase_requisitions: {
                pending_count: pendingPRs
            },
            purchase_orders: {
                active_pos: activePOs
            },
            stock_health: {
                good_stock_pct: Math.round((good / totalItems) * 100),
                low_stock_pct: Math.round((low / totalItems) * 100),
                critical_stock_pct: Math.round((critical / totalItems) * 100),
                out_of_stock_pct: Math.round((out / totalItems) * 100)
            }
        });
    } catch (error) {
        console.error('Dashboard Route Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 3. Reorder Alerts (Inline)
 */
router.get('/alerts', verifyToken, async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            where: { alert_type: { [Op.in]: ['Reorder', 'Critical Stock', 'Low Stock'] } },
            order: [['createdAt', 'DESC']]
        });

        const alertPayload = [];
        for (const a of alerts) {
            const item = await Item.findByPk(a.item_id, { raw: true });
            const stockRes = await StockLedger.findAll({
                attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'total']],
                where: { item_id: a.item_id },
                raw: true
            });
            const currentStock = parseFloat(stockRes[0]?.total || 0);
            const sItem = await SupplierItem.findOne({
                where: { item_id: a.item_id, is_preferred: true },
                include: [{ model: Supplier, as: 'supplier' }]
            });

            alertPayload.push({
                alert_id: a.alert_id,
                alert_type: a.alert_type,
                severity: a.severity,
                is_read: a.is_read,
                created_at: a.createdAt,
                item_id: a.item_id,
                sku: item ? item.sku : 'N/A',
                item_name: item ? item.item_name : 'Unknown Item',
                current_stock: currentStock,
                reorder_point: item ? item.reorder_point : 0,
                safety_stock: item ? item.safety_stock : 0,
                preferred_supplier: sItem && sItem.supplier ? sItem.supplier.supplier_name : 'N/A',
                supplier_unit_price: sItem ? parseFloat(sItem.unit_price) : 0,
                min_order_qty: sItem ? parseInt(sItem.min_order_qty) : 1
            });
        }

        res.json({ success: true, alerts: alertPayload, unread_count: alertPayload.filter(al => !al.is_read).length });
    } catch (error) {
        console.error('Alerts Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 4. Run Automation (Linked)
 */
router.post('/run', verifyToken, async (req, res) => {
    try {
        const scheduler = require('../jobs/reorderScheduler');
        const results = await scheduler.runNow(req.user.user_id);
        const stats = results.stats || {};

        let customMessage = 'Automation run successfully';
        if (results.success) {
            const skippedPR = stats.skippedPendingPR || 0;
            const healthy = stats.skippedHealthyStock || 0;
            if (stats.prsCreated === 0) {
                if (skippedPR > 0) customMessage = `Complete: 0 new PRs created (${skippedPR} skipped as pending PRs already exist)`;
                else if (healthy > 0) customMessage = `Complete: 0 PRs needed (Inventory levels are currently healthy)`;
            } else {
                customMessage = `Success: ${stats.prsCreated} PRs generated (${skippedPR} items already had pending orders)`;
            }
        } else {
            customMessage = results.error || 'Automation failed';
        }

        res.json({
            success: results.success,
            message: customMessage,
            items_checked: stats.itemsProcessed || 0,
            alerts_generated: stats.alertsCreated || 0,
            prs_created: stats.prsCreated || 0
        });
    } catch (error) {
        console.error('Run Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 5. Automation Rules (Inline)
 */
router.get('/rules', verifyToken, async (req, res) => {
    try {
        const rules = await ReorderRule.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, rules });
    } catch (error) {
        res.json({ success: true, rules: [], error: error.message });
    }
});

/**
 * 6. Automation History
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const history = await ReorderHistory.findAll({
            limit: parseInt(limit),
            order: [['run_timestamp', 'DESC']]
        });
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/history/:id', verifyToken, async (req, res) => {
    try {
        const run = await ReorderHistory.findByPk(req.params.id);
        if (!run) return res.status(404).json({ success: false, message: 'History record not found' });
        res.json({ success: true, run });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 7. Automation Logs
 */
router.get('/logs', verifyToken, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const logs = await ReorderLog.findAll({
            limit: parseInt(limit),
            order: [['timestamp', 'DESC']]
        });
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const {
    createPurchaseRequisition,
    createBulkPurchaseRequisition,
    approvePurchaseRequisition,
    rejectPurchaseRequisition,
    getAllPurchaseRequisitions,
    getPurchaseRequisitionById,
    getPurchaseOrderStatus,
    getAllPurchaseOrders,
    createPurchaseOrderFromPR
} = require('../controllers/reorderController');

router.get('/pr', verifyToken, getAllPurchaseRequisitions);
router.get('/pr/:id', verifyToken, getPurchaseRequisitionById);
router.get('/po', verifyToken, getAllPurchaseOrders);
router.get('/po/:id/status', verifyToken, getPurchaseOrderStatus);
router.post('/pr', verifyToken, isStaff, createPurchaseRequisition);
router.post('/pr/:id/approve', verifyToken, isManager, approvePurchaseRequisition);
router.post('/pr/:id/reject', verifyToken, isManager, rejectPurchaseRequisition);
router.post('/pr/:prId/po', verifyToken, isManager, createPurchaseOrderFromPR);
router.post('/bulk-pr', verifyToken, isManager, createBulkPurchaseRequisition);

module.exports = router;
