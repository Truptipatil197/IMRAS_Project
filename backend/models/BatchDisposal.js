const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BatchDisposal = sequelize.define('BatchDisposal', {
  disposal_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'batches',
      key: 'batch_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  disposal_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  disposal_reason: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  disposal_method: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  disposal_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  disposal_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.0
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  disposed_by: {
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
  tableName: 'batch_disposals',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['batch_id'] },
    { fields: ['disposed_by'] },
    { fields: ['disposal_date'] }
  ]
});

module.exports = BatchDisposal;

