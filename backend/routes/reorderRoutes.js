const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isManager } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');
const {
  checkReorderPoints,
  getReorderAlerts,
  markAlertAsRead,
  createPurchaseRequisition,
  getAllPurchaseRequisitions,
  getPurchaseRequisitionById,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  createPurchaseOrderFromPR,
  getPurchaseOrderStatus,
  getReorderDashboard
} = require('../controllers/reorderController');

const router = express.Router();

router.use(verifyToken);

// Alert routes
router.post('/check', isManager, checkReorderPoints);
router.get('/alerts', getReorderAlerts);
router.put('/alerts/:id/read', isManager, param('id').isInt(), validate, markAlertAsRead);

// Purchase requisition routes
router.post(
  '/pr',
  isManager,
  [
    body('pr_date').notEmpty().withMessage('pr_date is required').isDate().withMessage('pr_date must be a valid date'),
    body('items').isArray({ min: 1 }).withMessage('items must be an array with at least one entry'),
    body('items.*.item_id').isInt().withMessage('item_id is required and must be integer'),
    body('items.*.requested_qty').isInt({ min: 1 }).withMessage('requested_qty must be at least 1'),
    body('alert_id').optional().isInt()
  ],
  validate,
  createPurchaseRequisition
);
router.get('/pr', getAllPurchaseRequisitions);
router.get('/pr/:id', param('id').isInt(), validate, getPurchaseRequisitionById);
router.put('/pr/:id/approve', isManager, param('id').isInt(), validate, approvePurchaseRequisition);
router.put(
  '/pr/:id/reject',
  isManager,
  [
    param('id').isInt(),
    body('rejection_reason').isLength({ min: 10 }).withMessage('rejection_reason must be at least 10 characters')
  ],
  validate,
  rejectPurchaseRequisition
);

// Purchase order routes
router.post(
  '/po/from-pr/:prId',
  isManager,
  [
    param('prId').isInt(),
    body('supplier_id').isInt().withMessage('supplier_id is required'),
    body('expected_delivery_date').isDate().withMessage('expected_delivery_date must be a valid date'),
    body('expected_delivery_date').custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime()) || date <= new Date()) {
        throw new Error('expected_delivery_date must be in the future');
      }
      return true;
    })
  ],
  validate,
  createPurchaseOrderFromPR
);
router.get('/po/:id/status', param('id').isInt(), validate, getPurchaseOrderStatus);

// Dashboard
router.get('/dashboard', isManager, getReorderDashboard);

// ============================================
// REORDER AUTOMATION ROUTES
// ============================================

const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const { Item, Supplier, SupplierItem, StockLedger, PurchaseRequisition, PRItem, ReorderRule, ReorderHistory, ReorderLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Get reorder statistics
router.get('/statistics', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        // Get items with current stock
        const items = await Item.findAll({
            attributes: [
                'item_id',
                'reorder_point',
                'safety_stock',
                [
                    sequelize.literal(`(
                        SELECT COALESCE(SUM(quantity), 0)
                        FROM stock_ledger
                        WHERE stock_ledger.item_id = Item.item_id
                    )`),
                    'current_stock'
                ]
            ],
            where: { is_active: 1 }
        });
        
        let critical = 0;
        let urgent = 0;
        
        items.forEach(item => {
            const stock = item.dataValues.current_stock || 0;
            if (stock === 0) {
                critical++;
            } else if (stock < item.reorder_point) {
                urgent++;
            }
        });
        
        // Get PRs created by automation in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const autoPRsCreated = await PurchaseRequisition.count({
            where: {
                created_at: { [Op.gte]: thirtyDaysAgo },
                justification: { [Op.like]: '%Auto-generated%' }
            }
        });
        
        // Calculate estimated savings (simplified)
        const estimatedSavings = autoPRsCreated * 5000; // Rough estimate
        
        res.json({
            success: true,
            stats: {
                critical,
                urgent,
                auto_prs_created: autoPRsCreated,
                estimated_savings: estimatedSavings
            }
        });
        
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

