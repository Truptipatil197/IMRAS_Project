/**
 * Purpose:
 * This model represents individual line items within a Purchase Order.
 * It stores the specific quantity and unit price for each item being ordered.
 *
 * Responsibility:
 * Breaking down a Purchase Order into specific items and calculating their individual total costs.
 *
 * Fit:
 * Child of the PurchaseOrder model, providing the granular list of what is expected from the supplier.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const POItem = sequelize.define('POItem', {
  po_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'po_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'items',
      key: 'item_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  ordered_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'po_items',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['po_id']
    },
    {
      fields: ['item_id']
    }
  ],
  hooks: {
    beforeValidate: (poItem) => {
      if (poItem.ordered_qty && poItem.unit_price) {
        poItem.total_price = parseFloat(poItem.ordered_qty) * parseFloat(poItem.unit_price);
      }
    }
  }
});

module.exports = POItem;


