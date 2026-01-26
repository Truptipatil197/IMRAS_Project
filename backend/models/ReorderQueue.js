const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ReorderQueue = sequelize.define('ReorderQueue', {
  queue_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'items',
      key: 'item_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  reorder_point: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  safety_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  suggested_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  priority_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'processing', 'completed', 'failed', 'cancelled']]
    }
  },
  pr_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_requisitions',
      key: 'pr_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  alert_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'alerts',
      key: 'alert_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  scheduler_log_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'scheduler_logs',
      key: 'log_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'reorder_queue',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['item_id']
    },
    {
      fields: ['warehouse_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority_score']
    },
    {
      fields: ['pr_id']
    },
    {
      fields: ['alert_id']
    },
    {
      fields: ['scheduler_log_id']
    },
    {
      fields: ['status', 'priority_score']
    },
    {
      fields: ['created_at']
    }
  ]
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark queue item as processed
 * @param {number} prId - Purchase Requisition ID
 * @param {number} alertId - Alert ID (optional)
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.markProcessed = async function(prId, alertId = null) {
  await this.update({
    status: 'completed',
    pr_id: prId,
    alert_id: alertId,
    processed_at: new Date()
  });
};

/**
 * Mark queue item as failed
 * @param {string} reason - Failure reason
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.markFailed = async function(reason) {
  await this.update({
    status: 'failed',
    failure_reason: reason,
    processed_at: new Date()
  });
};

/**
 * Increment retry count
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.incrementRetry = async function() {
  await this.increment('retry_count');
};

/**
 * Mark queue item as processing
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.markProcessing = async function() {
  await this.update({
    status: 'processing'
  });
};

/**
 * Mark queue item as cancelled
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.markCancelled = async function() {
  await this.update({
    status: 'cancelled',
    processed_at: new Date()
  });
};

/**
 * Reset queue item to pending (for retry)
 * @returns {Promise<void>}
 */
ReorderQueue.prototype.resetToPending = async function() {
  await this.update({
    status: 'pending',
    processed_at: null
  });
};

// ============================================
// CLASS METHODS
// ============================================

/**
 * Get next batch of pending items for processing
 * @param {number} limit - Maximum number of items to retrieve (default: 50)
 * @param {number|null} maxRetries - Maximum retry count (default: 3)
 * @returns {Promise<Array<ReorderQueue>>} Array of queue items
 */
ReorderQueue.getNextBatch = async function(limit = 50, maxRetries = 3) {
  return await this.findAll({
    where: {
      status: 'pending',
      retry_count: { [Op.lt]: maxRetries }
    },
    order: [
      ['priority_score', 'DESC'], // Higher priority first
      ['created_at', 'ASC'] // Older items first
    ],
    limit,
    include: [
      {
        model: sequelize.models.Item,
        as: 'item',
        required: true,
        where: {
          is_active: true
        }
      },
      {
        model: sequelize.models.Warehouse,
        as: 'warehouse',
        required: false
      }
    ]
  });
};

/**
 * Get count of pending items
 * @returns {Promise<number>} Count of pending items
 */
ReorderQueue.getPendingCount = async function() {
  return await this.count({
    where: {
      status: 'pending'
    }
  });
};

/**
 * Get failed items that can be retried
 * @param {number} maxRetries - Maximum retry count (default: 3)
 * @returns {Promise<Array<ReorderQueue>>} Array of failed items
 */
ReorderQueue.getFailedItems = async function(maxRetries = 3) {
  return await this.findAll({
    where: {
      status: 'failed',
      retry_count: { [Op.lt]: maxRetries }
    },
    order: [
      ['priority_score', 'DESC'],
      ['created_at', 'ASC']
    ],
    include: [
      {
        model: sequelize.models.Item,
        as: 'item',
        required: true
      }
    ]
  });
};

/**
 * Get queue items by status
 * @param {string} status - Status to filter by
 * @param {number} limit - Maximum number of items (optional)
 * @returns {Promise<Array<ReorderQueue>>} Array of queue items
 */
ReorderQueue.getByStatus = async function(status, limit = null) {
  const options = {
    where: { status },
    order: [
      ['priority_score', 'DESC'],
      ['created_at', 'DESC']
    ],
    include: [
      {
        model: sequelize.models.Item,
        as: 'item',
        required: true
      },
      {
        model: sequelize.models.Warehouse,
        as: 'warehouse',
        required: false
      },
      {
        model: sequelize.models.PurchaseRequisition,
        as: 'purchaseRequisition',
        required: false
      },
      {
        model: sequelize.models.Alert,
        as: 'alert',
        required: false
      }
    ]
  };
  
  if (limit) {
    options.limit = limit;
  }
  
  return await this.findAll(options);
};

/**
 * Get items stuck in processing status (older than X minutes)
 * @param {number} minutes - Number of minutes (default: 30)
 * @returns {Promise<Array<ReorderQueue>>} Array of stuck items
 */
ReorderQueue.getStuckItems = async function(minutes = 30) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  
  return await this.findAll({
    where: {
      status: 'processing',
      updated_at: { [Op.lt]: cutoffTime }
    },
    include: [
      {
        model: sequelize.models.Item,
        as: 'item',
        required: true
      }
    ]
  });
};

/**
 * Clear completed items older than X days
 * @param {number} days - Number of days (default: 30)
 * @returns {Promise<number>} Number of deleted records
 */
ReorderQueue.clearOldCompleted = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const result = await this.destroy({
    where: {
      status: 'completed',
      processed_at: { [Op.lt]: cutoffDate }
    }
  });
  
  return result;
};

module.exports = ReorderQueue;