// Get reorder alerts (automation version - different from existing /alerts)
router.get('/alerts', authenticate, async (req, res) => {
    try {
        const items = await Item.findAll({
            attributes: [
                'item_id',
                'sku',
                'item_name',
                'reorder_point',
                'safety_stock',
                'lead_time_days',
                [
                    sequelize.literal(`(
                        SELECT COALESCE(SUM(quantity), 0)
                        FROM stock_ledger
                        WHERE stock_ledger.item_id = Item.item_id
                    )`),
                    'current_stock'
                ]
            ],
            where: { 
                is_active: 1,
                reorder_point: { [Op.gt]: 0 }
            }
        });
        
        const alerts = [];
        
        for (const item of items) {
            const currentStock = item.dataValues.current_stock || 0;
            const reorderPoint = item.reorder_point || 0;
            
            if (currentStock <= reorderPoint) {
                // Get preferred supplier
                const supplierItem = await SupplierItem.findOne({
                    where: { item_id: item.item_id, is_preferred: 1 },
                    include: [{
                        model: Supplier,
                        attributes: ['supplier_id', 'supplier_name']
                    }]
                });
                
                alerts.push({
                    item_id: item.item_id,
                    sku: item.sku,
                    item_name: item.item_name,
                    current_stock: currentStock,
                    reorder_point: reorderPoint,
                    safety_stock: item.safety_stock || 0,
                    lead_time_days: item.lead_time_days || 7,
                    preferred_supplier: supplierItem?.Supplier?.supplier_name || null,
                    supplier_id: supplierItem?.Supplier?.supplier_id || null,
                    supplier_unit_price: supplierItem?.unit_price || 0,
                    min_order_qty: supplierItem?.min_order_qty || 1
                });
            }
        }
        
        res.json({ success: true, alerts });
        
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reorder alerts' });
    }
});

// Run reorder automation now
router.post('/run', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    let runRecord = null;
    
    try {
        const startTime = Date.now();
        
        // Create run record
        runRecord = await ReorderHistory.create({
            run_timestamp: new Date(),
            status: 'Running',
            triggered_by: req.user.user_id
        }, { transaction });
        
        // Get items to check
        const items = await Item.findAll({
            attributes: [
                'item_id',
                'sku',
                'item_name',
                'reorder_point',
                'safety_stock',
                [
                    sequelize.literal(`(
                        SELECT COALESCE(SUM(quantity), 0)
                        FROM stock_ledger
                        WHERE stock_ledger.item_id = Item.item_id
                    )`),
                    'current_stock'
                ]
            ],
            where: { 
                is_active: 1,
                reorder_point: { [Op.gt]: 0 }
            }
        });
        
        let alertsGenerated = 0;
        let prsCreated = 0;
        
        // Load settings
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let autoCreatePRs = false;
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            autoCreatePRs = settings.auto_approve_prs || false;
        }
        
        for (const item of items) {
            const currentStock = item.dataValues.current_stock || 0;
            const reorderPoint = item.reorder_point || 0;
            
            if (currentStock <= reorderPoint) {
                alertsGenerated++;
                
                // Log alert
                await ReorderLog.create({
                    run_id: runRecord.run_id,
                    level: currentStock === 0 ? 'ERROR' : 'WARNING',
                    message: `Item ${item.sku} (${item.item_name}) is ${currentStock === 0 ? 'out of stock' : 'below reorder point'}. Current: ${currentStock}, Reorder: ${reorderPoint}`,
                    item_id: item.item_id,
                    timestamp: new Date()
                }, { transaction });
                
                if (autoCreatePRs) {
                    // Get preferred supplier
                    const supplierItem = await SupplierItem.findOne({
                        where: { item_id: item.item_id, is_preferred: 1 }
                    });
                    
                    if (supplierItem) {
                        // Calculate quantity
                        const suggestedQty = Math.max(
                            (reorderPoint + (item.safety_stock || 0)) - currentStock,
                            supplierItem.min_order_qty || 1
                        );
                        
                        // Create PR
                        const prNumber = `PR-AUTO-${Date.now()}-${item.item_id}`;
                        
                        const pr = await PurchaseRequisition.create({
                            pr_number: prNumber,
                            requested_by: req.user.user_id,
                            status: 'Pending',
                            priority: currentStock === 0 ? 'Critical' : 'High',
                            justification: `Auto-generated: Item below reorder point. Current stock: ${currentStock}, Reorder point: ${reorderPoint}`,
                            created_by: req.user.user_id
                        }, { transaction });
                        
                        await PRItem.create({
                            pr_id: pr.pr_id,
                            item_id: item.item_id,
                            quantity_requested: suggestedQty,
                            unit_price: supplierItem.unit_price,
                            total_price: suggestedQty * supplierItem.unit_price,
                            supplier_id: supplierItem.supplier_id,
                            created_by: req.user.user_id
                        }, { transaction });
                        
                        prsCreated++;
                        
                        await ReorderLog.create({
                            run_id: runRecord.run_id,
                            level: 'INFO',
                            message: `Auto-created PR ${prNumber} for ${item.sku} - Qty: ${suggestedQty}`,
                            item_id: item.item_id,
                            timestamp: new Date()
                        }, { transaction });
                    }
                }
            }
        }
        
        const endTime = Date.now();
        const durationSeconds = Math.round((endTime - startTime) / 1000);
        
        // Update run record
        await runRecord.update({
            items_checked: items.length,
            alerts_generated: alertsGenerated,
            prs_created: prsCreated,
            status: 'Success',
            duration_seconds: durationSeconds
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            success: true,
            items_checked: items.length,
            alerts_generated: alertsGenerated,
            prs_created: prsCreated,
            duration_seconds: durationSeconds
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Run automation error:', error);
        
        // Update run record with error
        if (runRecord) {
            await runRecord.update({
                status: 'Failed',
                error_message: error.message
            });
        }
        
        res.status(500).json({ success: false, message: 'Failed to run automation' });
    }
});

