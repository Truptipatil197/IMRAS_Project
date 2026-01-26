const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isManager } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');
const {
  Alert,
  Batch,
  Item,
  Warehouse,
  sequelize
} = require('../models');
const { Op, literal } = require('sequelize');

const router = express.Router();
router.use(verifyToken);

/**
 * 1. Robust Expiry Alerts (Inline)
 * Fixes "no item found" by using robust manual fetches
 */
router.get('/expiry-alerts', async (req, res) => {
  try {
    console.log('[DEBUG] GET /expiry-alerts - manual fetch');

    const where = {
      alert_type: { [Op.in]: ['Expiry Warning - 30 Days', 'Expiry Warning - 7 Days', 'Expired'] }
    };

    const alerts = await Alert.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    const alertPayload = [];
    for (const a of alerts) {
      // Manual fetch batch & item
      const batch = await Batch.findByPk(a.batch_id, { raw: true });
      if (!batch) continue;

      const item = await Item.findByPk(batch.item_id, { raw: true });
      const warehouse = await Warehouse.findByPk(a.warehouse_id, { raw: true });

      alertPayload.push({
        alert_id: a.alert_id,
        alert_type: a.alert_type,
        severity: a.severity,
        message: a.message,
        batch: {
          batch_id: batch.batch_id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          available_qty: batch.available_qty
        },
        item: item ? {
          item_name: item.item_name,
          sku: item.sku
        } : null,
        warehouse: warehouse ? {
          warehouse_name: warehouse.warehouse_name
        } : null
      });
    }

    // Summary counts
    const expired = alertPayload.filter(a => a.alert_type === 'Expired').length;
    const expiring7 = alertPayload.filter(a => a.alert_type === 'Expiry Warning - 7 Days').length;
    const expiring30 = alertPayload.filter(a => a.alert_type === 'Expiry Warning - 30 Days').length;

    res.json({
      success: true,
      alerts: alertPayload,
      summary: {
        expired_items: expired,
        expiring_7days: expiring7,
        expiring_30days: expiring30
      }
    });
  } catch (error) {
    console.error('Expiry Alerts Route Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Load original controller for remaining routes
const batchController = require('../controllers/batchController');

router.get('/', batchController.getAllBatches);
router.get('/item/:itemId', batchController.getBatchesByItem);
router.post('/check-expiry', isManager, batchController.checkExpiryAlerts);
router.get('/reports/expiry-summary', batchController.getExpirySummaryReport);
router.get('/reports/usage-analysis', batchController.getBatchUsageAnalysis);
router.get('/:id', batchController.getBatchById);
router.post('/:id/dispose', isManager, batchController.disposeExpiredBatch);

module.exports = router;
