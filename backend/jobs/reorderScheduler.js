const cron = require('node-cron');
const { SchedulerLog } = require('../models');
const reorderService = require('../services/reorderService');
const prGenerationService = require('../services/prGenerationService');
const alertEscalationService = require('../services/alertEscalationService');
const logger = require('../utils/logger');

/**
 * Reorder Scheduler
 * Manages automated reorder checks using node-cron
 */
class ReorderScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.config = {
      schedule: process.env.REORDER_SCHEDULE || '0 * * * *', // Every hour
      enabled: process.env.REORDER_SCHEDULER_ENABLED !== 'false',
      batchSize: parseInt(process.env.REORDER_BATCH_SIZE) || 50
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
      logger.warn('Scheduler already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Reorder scheduler is disabled');
      return;
    }

    logger.info(`Starting reorder scheduler: ${this.config.schedule}`);

    this.cronJob = cron.schedule(this.config.schedule, async () => {
      await this.executeReorderCheck();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });

    // Calculate next run
    this.updateNextRunTime();

    logger.info('Reorder scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Reorder scheduler stopped');
    }
  }

  /**
   * Execute reorder check
   * @param {string} triggeredBy - 'scheduler' or 'manual'
   * @param {number|null} userId - User ID if manually triggered
   * @returns {Promise<Object>} Execution result
   */
  async executeReorderCheck(triggeredBy = 'scheduler', userId = null) {
    if (this.isRunning) {
      logger.warn('Reorder check already in progress, skipping...');
      return { success: false, message: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Create log entry
    const log = await SchedulerLog.startExecution('reorder-check', triggeredBy, userId);

    try {
      logger.info('=== Reorder Check Started ===');

      // Step 1: Check all items and populate queue
      logger.info('Step 1: Checking inventory levels...');
      const checkStats = await reorderService.checkAllItems(log.log_id || log.getDataValue('log_id'));

      // Step 2: Process reorder queue and generate PRs
      logger.info('Step 2: Generating purchase requisitions...');
      const prStats = await prGenerationService.processQueueBatch(this.config.batchSize);

      // Step 3: Escalate old alerts
      logger.info('Step 3: Processing alert escalations...');
      const escalationStats = await alertEscalationService.processEscalations();

      // Update log with results
      await log.markComplete({
        itemsProcessed: checkStats.itemsProcessed,
        itemsEligible: checkStats.itemsEligible,
        prsGenerated: prStats.successful,
        alertsCreated: prStats.successful,
        alertsEscalated: escalationStats.escalated
      });

      this.stats.lastRun = new Date();
      this.stats.totalRuns++;
      this.stats.successfulRuns++;
      this.updateNextRunTime();

      const executionTime = Date.now() - startTime;
      logger.info(`=== Reorder Check Completed (${executionTime}ms) ===`);
      logger.info(`Items processed: ${checkStats.itemsProcessed}, Eligible: ${checkStats.itemsEligible}, PRs generated: ${prStats.successful}`);

      return {
        success: true,
        stats: {
          ...checkStats,
          ...prStats,
          ...escalationStats,
          executionTime
        }
      };
    } catch (error) {
      logger.error('Reorder check failed:', error);
      
      await log.markFailed(error);
      
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
   * Trigger manual execution
   * @param {number} userId - User ID triggering the execution
   * @returns {Promise<Object>} Execution result
   */
  async runNow(userId) {
    logger.info(`Manual reorder check triggered by user ${userId}`);
    return await this.executeReorderCheck('manual', userId);
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
      batchSize: this.config.batchSize,
      ...this.stats
    };
  }

  /**
   * Update next run time
   */
  updateNextRunTime() {
    // Calculate next run based on cron schedule
    // This is a simplified version - for production, use a cron parser
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    this.stats.nextRun = nextHour;
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

    if (newConfig.batchSize) {
      this.config.batchSize = parseInt(newConfig.batchSize);
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
    logger.info('Shutting down reorder scheduler...');

    if (this.isRunning) {
      logger.info('Waiting for current execution to complete...');
      // Wait up to 5 minutes
      const maxWait = 5 * 60 * 1000;
      const start = Date.now();
      while (this.isRunning && (Date.now() - start) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.stop();
    logger.info('Reorder scheduler shutdown complete');
  }
}

// Create singleton instance
const scheduler = new ReorderScheduler();

// Handle process termination
process.on('SIGINT', async () => {
  await scheduler.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await scheduler.shutdown();
  process.exit(0);
});

module.exports = scheduler;