// Create bulk PRs
router.post('/bulk-pr', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { item_ids } = req.body;
        
        if (!item_ids || item_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No items selected' });
        }
        
        let prsCreated = 0;
        
        for (const itemId of item_ids) {
            const item = await Item.findByPk(itemId, {
                attributes: [
                    'item_id',
                    'sku',
                    'item_name',
                    'reorder_point',
                    'safety_stock',
                    [
                        sequelize.literal(`(
                            SELECT COALESCE(SUM(quantity), 0)
                            FROM stock_ledger
                            WHERE stock_ledger.item_id = Item.item_id
                        )`),
                        'current_stock'
                    ]
                ]
            });
            
            if (!item) continue;
            
            const supplierItem = await SupplierItem.findOne({
                where: { item_id: itemId, is_preferred: 1 }
            });
            
            if (!supplierItem) continue;
            
            const currentStock = item.dataValues.current_stock || 0;
            const suggestedQty = Math.max(
                (item.reorder_point + (item.safety_stock || 0)) - currentStock,
                supplierItem.min_order_qty || 1
            );
            
            const prNumber = `PR-BULK-${Date.now()}-${itemId}`;
            
            const pr = await PurchaseRequisition.create({
                pr_number: prNumber,
                requested_by: req.user.user_id,
                status: 'Pending',
                priority: currentStock === 0 ? 'Critical' : 'High',
                justification: `Bulk PR creation: Item below reorder point. Current stock: ${currentStock}`,
                created_by: req.user.user_id
            }, { transaction });
            
            await PRItem.create({
                pr_id: pr.pr_id,
                item_id: itemId,
                quantity_requested: suggestedQty,
                unit_price: supplierItem.unit_price,
                total_price: suggestedQty * supplierItem.unit_price,
                supplier_id: supplierItem.supplier_id,
                created_by: req.user.user_id
            }, { transaction });
            
            prsCreated++;
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            prs_created: prsCreated,
            message: `${prsCreated} PRs created successfully`
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Bulk PR creation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create bulk PRs' });
    }
});

// Get automation rules
router.get('/rules', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const rules = await ReorderRule.findAll({
            order: [['created_at', 'DESC']]
        });
        
        res.json({ success: true, rules });
        
    } catch (error) {
        console.error('Get rules error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rules' });
    }
});

