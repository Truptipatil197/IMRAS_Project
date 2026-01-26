const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  supplier_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_terms_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 0
    }
  },
  avg_lead_time_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 7,
    validate: {
      min: 0
    }
  },
  performance_rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 0.0,
    validate: {
      min: 0,
      max: 5
    }
  },
  alternate_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'India'
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  gstin: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  credit_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0
    }
  },
  bank_details: {
    type: DataTypes.TEXT, // store JSON string
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'suppliers',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['supplier_name']
    }
  ]
});

module.exports = Supplier;


