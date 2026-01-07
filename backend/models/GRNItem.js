const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GRNItem = sequelize.define('GRNItem', {
  grn_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grn_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'grns',
      key: 'grn_id'
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
  received_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  accepted_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  rejected_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'grn_items',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['grn_id']
    },
    {
      fields: ['item_id']
    }
  ],
  hooks: {
    beforeValidate: (grnItem) => {
      if (grnItem.received_qty && grnItem.accepted_qty) {
        const received = parseInt(grnItem.received_qty);
        const accepted = parseInt(grnItem.accepted_qty);
        if (!grnItem.rejected_qty) {
          grnItem.rejected_qty = Math.max(0, received - accepted);
        }
      }
    }
  }
});

module.exports = GRNItem;


