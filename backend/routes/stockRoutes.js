const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isStaff, isManager } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');

const {
  getCurrentStock,
  transferBetweenLocations,
  transferBetweenWarehouses,
  issueStock,
  adjustStock,
  recordStockCount,
  getStockLedger,
  getStockBalanceByItem,
  getStockCountTasks
} = require('../controllers/stockController');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Validators
const transferLocationValidators = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('item_id is required and must be a positive integer'),
  body('from_location_id')
    .isInt({ min: 1 })
    .withMessage('from_location_id is required and must be a positive integer'),
  body('to_location_id')
    .isInt({ min: 1 })
    .withMessage('to_location_id is required and must be a positive integer'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('quantity is required and must be at least 1'),
  body('batch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('batch_id must be a positive integer if provided'),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

const transferWarehouseValidators = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('item_id is required and must be a positive integer'),
  body('from_warehouse_id')
    .isInt({ min: 1 })
    .withMessage('from_warehouse_id is required and must be a positive integer'),
  body('to_warehouse_id')
    .isInt({ min: 1 })
    .withMessage('to_warehouse_id is required and must be a positive integer'),
  body('from_location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('from_location_id must be a positive integer if provided'),
  body('to_location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('to_location_id must be a positive integer if provided'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('quantity is required and must be at least 1'),
  body('batch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('batch_id must be a positive integer if provided'),
  body('expected_date')
    .optional()
    .isISO8601()
    .withMessage('expected_date must be a valid date (YYYY-MM-DD)'),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

const issueStockValidators = [
  body('warehouse_id')
    .isInt({ min: 1 })
    .withMessage('warehouse_id is required and must be a positive integer'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items is required and must be a non-empty array'),
  body('items.*.item_id')
    .isInt({ min: 1 })
    .withMessage('Each item must have a valid item_id'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item must have quantity >= 1'),
  body('items.*.location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('location_id must be a positive integer if provided'),
  body('order_reference')
    .optional()
    .isString()
    .withMessage('order_reference must be a string'),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

const adjustStockValidators = [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('item_id is required and must be a positive integer'),
  body('warehouse_id')
    .isInt({ min: 1 })
    .withMessage('warehouse_id is required and must be a positive integer'),
  body('location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('location_id must be a positive integer if provided'),
  body('batch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('batch_id must be a positive integer if provided'),
  body('adjustment_type')
    .isIn(['Addition', 'Reduction'])
    .withMessage('adjustment_type must be "Addition" or "Reduction"'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('quantity is required and must be at least 1'),
  body('reason')
    .isLength({ min: 5 })
    .withMessage('reason is required and must be at least 5 characters'),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

const recordStockCountValidators = [
  body('warehouse_id')
    .isInt({ min: 1 })
    .withMessage('warehouse_id is required and must be a positive integer'),
  body('location_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('location_id must be a positive integer if provided'),
  body('counted_items')
    .isArray({ min: 1 })
    .withMessage('counted_items is required and must be a non-empty array'),
  body('counted_items.*.item_id')
    .isInt({ min: 1 })
    .withMessage('Each counted item must have a valid item_id'),
  body('counted_items.*.batch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('batch_id must be a positive integer if provided'),
  body('counted_items.*.counted_qty')
    .isInt({ min: 0 })
    .withMessage('counted_qty must be a non-negative integer'),
  body('count_date')
    .optional()
    .isISO8601()
    .withMessage('count_date must be a valid date (YYYY-MM-DD)'),
  body('counted_by')
    .optional()
    .isString()
    .withMessage('counted_by must be a string'),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

// ROUTES
router.get('/summary', getCurrentStock);
router.get('/item/:itemId', [param('itemId').isInt({ min: 1 }).withMessage('itemId must be a positive integer')], validate, getStockBalanceByItem);
router.get('/ledger', getStockLedger);
router.get('/count-tasks', isStaff, getStockCountTasks);

router.post('/transfer/location', isStaff, transferLocationValidators, validate, transferBetweenLocations);
router.post('/transfer/warehouse', isStaff, transferWarehouseValidators, validate, transferBetweenWarehouses);
router.post('/issue', isStaff, issueStockValidators, validate, issueStock);
router.post('/adjust', isStaff, adjustStockValidators, validate, adjustStock);
router.post('/count', isStaff, recordStockCountValidators, validate, recordStockCount);

module.exports = router;

