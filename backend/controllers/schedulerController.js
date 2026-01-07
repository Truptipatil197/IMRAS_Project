const reorderScheduler = require('../jobs/reorderScheduler');
const { SchedulerLog, ReorderQueue, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Get scheduler status
 * GET /api/reorder/scheduler/status
 */
exports.getSchedulerStatus = async (req, res) => {
  try {
    const status = reorderScheduler.getStatus();
    
    // Get recent execution history
    const recentLogs = await SchedulerLog.findAll({
      where: { job_name: 'reorder-check' },
      order: [['started_at', 'DESC']],
      limit: 10
    });

    // Get pending queue count
    const pendingQueueCount = await ReorderQueue.getPendingCount();

    // Calculate success rate
    const successRate = await SchedulerLog.getSuccessRate(7, 'reorder-check');
    const avgExecutionTime = await SchedulerLog.getAverageExecutionTime(7, 'reorder-check');

    return res.status(200).json({
      success: true,
      data: {
        scheduler: status,
        recentExecutions: recentLogs,
        pendingQueue: pendingQueueCount,
        metrics: {
          successRate: parseFloat(successRate),
          avgExecutionTimeMs: avgExecutionTime
        }
      }
    });
  } catch (error) {
    console.error('Error fetching scheduler status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status',
      error: error.message
    });
  }
};

/**
 * Start scheduler
 * POST /api/reorder/scheduler/start
 */
exports.startScheduler = async (req, res) => {
  try {
    // Only admins can start/stop scheduler
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can control the scheduler'
      });
    }

    reorderScheduler.start();

    return res.status(200).json({
      success: true,
      message: 'Scheduler started successfully',
      data: reorderScheduler.getStatus()
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: error.message
    });
  }
};

/**
 * Stop scheduler
 * POST /api/reorder/scheduler/stop
 */
exports.stopScheduler = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can control the scheduler'
      });
    }

    reorderScheduler.stop();

    return res.status(200).json({
      success: true,
      message: 'Scheduler stopped successfully',
      data: reorderScheduler.getStatus()
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: error.message
    });
  }
};

/**
 * Trigger manual execution
 * POST /api/reorder/scheduler/run-now
 */
exports.runSchedulerNow = async (req, res) => {
  try {
    // Managers and Admins can trigger manual runs
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    // Run in background
    reorderScheduler.runNow(req.user.user_id).then(result => {
      console.log('Manual reorder check completed:', result);
    }).catch(error => {
      console.error('Manual reorder check failed:', error);
    });

    return res.status(200).json({
      success: true,
      message: 'Reorder check triggered successfully. This will run in the background.',
      data: {
        triggeredBy: req.user.username,
        triggeredAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error triggering manual run:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger manual run',
      error: error.message
    });
  }
};

/**
 * Update scheduler configuration
 * PUT /api/reorder/scheduler/config
 */
exports.updateSchedulerConfig = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update scheduler configuration'
      });
    }

    const { schedule, batchSize, enabled } = req.body;

    reorderScheduler.updateConfig({
      schedule,
      batchSize,
      enabled
    });

    return res.status(200).json({
      success: true,
      message: 'Scheduler configuration updated successfully',
      data: reorderScheduler.getStatus()
    });
  } catch (error) {
    console.error('Error updating scheduler config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scheduler configuration',
      error: error.message
    });
  }
};

/**
 * Get execution logs
 * GET /api/reorder/scheduler/logs
 */
exports.getExecutionLogs = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 20,
      startDate,
      endDate 
    } = req.query;

    const whereClause = { job_name: 'reorder-check' };
    
    if (status) whereClause.status = status;
    if (startDate) {
      whereClause.started_at = whereClause.started_at || {};
      whereClause.started_at[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      whereClause.started_at = whereClause.started_at || {};
      whereClause.started_at[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: logs, count } = await SchedulerLog.findAndCountAll({
      where: whereClause,
      order: [['started_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'triggeredByUser',
        attributes: ['user_id', 'username', 'email'],
        required: false
      }]
    });

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch execution logs',
      error: error.message
    });
  }
};

/**
 * Get scheduler metrics/statistics
 * GET /api/reorder/scheduler/metrics
 */
exports.getSchedulerMetrics = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Total executions
    const totalExecutions = await SchedulerLog.count({
      where: {
        job_name: 'reorder-check',
        started_at: { [Op.gte]: since }
      }
    });

    // Successful executions
    const successfulExecutions = await SchedulerLog.count({
      where: {
        job_name: 'reorder-check',
        status: 'success',
        started_at: { [Op.gte]: since }
      }
    });

    // Failed executions
    const failedExecutions = await SchedulerLog.count({
      where: {
        job_name: 'reorder-check',
        status: 'failed',
        started_at: { [Op.gte]: since }
      }
    });

    // Average execution time
    const avgExecutionTime = await SchedulerLog.getAverageExecutionTime(parseInt(days), 'reorder-check');

    // Total items processed - using aggregate query
    const [result] = await sequelize.query(`
      SELECT 
        SUM(items_processed) as totalItems,
        SUM(prs_generated) as totalPRs
      FROM scheduler_logs
      WHERE job_name = 'reorder-check'
        AND started_at >= :since
    `, {
      replacements: { since },
      type: QueryTypes.SELECT
    });

    const totalItemsProcessed = parseInt(result?.totalItems || 0);
    const totalPRsGenerated = parseInt(result?.totalPRs || 0);

    // Success rate
    const successRate = totalExecutions > 0 
      ? (successfulExecutions / totalExecutions * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: parseFloat(successRate),
        avgExecutionTimeMs: avgExecutionTime,
        totalItemsProcessed,
        totalPRsGenerated
      }
    });
  } catch (error) {
    console.error('Error fetching scheduler metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler metrics',
      error: error.message
    });
  }
};
