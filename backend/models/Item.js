/**
 * Purpose:
 * This model defines the master catalog of items (e.g., medical supplies, medicines) managed by IMRAS.
 * It includes essential metadata such as SKU, unit of measure, and stock threshold parameters.
 *
 * Responsibility:
 * Maintaining item master data and defining reorder logic parameters (min/max stock, safety stock).
 *
 * Fit:
 * Core entity of the inventory system; almost all other modules (GRN, PO, Reorder) refer to this model.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Item = sequelize.define('Item', {
  item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sku: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'category_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  unit_of_measure: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['Kg', 'Liter', 'Piece', 'Box', 'Carton', 'Pack', 'Unit', 'Meter', 'Gram', 'Bag']]
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  reorder_point: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  min_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Minimum stock level - triggers reorder when stock <= min_stock'
  },
  max_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Maximum stock level - reorder quantity = max_stock - current_stock'
  },
  safety_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'items',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['sku']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['item_name']
    }
  ]
});

module.exports = Item;


