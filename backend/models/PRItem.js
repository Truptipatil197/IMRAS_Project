const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PRItem = sequelize.define('PRItem', {
  pr_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pr_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_requisitions',
      key: 'pr_id'
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
  requested_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  justification: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pr_items',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['pr_id']
    },
    {
      fields: ['item_id']
    }
  ]
});

module.exports = PRItem;