// Create automation rule
router.post('/rules', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { rule_name, condition, action, is_enabled, custom_threshold } = req.body;
        
        // Note: The existing ReorderRule model has different fields
        // We'll create a simplified rule entry
        const rule = await ReorderRule.create({
            rule_name: rule_name || 'Automation Rule',
            reorder_formula: 'dynamic',
            auto_generate_pr: action === 'auto_pr' || action === 'all',
            approval_required: false,
            active: is_enabled !== undefined ? is_enabled : true,
            created_by: req.user.user_id
        });
        
        res.status(201).json({
            success: true,
            message: 'Rule created successfully',
            rule_id: rule.rule_id
        });
        
    } catch (error) {
        console.error('Create rule error:', error);
        res.status(500).json({ success: false, message: 'Failed to create rule' });
    }
});

// Toggle rule
router.put('/rules/:id/toggle', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { is_enabled } = req.body;
        
        const rule = await ReorderRule.findByPk(req.params.id);
        
        if (!rule) {
            return res.status(404).json({ success: false, message: 'Rule not found' });
        }
        
        await rule.update({ active: is_enabled });
        
        res.json({ success: true, message: 'Rule updated successfully' });
        
    } catch (error) {
        console.error('Toggle rule error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle rule' });
    }
});

// Delete rule
router.delete('/rules/:id', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const rule = await ReorderRule.findByPk(req.params.id);
        
        if (!rule) {
            return res.status(404).json({ success: false, message: 'Rule not found' });
        }
        
        await rule.destroy();
        
        res.json({ success: true, message: 'Rule deleted successfully' });
        
    } catch (error) {
        console.error('Delete rule error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete rule' });
    }
});

// Get execution history
router.get('/history', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const history = await ReorderHistory.findAll({
            order: [['run_timestamp', 'DESC']],
            limit: parseInt(limit)
        });
        
        res.json({ success: true, history });
        
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
});

// Get single run details
router.get('/history/:id', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const run = await ReorderHistory.findByPk(req.params.id);
        
        if (!run) {
            return res.status(404).json({ success: false, message: 'Run not found' });
        }
        
        res.json({ success: true, run });
        
    } catch (error) {
        console.error('Get run details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch run details' });
    }
});

// Get schedule
router.get('/schedule', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '../config/settings.json');
        
        let schedule = {
            frequency: 'disabled',
            run_time: '09:00',
            auto_create_prs: false,
            email_notifications: false,
            exclude_weekends: false,
            next_run: null
        };
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            
            if (settings.reorder_schedule) {
                schedule = { ...schedule, ...settings.reorder_schedule };
            }
        }
        
        res.json({ success: true, schedule });
        
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
    }
});

// Save schedule
router.post('/schedule', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { frequency, run_time, auto_create_prs, email_notifications, exclude_weekends } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        // Calculate next run time
        let nextRun = null;
        if (frequency !== 'disabled') {
            const now = new Date();
            const [hours, minutes] = run_time.split(':');
            nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
            
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            
            if (exclude_weekends) {
                while (nextRun.getDay() === 0 || nextRun.getDay() === 6) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
            }
        }
        
        settings.reorder_schedule = {
            frequency,
            run_time,
            auto_create_prs,
            email_notifications,
            exclude_weekends,
            next_run: nextRun ? nextRun.toISOString() : null,
            updated_at: new Date().toISOString(),
            updated_by: req.user.user_id
        };
        
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'Schedule saved successfully' });
        
    } catch (error) {
        console.error('Save schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to save schedule' });
    }
});

// Get system status
router.get('/status', authenticate, async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, '../config/settings.json');
        
        let enabled = false;
        let lastRun = null;
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            enabled = settings.enable_auto_reorder || false;
        }
        
        const lastRunRecord = await ReorderHistory.findOne({
            order: [['run_timestamp', 'DESC']]
        });
        
        if (lastRunRecord) {
            lastRun = lastRunRecord.run_timestamp;
        }
        
        res.json({
            success: true,
            status: {
                enabled,
                last_run: lastRun
            }
        });
        
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch status' });
    }
});

// Get logs
router.get('/logs', authenticate, authorizeRole(['Admin', 'Manager']), async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const logs = await ReorderLog.findAll({
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit)
        });
        
        res.json({ success: true, logs });
        
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});

