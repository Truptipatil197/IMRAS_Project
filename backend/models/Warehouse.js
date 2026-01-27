/**
 * Purpose:
 * This model defines the physical warehouses or storage facilities within the IMRAS system.
 * It stores location details and contact information for each facility.
 *
 * Responsibility:
 * Managing warehouse master data and serving as a parent entity for storage locations.
 *
 * Fit:
 * Highest level of the physical storage hierarchy, grouping multiple locations and tracking stock at a facility level.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Warehouse = sequelize.define('Warehouse', {
  warehouse_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  warehouse_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'warehouses',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['warehouse_name']
    }
  ]
});

module.exports = Warehouse;


