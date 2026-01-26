const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseRequisition = sequelize.define('PurchaseRequisition', {
  pr_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pr_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  pr_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  requested_by: {
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
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Approved', 'Rejected']]
    }
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  approved_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'purchase_requisitions',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['pr_number']
    },
    {
      fields: ['requested_by']
    },
    {
      fields: ['approved_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['pr_date']
    }
  ],
  hooks: {
    beforeValidate: async (pr) => {
      if (!pr.pr_number) {
        const PurchaseRequisitionModel = sequelize.models.PurchaseRequisition || PurchaseRequisition;
        const count = await PurchaseRequisitionModel.count();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        pr.pr_number = `PR-${year}${month}-${String(count + 1).padStart(5, '0')}`;
      }
    }
  }
});

module.exports = PurchaseRequisition;

