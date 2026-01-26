const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GRN = sequelize.define('GRN', {
  grn_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grn_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  grn_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'po_id'
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
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Completed'),
    allowNull: false,
    defaultValue: 'Draft',
    validate: {
      isIn: [['Draft', 'Completed']]
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'grns',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['grn_number']
    },
    {
      fields: ['po_id']
    },
    {
      fields: ['warehouse_id']
    },
    {
      fields: ['received_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['grn_date']
    }
  ],
  hooks: {
    beforeValidate: async (grn) => {
      if (!grn.grn_number) {
        const GRNModel = sequelize.models.GRN || GRN;
        const count = await GRNModel.count();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        grn.grn_number = `GRN-${year}${month}-${String(count + 1).padStart(5, '0')}`;
      }
    }
  }
});

module.exports = GRN;

