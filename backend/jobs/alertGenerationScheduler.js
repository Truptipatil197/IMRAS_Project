const cron = require('node-cron');
const { Alert, Item, StockLedger, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const expiryAlertService = require('../services/expiryAlertService');
const logger = require('../utils/logger');

/**
 * Alert Generation Scheduler
 * Automatically generates low stock and expiry alerts
 */
class AlertGenerationScheduler {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
        this.config = {
            schedule: process.env.ALERT_SCHEDULE || '*/30 * * * *', // Every 30 minutes
            enabled: process.env.ALERT_SCHEDULER_ENABLED !== 'false'
        };
        this.stats = {
            lastRun: null,
            nextRun: null,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0
        };
    }

    /**
     * Start the scheduler
     */
    start() {
        if (this.cronJob) {
            logger.warn('Alert scheduler already running');
            return;
        }

        if (!this.config.enabled) {
            logger.info('Alert scheduler is disabled');
            return;
        }

        logger.info(`Starting alert scheduler: ${this.config.schedule}`);

        this.cronJob = cron.schedule(this.config.schedule, async () => {
            await this.generateAlerts();
        }, {
            scheduled: true,
            timezone: process.env.TZ || 'UTC'
        });

        this.updateNextRunTime();
        logger.info('Alert scheduler started successfully');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger.info('Alert scheduler stopped');
        }
    }

    /**
     * Generate all alerts (low stock + expiry)
     * @returns {Promise<Object>} Statistics
     */
    async generateAlerts() {
        if (this.isRunning) {
            logger.warn('Alert generation already in progress, skipping...');
            return { success: false, message: 'Already running' };
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('=== Alert Generation Started ===');

            // Step 1: Generate low stock alerts
            logger.info('Step 1: Checking for low stock items...');
            const lowStockStats = await this.generateLowStockAlerts();

            // Step 2: Generate expiry alerts
            logger.info('Step 2: Checking for expiring batches...');
            const expiryStats = await expiryAlertService.checkExpiringBatches();

            this.stats.lastRun = new Date();
            this.stats.totalRuns++;
            this.stats.successfulRuns++;
            this.updateNextRunTime();

            const executionTime = Date.now() - startTime;
            logger.info(`=== Alert Generation Completed (${executionTime}ms) ===`);
            logger.info(`Low stock alerts: ${lowStockStats.alertsCreated}, Expiry alerts: ${expiryStats.alertsCreated}`);

            return {
                success: true,
                stats: {
                    lowStock: lowStockStats,
                    expiry: expiryStats,
                    executionTime
                }
            };
        } catch (error) {
            logger.error('Alert generation failed:', error);
            this.stats.failedRuns++;
            this.stats.lastRun = new Date();

            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate low stock alerts
     * @returns {Promise<Object>} Statistics
     */
    async generateLowStockAlerts() {
        const stats = {
            itemsChecked: 0,
            lowStockItems: 0,
            criticalStockItems: 0,
            alertsCreated: 0,
            errors: []
        };

        try {
            // Get all active items
            const items = await Item.findAll({
                where: { is_active: true },
                attributes: ['item_id', 'sku', 'item_name', 'reorder_point', 'min_stock', 'safety_stock']
            });

            stats.itemsChecked = items.length;

            // Calculate current stock for all items
            const stockResults = await StockLedger.findAll({
                attributes: [
                    'item_id',
                    [fn('COALESCE', fn('SUM', col('quantity')), 0), 'current_stock']
                ],
                group: ['item_id'],
                raw: true
            });

            const stockMap = {};
            stockResults.forEach(result => {
                stockMap[result.item_id] = parseFloat(result.current_stock || 0);
            });

            // Get manager/admin to assign alerts to
            const manager = await User.findOne({
                where: { role: { [Op.in]: ['Manager', 'Admin'] }, is_active: true },
                order: [['role', 'ASC']]
            });

            for (const item of items) {
                try {
                    const currentStock = stockMap[item.item_id] || 0;
                    const minStock = item.min_stock || item.reorder_point || 0;
                    const safetyStock = item.safety_stock || 0;

                    // Skip if stock is above min_stock
                    if (minStock === 0 || currentStock > minStock) {
                        continue;
                    }

                    // Determine severity
                    let severity = 'Medium';
                    let alertType = 'Low Stock';

                    if (currentStock === 0) {
                        severity = 'Critical';
                        alertType = 'Critical Stock';
                        stats.criticalStockItems++;
                    } else if (currentStock < safetyStock) {
                        severity = 'High';
                        alertType = 'Critical Stock';
                        stats.criticalStockItems++;
                    } else {
                        stats.lowStockItems++;
                    }

                    // Check if alert already exists
                    const existingAlert = await Alert.findOne({
                        where: {
                            item_id: item.item_id,
                            alert_type: { [Op.in]: ['Low Stock', 'Critical Stock', 'Reorder'] },
                            is_read: false
                        }
                    });

                    if (!existingAlert) {
                        await Alert.create({
                            alert_type: alertType,
                            severity,
                            item_id: item.item_id,
                            warehouse_id: null,
                            message: `${item.item_name} (${item.sku}) stock is ${currentStock}, below min stock of ${minStock}`,
                            is_read: false,
                            assigned_to: manager ? manager.user_id : null
                        });
                        stats.alertsCreated++;
                    }
                } catch (error) {
                    logger.error(`Error processing item ${item.item_id}:`, error);
                    stats.errors.push({ itemId: item.item_id, error: error.message });
                }
            }

            logger.info(`Low stock check: ${stats.lowStockItems} low stock, ${stats.criticalStockItems} critical, ${stats.alertsCreated} alerts created`);
            return stats;
        } catch (error) {
            logger.error('Error generating low stock alerts:', error);
            throw error;
        }
    }

    /**
     * Trigger manual execution
     * @returns {Promise<Object>} Execution result
     */
    async runNow() {
        logger.info('Manual alert generation triggered');
        return await this.generateAlerts();
    }

    /**
     * Get scheduler status
     * @returns {Object} Scheduler status
     */
    getStatus() {
        return {
            running: this.cronJob !== null,
            currentlyExecuting: this.isRunning,
            enabled: this.config.enabled,
            schedule: this.config.schedule,
            ...this.stats
        };
    }

    /**
     * Update next run time
     */
    updateNextRunTime() {
        const now = new Date();
        const next = new Date(now);
        next.setMinutes(now.getMinutes() + 30, 0, 0);
        this.stats.nextRun = next;
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        if (newConfig.schedule && newConfig.schedule !== this.config.schedule) {
            this.config.schedule = newConfig.schedule;
            if (this.cronJob) {
                this.stop();
                this.start();
            }
        }

        if (newConfig.enabled !== undefined) {
            this.config.enabled = newConfig.enabled;
            if (!newConfig.enabled && this.cronJob) {
                this.stop();
            } else if (newConfig.enabled && !this.cronJob) {
                this.start();
            }
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Shutting down alert scheduler...');

        if (this.isRunning) {
            logger.info('Waiting for current execution to complete...');
            const maxWait = 2 * 60 * 1000; // 2 minutes
            const start = Date.now();
            while (this.isRunning && (Date.now() - start) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.stop();
        logger.info('Alert scheduler shutdown complete');
    }
}

// Create singleton instance
const scheduler = new AlertGenerationScheduler();

// Handle process termination
process.on('SIGINT', async () => {
    await scheduler.shutdown();
});

process.on('SIGTERM', async () => {
    await scheduler.shutdown();
});

module.exports = scheduler;
