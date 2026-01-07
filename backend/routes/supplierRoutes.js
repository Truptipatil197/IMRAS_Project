const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin, isManager } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');
const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier,
  addSupplierItemPricing,
  getSupplierPricing,
  compareSupplierPricing,
  rateSupplierPerformance,
  getSupplierPerformanceHistory,
  getSupplierComparisonReport,
  setPreferredSupplier
} = require('../controllers/supplierController');

const router = express.Router();

router.use(verifyToken);

// Supplier CRUD
router.post(
  '/',
  isAdmin,
  [
    body('supplier_name').isLength({ min: 3 }).withMessage('supplier_name min 3 chars'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').notEmpty().withMessage('phone is required'),
    body('payment_terms_days').optional().isInt({ min: 0 }),
    body('avg_lead_time_days').optional().isInt({ min: 1 })
  ],
  validate,
  createSupplier
);
router.get('/', getAllSuppliers);
router.get('/:id', param('id').isInt(), validate, getSupplierById);
router.put(
  '/:id',
  isAdmin,
  [
    param('id').isInt(),
    body('email').optional().isEmail(),
    body('payment_terms_days').optional().isInt({ min: 0 }),
    body('avg_lead_time_days').optional().isInt({ min: 1 }),
    body('allow_override').optional().isBoolean()
  ],
  validate,
  updateSupplier
);
router.delete('/:id', isAdmin, param('id').isInt(), validate, deactivateSupplier);

// Pricing management
router.post(
  '/:id/items',
  isManager,
  [
    param('id').isInt(),
    body('items').isArray({ min: 1 }).withMessage('items array required'),
    body('items.*.item_id').isInt(),
    body('items.*.unit_price').isFloat({ gt: 0 }),
    body('items.*.min_order_qty').optional().isInt({ min: 1 }),
    body('items.*.max_order_qty').optional().isInt({ min: 1 }),
    body('items.*.discount_percentage').optional().isFloat({ min: 0 })
  ],
  validate,
  addSupplierItemPricing
);
router.get('/:id/pricing', param('id').isInt(), validate, getSupplierPricing);
router.get('/pricing/compare', isManager, [
  query('item_id').optional().isInt(),
  query('item_ids').optional().isArray()
], validate, compareSupplierPricing);

// Performance
router.post(
  '/:id/rate',
  isManager,
  [
    param('id').isInt(),
    body('rating_type').isIn(['Overall', 'Delivery', 'Quality', 'Pricing', 'Communication']),
    body('rating').isFloat({ min: 1, max: 5 })
  ],
  validate,
  rateSupplierPerformance
);
router.get('/:id/performance', param('id').isInt(), validate, getSupplierPerformanceHistory);
router.get('/reports/comparison', isManager, getSupplierComparisonReport);

// Preferred supplier
router.put(
  '/:id/preferred',
  isAdmin,
  [
    param('id').isInt(),
    body('item_ids').isArray({ min: 1 }),
    body('is_preferred').isBoolean()
  ],
  validate,
  setPreferredSupplier
);

module.exports = router;

