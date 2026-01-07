const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const SchedulerLog = sequelize.define('SchedulerLog', {
  log_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('running', 'success', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'running',
    validate: {
      isIn: [['running', 'success', 'failed', 'cancelled']]
    }
  },
  items_processed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  items_eligible: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  prs_generated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  alerts_created: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  alerts_escalated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
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
    allowNull: true,
    validate: {
      min: 0
    }
  },
  memory_usage_mb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
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
    defaultValue: 'scheduler',
    validate: {
      isIn: [['scheduler', 'manual']]
    }
  },
  triggered_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'scheduler_logs',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['job_name']
    },
    {
      fields: ['status']
    },
    {
      fields: ['started_at']
    },
    {
      fields: ['triggered_by']
    },
    {
      fields: ['triggered_by_user_id']
    },
    {
      fields: ['job_name', 'status']
    }
  ]
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark execution as complete with statistics
 * @param {Object} stats - Statistics object
 * @param {number} stats.itemsProcessed - Number of items processed
 * @param {number} stats.itemsEligible - Number of items eligible for reorder
 * @param {number} stats.prsGenerated - Number of PRs generated
 * @param {number} stats.alertsCreated - Number of alerts created
 * @param {number} stats.alertsEscalated - Number of alerts escalated
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Promise<void>}
 */
SchedulerLog.prototype.markComplete = async function(stats = {}, metadata = null) {
  const executionTime = Date.now() - this.started_at.getTime();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  
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

/**
 * Mark execution as failed with error details
 * @param {Error} error - Error object
 * @returns {Promise<void>}
 */
SchedulerLog.prototype.markFailed = async function(error) {
  const executionTime = Date.now() - this.started_at.getTime();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  
  await this.update({
    status: 'failed',
    completed_at: new Date(),
    execution_time_ms: executionTime,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2)),
    error_message: error.message || 'Unknown error',
    error_stack: error.stack || null
  });
};

/**
 * Mark execution as cancelled
 * @returns {Promise<void>}
 */
SchedulerLog.prototype.markCancelled = async function() {
  const executionTime = Date.now() - this.started_at.getTime();
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  
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

/**
 * Start a new execution log
 * @param {string} jobName - Name of the job
 * @param {string} triggeredBy - 'scheduler' or 'manual'
 * @param {number|null} userId - User ID if manually triggered
 * @returns {Promise<SchedulerLog>} Created log instance
 */
SchedulerLog.startExecution = async function(jobName, triggeredBy = 'scheduler', userId = null) {
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  
  return await this.create({
    job_name: jobName,
    status: 'running',
    started_at: new Date(),
    triggered_by: triggeredBy,
    triggered_by_user_id: userId,
    memory_usage_mb: parseFloat(memoryUsage.toFixed(2))
  });
};

/**
 * Get recent executions
 * @param {number} limit - Number of records to return (default: 10)
 * @param {string|null} jobName - Optional filter by job name
 * @returns {Promise<Array<SchedulerLog>>} Array of recent executions
 */
SchedulerLog.getRecentExecutions = async function(limit = 10, jobName = null) {
  const where = {};
  if (jobName) {
    where.job_name = jobName;
  }
  
  return await this.findAll({
    where,
    order: [['started_at', 'DESC']],
    limit,
    include: [
      {
        model: sequelize.models.User,
        as: 'triggeredByUser',
        attributes: ['user_id', 'username', 'full_name'],
        required: false
      }
    ]
  });
};

/**
 * Get success rate for a period
 * @param {number} days - Number of days to analyze (default: 7)
 * @param {string|null} jobName - Optional filter by job name
 * @returns {Promise<number>} Success rate percentage
 */
SchedulerLog.getSuccessRate = async function(days = 7, jobName = null) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = {
    started_at: { [Op.gte]: since }
  };
  
  if (jobName) {
    where.job_name = jobName;
  }
  
  const total = await this.count({ where });
  
  if (total === 0) {
    return 0;
  }
  
  const successful = await this.count({
    where: {
      ...where,
      status: 'success'
    }
  });
  
  return parseFloat((successful / total * 100).toFixed(2));
};

/**
 * Get average execution time
 * @param {number} days - Number of days to analyze (default: 7)
 * @param {string|null} jobName - Optional filter by job name
 * @returns {Promise<number>} Average execution time in milliseconds
 */
SchedulerLog.getAverageExecutionTime = async function(days = 7, jobName = null) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = {
    started_at: { [Op.gte]: since },
    execution_time_ms: { [Op.ne]: null }
  };
  
  if (jobName) {
    where.job_name = jobName;
  }
  
  const result = await this.findOne({
    where,
    attributes: [
      [sequelize.fn('AVG', sequelize.col('execution_time_ms')), 'avgTime']
    ],
    raw: true
  });
  
  return result && result.avgTime ? Math.round(parseFloat(result.avgTime)) : 0;
};

/**
 * Get failures grouped by error message
 * @param {number} days - Number of days to analyze (default: 7)
 * @param {string|null} jobName - Optional filter by job name
 * @returns {Promise<Array>} Array of error summaries
 */
SchedulerLog.getFailuresByError = async function(days = 7, jobName = null) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const where = {
    started_at: { [Op.gte]: since },
    status: 'failed',
    error_message: { [Op.ne]: null }
  };
  
  if (jobName) {
    where.job_name = jobName;
  }
  
  const failures = await this.findAll({
    where,
    attributes: [
      'error_message',
      [sequelize.fn('COUNT', sequelize.col('log_id')), 'count'],
      [sequelize.fn('MAX', sequelize.col('started_at')), 'last_occurrence']
    ],
    group: ['error_message'],
    order: [[sequelize.fn('COUNT', sequelize.col('log_id')), 'DESC']],
    raw: true
  });
  
  return failures.map(f => ({
    errorMessage: f.error_message,
    count: parseInt(f.count),
    lastOccurrence: f.last_occurrence
  }));
};

/**
 * Get currently running executions
 * @returns {Promise<Array<SchedulerLog>>} Array of running executions
 */
SchedulerLog.getRunningExecutions = async function() {
  return await this.findAll({
    where: {
      status: 'running'
    },
    order: [['started_at', 'ASC']],
    include: [
      {
        model: sequelize.models.User,
        as: 'triggeredByUser',
        attributes: ['user_id', 'username', 'full_name'],
        required: false
      }
    ]
  });
};

module.exports = SchedulerLog;
