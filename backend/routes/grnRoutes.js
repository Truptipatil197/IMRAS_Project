const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isStaff } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');

const {
  getPendingPOs,
  createGRN,
  getAllGRNs,
  getGRNById,
  updateGRN,
  completeGRN
} = require('../controllers/grnController');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Validators
const createGRNValidators = [
  body('po_id')
    .isInt({ min: 1 })
    .withMessage('po_id is required and must be a positive integer'),
  body('warehouse_id')
    .isInt({ min: 1 })
    .withMessage('warehouse_id is required and must be a positive integer'),
  body('grn_date')
    .optional()
    .isISO8601()
    .withMessage('grn_date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
          throw new Error('grn_date cannot be a future date');
        }
      }
      return true;
    }),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items is required and must be a non-empty array'),
  body('items.*.item_id')
    .isInt({ min: 1 })
    .withMessage('Each item must have a valid item_id'),
  body('items.*.received_qty')
    .isInt({ min: 1 })
    .withMessage('Each item must have received_qty >= 1'),
  body('items.*.accepted_qty')
    .isInt({ min: 0 })
    .withMessage('Each item must have accepted_qty >= 0'),
  body('items.*.rejected_qty')
    .isInt({ min: 0 })
    .withMessage('Each item must have rejected_qty >= 0'),
  body('items.*.rejection_reason')
    .optional()
    .isString()
    .withMessage('rejection_reason must be a string'),
  body('items.*.batch_number')
    .optional()
    .isString()
    .withMessage('batch_number must be a string'),
  body('items.*.lot_number')
    .optional()
    .isString()
    .withMessage('lot_number must be a string'),
  body('items.*.manufacturing_date')
    .optional()
    .isISO8601()
    .withMessage('manufacturing_date must be a valid date (YYYY-MM-DD)'),
  body('items.*.expiry_date')
    .optional()
    .isISO8601()
    .withMessage('expiry_date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const expiryDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          throw new Error('expiry_date must be a future date');
        }
      }
      return true;
    }),
  // Custom validation: received_qty = accepted_qty + rejected_qty
  body('items.*').custom((item) => {
    if (item.received_qty !== item.accepted_qty + item.rejected_qty) {
      throw new Error('received_qty must equal accepted_qty + rejected_qty');
    }
    if (item.rejected_qty > 0 && !item.rejection_reason) {
      throw new Error('rejection_reason is required when rejected_qty > 0');
    }
    return true;
  })
];

const updateGRNValidators = [
  body('grn_date')
    .optional()
    .isISO8601()
    .withMessage('grn_date must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const date = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
          throw new Error('grn_date cannot be a future date');
        }
      }
      return true;
    }),
  body('remarks')
    .optional()
    .isString()
    .withMessage('remarks must be a string')
];

// ROUTES
router.get('/pending-pos', getPendingPOs);
router.post('/', isStaff, createGRNValidators, validate, createGRN);
router.get('/', getAllGRNs);
router.get('/:id', param('id').isInt(), validate, getGRNById);
router.put('/:id', isStaff, param('id').isInt(), updateGRNValidators, validate, updateGRN);
router.put('/:id/complete', isStaff, param('id').isInt(), validate, completeGRN);

module.exports = router;

