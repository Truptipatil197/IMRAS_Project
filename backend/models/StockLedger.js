const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockLedger = sequelize.define('StockLedger', {
  ledger_id: {
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
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'locations',
      key: 'location_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'batches',
      key: 'batch_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  transaction_type: {
    type: DataTypes.ENUM('GRN', 'Transfer', 'Issue', 'Adjustment', 'Count'),
    allowNull: false,
    validate: {
      isIn: [['GRN', 'Transfer', 'Issue', 'Adjustment', 'Count']]
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balance_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  transaction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reference_type: {
    type: DataTypes.STRING(50),
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
  }
}, {
  tableName: 'stock_ledgers',
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
      fields: ['location_id']
    },
    {
      fields: ['batch_id']
    },
    {
      fields: ['transaction_type']
    },
    {
      fields: ['transaction_date']
    },
    {
      fields: ['reference_id', 'reference_type']
    },
    {
      fields: ['created_by']
    }
  ]
});

module.exports = StockLedger;


