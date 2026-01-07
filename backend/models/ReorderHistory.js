const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReorderHistory = sequelize.define('ReorderHistory', {
    run_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    run_timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    items_checked: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    alerts_generated: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    prs_created: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Running', 'Success', 'Failed'),
        defaultValue: 'Running',
        allowNull: false
    },
    duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    triggered_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    }
}, {
    tableName: 'reorder_history',
    underscored: true,
    timestamps: false,
    indexes: [
        {
            fields: ['run_timestamp']
        },
        {
            fields: ['status']
        },
        {
            fields: ['triggered_by']
        }
    ]
});

module.exports = ReorderHistory;

