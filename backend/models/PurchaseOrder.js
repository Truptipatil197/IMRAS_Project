const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  po_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  po_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  po_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'supplier_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  pr_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_requisitions',
      key: 'pr_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  status: {
    type: DataTypes.ENUM('Issued', 'In-Transit', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Issued',
    validate: {
      isIn: [['Issued', 'In-Transit', 'Completed', 'Cancelled']]
    }
  },
  expected_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.0,
    validate: {
      min: 0
    }
  },
  created_by: {
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
  tableName: 'purchase_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['po_number']
    },
    {
      fields: ['supplier_id']
    },
    {
      fields: ['pr_id']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['po_date']
    }
  ],
  hooks: {
    beforeValidate: async (po) => {
      if (!po.po_number) {
        const PurchaseOrderModel = sequelize.models.PurchaseOrder || PurchaseOrder;
        const count = await PurchaseOrderModel.count();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        po.po_number = `PO-${year}${month}-${String(count + 1).padStart(5, '0')}`;
      }
    }
  }
});

module.exports = PurchaseOrder;

