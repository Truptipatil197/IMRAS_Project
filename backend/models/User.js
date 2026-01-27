/**
 * Purpose:
 * This model represents the system users within the IMRAS application.
 * It stores authentication details, personal information, and assigned roles (Admin, Manager, Staff).
 *
 * Responsibility:
 * User profile management, role assignment, and providing the basis for authentication and authorization.
 *
 * Fit:
 * Foundational for Role-Based Access Control (RBAC), mapping every action in the system back to a specific user.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Manager', 'Staff'),
    allowNull: false,
    defaultValue: 'Staff',
    validate: {
      isIn: [['Admin', 'Manager', 'Staff']]
    }
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['username']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = User;


