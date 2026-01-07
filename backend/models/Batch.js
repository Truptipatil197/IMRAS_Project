const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Batch = sequelize.define('Batch', {
  batch_id: {
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
  batch_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  lot_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  manufacturing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  grn_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'grn_items',
      key: 'grn_item_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  available_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('Active', 'Expired', 'Disposed'),
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: [['Active', 'Expired', 'Disposed']]
    }
  }
}, {
  tableName: 'batches',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['item_id']
    },
    {
      fields: ['grn_item_id']
    },
    {
      fields: ['batch_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expiry_date']
    }
  ],
  hooks: {
    beforeValidate: (batch) => {
      if (batch.quantity && !batch.available_qty) {
        batch.available_qty = batch.quantity;
      }
    }
  }
});

module.exports = Batch;


