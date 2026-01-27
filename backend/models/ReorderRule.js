/**
 * Purpose:
 * This complex model defines the automation logic for reordering items (Fixed, Dynamic, Seasonal, EOQ).
 * It stores buffers, lead times, and specific parameters that govern when a new purchase should be triggered.
 *
 * Responsibility:
 * Executing mathematical stock calculations and determining if an item has reached its reorder point.
 *
 * Fit:
 * Intelligence engine of IMRAS, automating the decision-making process for replenishment and stock security.
 */

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ReorderRule = sequelize.define('ReorderRule', {
  rule_id: {
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
    allowNull: true, // NULL for global rules
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  reorder_formula: {
    type: DataTypes.ENUM('fixed', 'dynamic', 'seasonal', 'eoq'),
    allowNull: false,
    defaultValue: 'dynamic',
    validate: {
      isIn: [['fixed', 'dynamic', 'seasonal', 'eoq']]
    }
  },
  auto_generate_pr: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  approval_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lead_time_buffer: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  priority_level: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high', 'critical']]
    }
  },
  min_order_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  max_order_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  order_multiple: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  seasonal_multiplier: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0.1,
      max: 10.0
    }
  },
  custom_reorder_point: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  custom_safety_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  eoq_parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    // Expected structure: { annualDemand, orderingCost, holdingCost }
    validate: {
      isValidEOQParams(value) {
        if (value !== null && this.reorder_formula === 'eoq') {
          if (!value.annualDemand || value.annualDemand <= 0) {
            throw new Error('EOQ parameters must include annualDemand > 0');
          }
          if (!value.orderingCost || value.orderingCost < 0) {
            throw new Error('EOQ parameters must include orderingCost >= 0');
          }
          if (!value.holdingCost || value.holdingCost <= 0) {
            throw new Error('EOQ parameters must include holdingCost > 0');
          }
        }
      }
    }
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_triggered: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'reorder_rules',
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
      fields: ['active']
    },
    {
      fields: ['priority_level']
    },
    {
      fields: ['reorder_formula']
    },
    {
      unique: true,
      fields: ['item_id', 'warehouse_id'],
      where: {
        warehouse_id: {
          [Op.ne]: null
        }
      }
    }
  ],
  hooks: {
    beforeCreate: async (rule) => {
      // Set default values from item if not provided
      if (!rule.item_id) {
        throw new Error('item_id is required');
      }

      const Item = sequelize.models.Item;
      const item = await Item.findByPk(rule.item_id);

      if (!item) {
        throw new Error(`Item with id ${rule.item_id} not found`);
      }

      // Set defaults if not provided
      if (rule.min_order_quantity === null || rule.min_order_quantity === undefined) {
        rule.min_order_quantity = item.reorder_point ? item.reorder_point * 2 : 100;
      }

      if (rule.custom_reorder_point === null || rule.custom_reorder_point === undefined) {
        rule.custom_reorder_point = null; // Will use item.reorder_point
      }

      if (rule.custom_safety_stock === null || rule.custom_safety_stock === undefined) {
        rule.custom_safety_stock = null; // Will use item.safety_stock
      }

      // Validate max_order_quantity > min_order_quantity if both set
      if (rule.max_order_quantity !== null && rule.min_order_quantity !== null) {
        if (parseFloat(rule.max_order_quantity) <= parseFloat(rule.min_order_quantity)) {
          throw new Error('max_order_quantity must be greater than min_order_quantity');
        }
      }
    },

    beforeUpdate: async (rule) => {
      // Validate max_order_quantity > min_order_quantity if both set
      if (rule.max_order_quantity !== null && rule.min_order_quantity !== null) {
        if (parseFloat(rule.max_order_quantity) <= parseFloat(rule.min_order_quantity)) {
          throw new Error('max_order_quantity must be greater than min_order_quantity');
        }
      }
    }
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Calculate reorder quantity based on formula
 * @param {number} currentStock - Current stock level
 * @param {number} averageDailyDemand - Average daily demand
 * @param {Object} item - Item model instance
 * @param {Object} supplier - Supplier model instance (optional)
 * @returns {Promise<number>} Calculated reorder quantity
 */
ReorderRule.prototype.calculateReorderQuantity = async function (currentStock, averageDailyDemand, item, supplier = null) {
  let quantity;

  switch (this.reorder_formula) {
    case 'fixed':
      quantity = parseFloat(this.min_order_quantity) || (item.reorder_point * 2);
      break;

    case 'dynamic':
      // reorderPoint + (avgDailyDemand * (leadTime + buffer))
      const leadTime = supplier?.avg_lead_time_days || item.lead_time_days || 7;
      const totalLeadTime = leadTime + this.lead_time_buffer;
      const demandDuringLeadTime = averageDailyDemand * totalLeadTime;
      const safetyStock = this.custom_safety_stock !== null
        ? parseFloat(this.custom_safety_stock)
        : (item.safety_stock || 0);
      const targetStock = demandDuringLeadTime + safetyStock;
      quantity = Math.max(targetStock - currentStock, parseFloat(this.min_order_quantity) || 0);
      break;

    case 'eoq':
      // Economic Order Quantity: sqrt((2 * D * S) / H)
      if (!this.eoq_parameters) {
        quantity = parseFloat(this.min_order_quantity) || 100;
      } else {
        const { annualDemand, orderingCost, holdingCost } = this.eoq_parameters;
        const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
        quantity = Math.round(eoq);
      }
      break;

    case 'seasonal':
      const baseQty = parseFloat(this.min_order_quantity) || (item.reorder_point * 2);
      quantity = Math.round(baseQty * parseFloat(this.seasonal_multiplier));
      break;

    default:
      quantity = parseFloat(this.min_order_quantity) || 100;
  }

  // Apply min/max constraints
  if (this.min_order_quantity !== null && quantity < parseFloat(this.min_order_quantity)) {
    quantity = parseFloat(this.min_order_quantity);
  }

  if (this.max_order_quantity !== null && quantity > parseFloat(this.max_order_quantity)) {
    quantity = parseFloat(this.max_order_quantity);
  }

  // Apply order multiple
  if (this.order_multiple > 1) {
    quantity = Math.ceil(quantity / this.order_multiple) * this.order_multiple;
  }

  return Math.round(quantity);
};

/**
 * Check if current stock triggers reorder
 * @param {number} currentStock - Current stock level
 * @param {Object} item - Item model instance
 * @returns {boolean} True if eligible for reorder
 */
ReorderRule.prototype.isEligibleForReorder = function (currentStock, item) {
  const reorderPoint = this.custom_reorder_point !== null
    ? parseFloat(this.custom_reorder_point)
    : item.reorder_point;
  return currentStock <= reorderPoint;
};

// ============================================
// CLASS METHODS
// ============================================

/**
 * Find active rule for item/warehouse combination
 * Priority: specific warehouse rule > global rule
 * @param {number} itemId - Item ID
 * @param {number|null} warehouseId - Warehouse ID (null for global)
 * @returns {Promise<ReorderRule|null>} Active rule or null
 */
ReorderRule.findActiveRuleForItem = async function (itemId, warehouseId = null) {
  // Build order clause
  const orderClause = [
    // Higher priority first (using CASE for proper ordering)
    [sequelize.literal(`CASE 
      WHEN priority_level = 'critical' THEN 0
      WHEN priority_level = 'high' THEN 1
      WHEN priority_level = 'medium' THEN 2
      WHEN priority_level = 'low' THEN 3
      ELSE 4
    END`), 'ASC'],
    // Most recent first
    ['created_at', 'DESC']
  ];

  const rules = await this.findAll({
    where: {
      item_id: itemId,
      active: true,
      [Op.or]: warehouseId !== null
        ? [
          { warehouse_id: warehouseId },
          { warehouse_id: null }
        ]
        : [
          { warehouse_id: null }
        ]
    },
    order: orderClause,
    limit: warehouseId !== null ? 100 : 1 // Get more if we need to prioritize by warehouse
  });

  // If we have warehouseId, prioritize specific warehouse rule
  if (warehouseId !== null && rules.length > 0) {
    const specificRule = rules.find(r => r.warehouse_id === warehouseId);
    if (specificRule) {
      return specificRule;
    }
  }

  return rules.length > 0 ? rules[0] : null;
};

/**
 * Get rules that haven't triggered in X days despite low stock
 * @param {number} days - Number of days to check (default: 7)
 * @returns {Promise<Array<ReorderRule>>} Array of expired rules
 */
ReorderRule.getExpiredRules = async function (days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.findAll({
    where: {
      active: true,
      [Op.or]: [
        { last_triggered: null },
        { last_triggered: { [Op.lt]: cutoffDate } }
      ]
    },
    include: [
      {
        model: sequelize.models.Item,
        as: 'item',
        required: true,
        where: {
          is_active: true
        }
      }
    ]
  });
};

module.exports = ReorderRule;
