const express = require('express');
const router = express.Router();
const reorderRuleController = require('../controllers/reorderRuleController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin, isManager } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all rules (Admin, Manager)
router.get('/',
  isManager,
  reorderRuleController.getAllRules
);

// Get single rule
router.get('/:id',
  isManager,
  reorderRuleController.getRuleById
);

// Create rule (Admin, Manager)
router.post('/',
  isManager,
  reorderRuleController.createRule
);

// Update rule (Admin, Manager)
router.put('/:id',
  isManager,
  reorderRuleController.updateRule
);

// Delete rule (Admin only)
router.delete('/:id',
  isAdmin,
  reorderRuleController.deleteRule
);

// Bulk create rules (Admin only)
router.post('/bulk',
  isAdmin,
  reorderRuleController.bulkCreateRules
);

// Get rules by category
router.get('/category/:categoryId',
  isManager,
  reorderRuleController.getRulesByCategory
);

module.exports = router;
