# Reorder Automation System - Integration Notes

## ✅ Files Created

### Models (Part 1)
- ✅ `backend/models/ReorderRule.js` - Comprehensive reorder rule configuration
- ✅ `backend/models/SchedulerLog.js` - Execution tracking
- ✅ `backend/models/ReorderQueue.js` - Queue management

### Services (Part 2)
- ✅ `backend/services/demandAnalysisService.js` - Demand analysis and forecasting
- ✅ `backend/services/reorderService.js` - Core reorder logic
- ✅ `backend/services/prGenerationService.js` - Automatic PR creation
- ✅ `backend/services/alertEscalationService.js` - Alert escalation

### Jobs (Part 3)
- ✅ `backend/jobs/reorderScheduler.js` - Main scheduler with node-cron

### Controllers (Part 4)
- ✅ `backend/controllers/reorderRuleController.js` - Reorder rule CRUD
- ✅ `backend/controllers/schedulerController.js` - Scheduler management
- ✅ `backend/controllers/reorderAutomationController.js` - Automation endpoints

### Routes (Part 4)
- ✅ `backend/routes/reorderRuleRoutes.js`
- ✅ `backend/routes/schedulerRoutes.js`
- ✅ `backend/routes/reorderAutomationRoutes.js`

### Frontend (Part 5)
- ✅ `frontend/pages/reorder-monitoring.html` - Monitoring dashboard
- ✅ `frontend/css/reorder-monitoring.css` - Styles
- ✅ `frontend/js/reorder-monitoring.js` - Dashboard functionality

## 🔧 Integration Steps

### 1. Database Setup

Since this codebase uses Sequelize model sync rather than migrations, you can either:

**Option A: Use Model Sync (Recommended for Development)**
```javascript
// In server.js or a setup script
await models.syncModels({ alter: true });
```

**Option B: Create Manual SQL Migrations**
Run SQL scripts to create the tables. The table structures are defined in the models.

### 2. Environment Variables

Add to your `.env` file:
```env
# Reorder Automation Settings
REORDER_SCHEDULER_ENABLED=true
REORDER_SCHEDULER_AUTO_START=true
REORDER_SCHEDULE=0 * * * *
REORDER_BATCH_SIZE=50

# Alert Escalation
ALERT_ESCALATION_THRESHOLD_HOURS=24
ALERT_CRITICAL_THRESHOLD_HOURS=6
ALERT_EMAIL_ENABLED=false

# Timezone
TZ=Asia/Kolkata
```

### 3. Server Integration

The `backend/server.js` has been updated to:
- Import and register new routes
- Initialize and start the reorder scheduler
- Handle graceful shutdown

### 4. Model Associations

The `backend/models/index.js` has been updated with all necessary associations for:
- ReorderRule → Item, Warehouse, User
- SchedulerLog → User
- ReorderQueue → Item, Warehouse, PurchaseRequisition, Alert, SchedulerLog

### 5. Dependencies

Ensure these packages are installed:
```bash
npm install node-cron
```

Winston is optional - the system uses the existing logger utility at `backend/utils/logger.js`.

## 📝 Notes

1. **Field Names**: All models use snake_case field names (e.g., `item_id`, `warehouse_id`) to match the existing codebase convention.

2. **Primary Keys**: Models use `{model}_id` format (e.g., `rule_id`, `log_id`, `queue_id`).

3. **User Model**: The system expects User model with `user_id` as primary key and `role` field with values: 'Admin', 'Manager', 'Staff'.

4. **Middleware**: Routes use existing `verifyToken` from `authMiddleware.js` and role checks from `roleMiddleware.js`.

5. **Alert Model**: The Alert model uses `is_read` (not `read`) and may need `escalated` and `escalated_at` fields added if they don't exist.

6. **PurchaseRequisition**: Currently doesn't have `auto_generated` field. The system uses remarks to identify auto-generated PRs. You may want to add this field to the model.

## 🚀 Usage

1. **Access Dashboard**: Navigate to `frontend/pages/reorder-monitoring.html`
2. **Create Rules**: Use `/api/reorder/rules` endpoints to create reorder rules
3. **Monitor**: Use the monitoring dashboard to view status, metrics, and logs
4. **Control**: Admins can start/stop scheduler and trigger manual runs

## 🔍 Testing

1. Create some reorder rules for test items
2. Set items below reorder point
3. Trigger manual run or wait for scheduled run
4. Check that PRs are generated automatically
5. Monitor execution logs and metrics

## ⚠️ Important

- The scheduler runs every hour by default. Adjust `REORDER_SCHEDULE` in `.env` to change this.
- Ensure all items have proper reorder rules before enabling automation.
- Monitor the first few runs closely to ensure correct behavior.
- The system respects approval requirements in rules.
