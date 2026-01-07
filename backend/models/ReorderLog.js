const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReorderLog = sequelize.define('ReorderLog', {
    log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    run_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'reorder_history',
            key: 'run_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    level: {
        type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR'),
        defaultValue: 'INFO',
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'items',
            key: 'item_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    }
}, {
    tableName: 'reorder_logs',
    underscored: true,
    timestamps: false,
    indexes: [
        {
            fields: ['run_id']
        },
        {
            fields: ['timestamp']
        },
        {
            fields: ['level']
        },
        {
            fields: ['item_id']
        }
    ]
});

module.exports = ReorderLog;

