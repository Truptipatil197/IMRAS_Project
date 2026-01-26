const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin, isManager } = require('../middleware/roleMiddleware');

router.use(verifyToken);

// Get scheduler status (Admin, Manager)
router.get('/status',
  isManager,
  schedulerController.getSchedulerStatus
);

// Start scheduler (Admin only)
router.post('/start',
  isAdmin,
  schedulerController.startScheduler
);

// Stop scheduler (Admin only)
router.post('/stop',
  isAdmin,
  schedulerController.stopScheduler
);

// Trigger manual run (Admin, Manager)
router.post('/run-now',
  isManager,
  schedulerController.runSchedulerNow
);

// Update configuration (Admin only)
router.put('/config',
  isAdmin,
  schedulerController.updateSchedulerConfig
);

// Get execution logs (Admin, Manager)
router.get('/logs',
  isManager,
  schedulerController.getExecutionLogs
);

// Get metrics (Admin, Manager)
router.get('/metrics',
  isManager,
  schedulerController.getSchedulerMetrics
);

module.exports = router;
