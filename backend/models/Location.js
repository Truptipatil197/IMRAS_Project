/**
 * Purpose:
 * This model represents specific storage sub-locations (Aisles, Racks, Bins) within a Warehouse.
 * It allows for precise tracking of where an item is physically stored.
 *
 * Responsibility:
 * Defining the internal layout of warehouses and facilitating efficient stock picking and placement.
 *
 * Fit:
 * Child of the Warehouse model, providing granular storage addressability for items and batches.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
  location_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
      key: 'warehouse_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  aisle: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  rack: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  bin: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  location_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'locations',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['location_code']
    },
    {
      fields: ['warehouse_id']
    }
  ]
});

module.exports = Location;


