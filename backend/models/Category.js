/**
 * Purpose:
 * This model defines the various categories of items (e.g., Antibiotics, Consumables, Lab Supplies).
 * It enables organized classification and filtering of the item master.
 *
 * Responsibility:
 * Maintaining the category taxonomies used throughout the system for reporting and organization.
 *
 * Fit:
 * Foundational structural entity that groups items, making the inventory manageable and searchable.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'categories',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['category_name']
    }
  ]
});

module.exports = Category;


