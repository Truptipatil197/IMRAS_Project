const express = require('express');
const { query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isManager, isAdmin } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');
const {
  getABCAnalysis,
  getStockAgingReport,
  getStockTurnoverAnalysis,
  getConsumptionTrends,
  getSupplierPerformance,
  getWarehousePerformance,
  getFinancialImpactReport,
  getExecutiveDashboard
} = require('../controllers/analyticsController');

const router = express.Router();

router.use(verifyToken);

router.get(
  '/abc-analysis',
  [
    query('warehouse_id').optional().isInt(),
    query('category_id').optional().isInt()
  ],
  validate,
  getABCAnalysis
);

router.get(
  '/stock-aging',
  [
    query('warehouse_id').optional().isInt(),
    query('min_age_days').optional().isInt({ min: 0 }),
    query('category_id').optional().isInt()
  ],
  validate,
  getStockAgingReport
);

router.get(
  '/turnover',
  isManager,
  [
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate(),
    query('warehouse_id').optional().isInt(),
    query('category_id').optional().isInt()
  ],
  validate,
  getStockTurnoverAnalysis
);

router.get(
  '/consumption-trends',
  isManager,
  [
    query('item_id').optional().isInt(),
    query('period').optional().isIn(['daily', 'weekly', 'monthly']),
    query('months').optional().isInt({ min: 1, max: 24 })
  ],
  validate,
  getConsumptionTrends
);

router.get(
  '/supplier-performance',
  isManager,
  [
    query('supplier_id').optional().isInt(),
    query('start_date').optional().isDate(),
    query('end_date').optional().isDate()
  ],
  validate,
  getSupplierPerformance
);

router.get(
  '/warehouse-performance',
  isManager,
  [],
  validate,
  getWarehousePerformance
);

router.get(
  '/financial-impact',
  isAdmin,
  [],
  validate,
  getFinancialImpactReport
);

router.get(
  '/executive-dashboard',
  isManager,
  [],
  validate,
  getExecutiveDashboard
);

module.exports = router;

