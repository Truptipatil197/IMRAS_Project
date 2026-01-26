const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SCHEDULER LOG MODEL - RELOADED CLEAN VERSION
 */
const SchedulerLog = sequelize.define('SchedulerLog', {
  log_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('running', 'success', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'running'
  },
  items_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  items_eligible: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  prs_generated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  alerts_created: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  alerts_escalated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error_stack: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  execution_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  memory_usage_mb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  triggered_by: {
    type: DataTypes.ENUM('scheduler', 'manual'),
    allowNull: false,
    defaultValue: 'scheduler'
  },
  triggered_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'scheduler_logs',
  underscored: true,
  timestamps: true
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Robust execution time calculation helper
 */
const calculateDurations = (instance) => {
  const startTimeObj = instance.started_at || instance.startedAt || new Date();
  const startTime = (startTimeObj instanceof Date) ? startTimeObj.getTime() : Date.parse(startTimeObj);
  const executionTime = Date.now() - (startTime || Date.now());
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  return { executionTime, memoryUsage };
};

SchedulerLog.prototype.markComplete = async function (stats = {}, metadata = null) {
  const { executionTime, memoryUsage } = calculateDurations(this);

  await this.update({
    status: 'success',
    completed_at: new Date(),
    execution_time_ms: executionTime,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2)),
    items_processed: stats.itemsProcessed || 0,
    items_eligible: stats.itemsEligible || 0,
    prs_generated: stats.prsGenerated || 0,
    alerts_created: stats.alertsCreated || 0,
    alerts_escalated: stats.alertsEscalated || 0,
    metadata: metadata || this.metadata
  });
};

SchedulerLog.prototype.markFailed = async function (error) {
  const { executionTime, memoryUsage } = calculateDurations(this);

  await this.update({
    status: 'failed',
    completed_at: new Date(),
    execution_time_ms: executionTime,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2)),
    error_message: error.message || 'Unknown error',
    error_stack: error.stack || null
  });
};

SchedulerLog.prototype.markCancelled = async function () {
  const { executionTime, memoryUsage } = calculateDurations(this);

  await this.update({
    status: 'cancelled',
    completed_at: new Date(),
    execution_time_ms: executionTime,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2))
  });
};

// ============================================
// CLASS METHODS
// ============================================

SchedulerLog.startExecution = async function (jobName, triggeredBy = 'scheduler', userId = null) {
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

  return await this.create({
    job_name: jobName,
    status: 'running',
    started_at: new Date(),
    triggered_by: triggeredBy,
    triggered_by_user_id: userId,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2))
  });
};

module.exports = SchedulerLog;
