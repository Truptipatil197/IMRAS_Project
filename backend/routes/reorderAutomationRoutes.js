const express = require('express');
const router = express.Router();
const reorderAutomationController = require('../controllers/reorderAutomationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin, isManager, isStaff } = require('../middleware/roleMiddleware');

router.use(verifyToken);

// Get reorder dashboard
router.get('/dashboard',
  isManager,
  reorderAutomationController.getReorderDashboard
);

// Check specific item reorder status
router.get('/check/:itemId',
  isStaff,
  reorderAutomationController.checkItemReorder
);

// Get demand forecast
router.get('/forecast/:itemId',
  isManager,
  reorderAutomationController.getDemandForecast
);

// Get stockout predictions
router.get('/stockout-prediction',
  isManager,
  reorderAutomationController.getStockoutPrediction
);

// Get reorder queue
router.get('/queue',
  isManager,
  reorderAutomationController.getReorderQueue
);

module.exports = router;
