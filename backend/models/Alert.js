const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Alert = sequelize.define('Alert', {
  alert_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  alert_type: {
    type: DataTypes.ENUM(
      'Low Stock',
      'Expiry Warning',
      'Expiry Warning - 30 Days',
      'Expiry Warning - 7 Days',
      'Expired',
      'Reorder',
      'Critical Stock'
    ),
    allowNull: false,
    validate: {
      isIn: [['Low Stock', 'Expiry Warning', 'Expiry Warning - 30 Days', 'Expiry Warning - 7 Days', 'Expired', 'Reorder', 'Critical Stock']]
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'items',
      key: 'item_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'batches',
      key: 'batch_id'
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
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  severity: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium',
    validate: {
      isIn: [['Low', 'Medium', 'High', 'Critical']]
    }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  assigned_to: {
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
  tableName: 'alerts',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['item_id']
    },
    {
      fields: ['batch_id']
    },
    {
      fields: ['warehouse_id']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['alert_type']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Alert;


