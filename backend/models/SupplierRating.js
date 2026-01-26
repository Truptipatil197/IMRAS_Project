const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupplierRating = sequelize.define('SupplierRating', {
  rating_id: {
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
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_orders',
      key: 'po_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  rating_type: {
    type: DataTypes.ENUM('Overall', 'Delivery', 'Quality', 'Pricing', 'Communication'),
    allowNull: false
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rated_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'supplier_ratings',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['supplier_id'] },
    { fields: ['po_id'] },
    { fields: ['rating_type'] },
    { fields: ['rated_by'] }
  ]
});

module.exports = SupplierRating;

