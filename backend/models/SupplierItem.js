const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierItem = sequelize.define('SupplierItem', {
  supplier_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'supplier_id'
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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  min_order_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  max_order_qty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0
    }
  },
  effective_from: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  effective_to: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  is_preferred: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'supplier_items',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['supplier_id']
    },
    {
      fields: ['item_id']
    },
    {
      unique: true,
      fields: ['supplier_id', 'item_id']
    }
  ]
});

module.exports = SupplierItem;