// Check and create PRs (for settings page) - uses same logic as /run
router.post('/check-and-create', authenticate, authorizeRole(['Admin']), async (req, res) => {
    // Reuse the /run endpoint handler
    // We'll call it directly by moving the logic or creating a shared function
    // For now, just call the same handler
    const transaction = await sequelize.transaction();
    let runRecord = null;
    
    try {
        const startTime = Date.now();
        
        runRecord = await ReorderHistory.create({
            run_timestamp: new Date(),
            status: 'Running',
            triggered_by: req.user.user_id
        }, { transaction });
        
        const items = await Item.findAll({
            attributes: [
                'item_id',
                'sku',
                'item_name',
                'reorder_point',
                'safety_stock',
                [
                    sequelize.literal(`(
                        SELECT COALESCE(SUM(quantity), 0)
                        FROM stock_ledger
                        WHERE stock_ledger.item_id = Item.item_id
                    )`),
                    'current_stock'
                ]
            ],
            where: { 
                is_active: 1,
                reorder_point: { [Op.gt]: 0 }
            }
        });
        
        let alertsGenerated = 0;
        let prsCreated = 0;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let autoCreatePRs = false;
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            autoCreatePRs = settings.auto_approve_prs || false;
        }
        
        for (const item of items) {
            const currentStock = item.dataValues.current_stock || 0;
            const reorderPoint = item.reorder_point || 0;
            
            if (currentStock <= reorderPoint) {
                alertsGenerated++;
                
                await ReorderLog.create({
                    run_id: runRecord.run_id,
                    level: currentStock === 0 ? 'ERROR' : 'WARNING',
                    message: `Item ${item.sku} (${item.item_name}) is ${currentStock === 0 ? 'out of stock' : 'below reorder point'}. Current: ${currentStock}, Reorder: ${reorderPoint}`,
                    item_id: item.item_id,
                    timestamp: new Date()
                }, { transaction });
                
                if (autoCreatePRs) {
                    const supplierItem = await SupplierItem.findOne({
                        where: { item_id: item.item_id, is_preferred: 1 }
                    });
                    
                    if (supplierItem) {
                        const suggestedQty = Math.max(
                            (reorderPoint + (item.safety_stock || 0)) - currentStock,
                            supplierItem.min_order_qty || 1
                        );
                        
                        const prNumber = `PR-AUTO-${Date.now()}-${item.item_id}`;
                        
                        const pr = await PurchaseRequisition.create({
                            pr_number: prNumber,
                            requested_by: req.user.user_id,
                            status: 'Pending',
                            priority: currentStock === 0 ? 'Critical' : 'High',
                            justification: `Auto-generated: Item below reorder point. Current stock: ${currentStock}, Reorder point: ${reorderPoint}`,
                            created_by: req.user.user_id
                        }, { transaction });
                        
                        await PRItem.create({
                            pr_id: pr.pr_id,
                            item_id: item.item_id,
                            quantity_requested: suggestedQty,
                            unit_price: supplierItem.unit_price,
                            total_price: suggestedQty * supplierItem.unit_price,
                            supplier_id: supplierItem.supplier_id,
                            created_by: req.user.user_id
                        }, { transaction });
                        
                        prsCreated++;
                    }
                }
            }
        }
        
        const endTime = Date.now();
        const durationSeconds = Math.round((endTime - startTime) / 1000);
        
        await runRecord.update({
            items_checked: items.length,
            alerts_generated: alertsGenerated,
            prs_created: prsCreated,
            status: 'Success',
            duration_seconds: durationSeconds
        }, { transaction });
        
        await transaction.commit();
        
        res.json({
            success: true,
            items_checked: items.length,
            alerts_generated: alertsGenerated,
            prs_created: prsCreated,
            duration_seconds: durationSeconds
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Check and create error:', error);
        
        if (runRecord) {
            await runRecord.update({
                status: 'Failed',
                error_message: error.message
            });
        }
        
        res.status(500).json({ success: false, message: 'Failed to check and create PRs' });
    }
});

module.exports = router;

