const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isManager } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');

const {
  getAllBatches,
  getBatchById,
  getBatchesByItem,
  checkExpiryAlerts,
  getExpiryAlerts,
  disposeExpiredBatch,
  getExpirySummaryReport,
  getBatchUsageAnalysis
} = require('../controllers/batchController');

const router = express.Router();

router.use(verifyToken);

// IMPORTANT: Specific routes must come BEFORE parameterized routes (/:id)
// Express matches routes in order, so /:id would match /expiry-alerts if placed first

// Batch routes
router.get(
  '/',
  [
    query('item_id').optional().isInt(),
    query('warehouse_id').optional().isInt(),
    query('status').optional().isIn(['Active', 'Expired', 'Disposed']),
    query('expiry_status').optional().isIn(['valid', 'expiring_30', 'expiring_7', 'expired']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 })
  ],
  validate,
  getAllBatches
);

// Specific routes - must come before /:id
router.get('/item/:itemId', param('itemId').isInt(), validate, getBatchesByItem);

// Expiry routes - must come before /:id
router.post('/check-expiry', isManager, checkExpiryAlerts);
router.get('/expiry-alerts',
  [
    query('severity').optional().isIn(['Medium', 'High', 'Critical']),
    query('alert_type').optional().isIn(['Expiry Warning - 30 Days', 'Expiry Warning - 7 Days', 'Expired']),
    query('warehouse_id').optional().isInt(),
    query('is_read').optional().isBoolean()
  ],
  validate,
  getExpiryAlerts
);

// Reports - must come before /:id
router.get(
  '/reports/expiry-summary',
  [
    query('warehouse_id').optional().isInt(),
    query('category_id').optional().isInt(),
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate()
  ],
  validate,
  getExpirySummaryReport
);
router.get(
  '/reports/usage-analysis',
  [
    query('warehouse_id').optional().isInt(),
    query('min_age_days').optional().isInt({ min: 0 })
  ],
  validate,
  getBatchUsageAnalysis
);

// Parameterized routes - must come LAST
router.get('/:id', param('id').isInt(), validate, getBatchById);
router.post(
  '/:id/dispose',
  isManager,
  [
    param('id').isInt(),
    body('disposal_qty').isInt({ min: 1 }).withMessage('disposal_qty must be at least 1'),
    body('disposal_reason').isLength({ min: 5 }).withMessage('disposal_reason must be at least 5 chars'),
    body('disposal_date').isDate().withMessage('disposal_date must be a valid date'),
    body('disposal_date').custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Invalid disposal_date');
      if (date > new Date()) throw new Error('disposal_date cannot be in the future');
      return true;
    }),
    body('disposal_cost').optional().isFloat({ min: 0 })
  ],
  validate,
  disposeExpiredBatch
);

module.exports = router;

