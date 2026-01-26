const { Batch, Alert, Item, Warehouse, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Expiry Alert Service
 * Manages expiry alerts for batches
 */
class ExpiryAlertService {
    /**
     * Check all batches for expiry and create alerts
     * @returns {Promise<Object>} Statistics
     */
    async checkExpiringBatches() {
        const stats = {
            batchesChecked: 0,
            expiring30Days: 0,
            expiring7Days: 0,
            expired: 0,
            alertsCreated: 0,
            errors: []
        };

        try {
            const now = new Date();
            const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Get all active batches with expiry dates
            const batches = await Batch.findAll({
                where: {
                    status: 'Active',
                    expiry_date: { [Op.ne]: null },
                    available_qty: { [Op.gt]: 0 }
                },
                include: [
                    {
                        model: Item,
                        as: 'item',
                        attributes: ['item_id', 'item_name', 'sku']
                    }
                ]
            });

            stats.batchesChecked = batches.length;
            logger.info(`Checking ${batches.length} batches for expiry`);

            // Get a manager/admin to assign alerts to
            const manager = await User.findOne({
                where: { role: { [Op.in]: ['Manager', 'Admin'] }, is_active: true },
                order: [['role', 'ASC']]
            });

            for (const batch of batches) {
                try {
                    const expiryDate = new Date(batch.expiry_date);
                    let severity = null;
                    let alertType = null;
                    let message = null;

                    // Determine alert category
                    if (expiryDate < now) {
                        // Expired
                        severity = 'Critical';
                        alertType = 'Expiry';
                        message = `Batch ${batch.batch_number} for ${batch.item.item_name} has EXPIRED (${batch.expiry_date}). Quantity: ${batch.available_qty}`;
                        stats.expired++;
                    } else if (expiryDate <= in7Days) {
                        // Expiring in 7 days
                        severity = 'High';
                        alertType = 'Expiry';
                        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                        message = `Batch ${batch.batch_number} for ${batch.item.item_name} expiring in ${daysLeft} days (${batch.expiry_date}). Quantity: ${batch.available_qty}`;
                        stats.expiring7Days++;
                    } else if (expiryDate <= in30Days) {
                        // Expiring in 30 days
                        severity = 'Medium';
                        alertType = 'Expiry';
                        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                        message = `Batch ${batch.batch_number} for ${batch.item.item_name} expiring in ${daysLeft} days (${batch.expiry_date}). Quantity: ${batch.available_qty}`;
                        stats.expiring30Days++;
                    }

                    // Create alert if needed and doesn't already exist
                    if (severity && alertType && message) {
                        const existingAlert = await Alert.findOne({
                            where: {
                                alert_type: alertType,
                                item_id: batch.item_id,
                                message: { [Op.like]: `%${batch.batch_number}%` },
                                is_read: false
                            }
                        });

                        if (!existingAlert) {
                            await Alert.create({
                                alert_type: alertType,
                                severity,
                                item_id: batch.item_id,
                                warehouse_id: null, // Batch may be in multiple warehouses
                                message,
                                is_read: false,
                                assigned_to: manager ? manager.user_id : null
                            });
                            stats.alertsCreated++;
                        }
                    }
                } catch (error) {
                    logger.error(`Error processing batch ${batch.batch_id}:`, error);
                    stats.errors.push({ batchId: batch.batch_id, error: error.message });
                }
            }

            logger.info(`Expiry check completed: ${stats.alertsCreated} alerts created`);
            return stats;
        } catch (error) {
            logger.error('Error in checkExpiringBatches:', error);
            throw error;
        }
    }

    /**
     * Get expiry alert counts for dashboard
     * @returns {Promise<Object>} Alert counts
     */
    async getExpiryAlertCounts() {
        try {
            const now = new Date();
            const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Count batches in each category
            const expired = await Batch.count({
                where: {
                    status: 'Active',
                    expiry_date: { [Op.lt]: now },
                    available_qty: { [Op.gt]: 0 }
                }
            });

            const expiring7Days = await Batch.count({
                where: {
                    status: 'Active',
                    expiry_date: {
                        [Op.gte]: now,
                        [Op.lte]: in7Days
                    },
                    available_qty: { [Op.gt]: 0 }
                }
            });

            const expiring30Days = await Batch.count({
                where: {
                    status: 'Active',
                    expiry_date: {
                        [Op.gt]: in7Days,
                        [Op.lte]: in30Days
                    },
                    available_qty: { [Op.gt]: 0 }
                }
            });

            // Count unread expiry alerts
            const unreadAlerts = await Alert.count({
                where: {
                    alert_type: 'Expiry',
                    is_read: false
                }
            });

            return {
                expired,
                expiring7Days,
                expiring30Days,
                total: expired + expiring7Days + expiring30Days,
                unreadAlerts
            };
        } catch (error) {
            logger.error('Error getting expiry alert counts:', error);
            throw error;
        }
    }

    /**
     * Get detailed expiry alerts
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Expiry alerts
     */
    async getExpiryAlerts(filters = {}) {
        try {
            const whereClause = {
                alert_type: 'Expiry'
            };

            if (filters.severity) {
                whereClause.severity = filters.severity;
            }

            if (filters.is_read !== undefined) {
                whereClause.is_read = filters.is_read;
            }

            const alerts = await Alert.findAll({
                where: whereClause,
                include: [
                    {
                        model: Item,
                        as: 'item',
                        attributes: ['item_id', 'sku', 'item_name']
                    },
                    {
                        model: Warehouse,
                        as: 'warehouse',
                        attributes: ['warehouse_id', 'warehouse_name'],
                        required: false
                    }
                ],
                order: [
                    ['severity', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            return alerts;
        } catch (error) {
            logger.error('Error getting expiry alerts:', error);
            throw error;
        }
    }
}

module.exports = new ExpiryAlertService();
