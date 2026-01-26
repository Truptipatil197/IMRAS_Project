const { PurchaseRequisition, PRItem, ReorderQueue, Item, Supplier, SupplierItem, Alert, ReorderRule, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const demandAnalysisService = require('./demandAnalysisService');

/**
 * PR Generation Service
 * Automatic Purchase Requisition creation from reorder queue
 */
class PRGenerationService {
  /**
   * Generate PR from reorder queue entry
   * FIXED: Check for pending PRs before creating new one
   * @param {Object} queueEntry - ReorderQueue instance
   * @returns {Promise<Object>} Generated PR and alert
   */
  async generatePRFromQueue(queueEntry) {
    const transaction = await sequelize.transaction();
    
    try {
      // FIXED: Check if pending PR already exists for this item
      const existingPR = await PurchaseRequisition.findOne({
        include: [{
          model: PRItem,
          as: 'prItems',
          where: { item_id: queueEntry.item_id },
          required: true
        }],
        where: {
          status: { [Op.in]: ['Pending', 'Approved'] }
        },
        transaction
      });

      if (existingPR) {
        logger.info(`Skipping PR generation for item ${queueEntry.item_id} - pending PR ${existingPR.pr_number} already exists`);
        await queueEntry.update({ 
          status: 'skipped',
          failure_reason: `Pending PR ${existingPR.pr_number} already exists`
        }, { transaction });
        await transaction.commit();
        return {
          success: false,
          skipped: true,
          reason: 'Pending PR already exists'
        };
      }

      // Mark as processing
      await queueEntry.update({ status: 'processing' }, { transaction });
      
      const item = await Item.findByPk(queueEntry.item_id, { transaction });
      if (!item) {
        throw new Error(`Item ${queueEntry.item_id} not found`);
      }
      
      // Get optimal supplier
      const supplier = await this.selectOptimalSupplier(
        queueEntry.item_id,
        queueEntry.suggested_quantity,
        transaction
      );
      
      // Determine PR status
      const rule = await ReorderRule.findActiveRuleForItem(
        queueEntry.item_id,
        queueEntry.warehouse_id
      );
      const prStatus = this.determinePRStatus(rule, queueEntry.priority_score);
      
      // Calculate urgency
      const avgDemand = await demandAnalysisService.calculateAverageDailyConsumption(
        queueEntry.item_id,
        queueEntry.warehouse_id,
        60
      );
      const daysUntilStockout = avgDemand > 0 
        ? queueEntry.current_stock / avgDemand 
        : 999;
      const urgency = this.calculateUrgencyLevel(queueEntry.priority_score, daysUntilStockout);
      
      // Generate PR number
      const prNumber = await this.generatePRNumber(transaction);
      
      // Get system user for auto-generated PRs
      const systemUser = await User.findOne({
        where: { role: { [Op.in]: ['Admin', 'Manager'] }, is_active: true },
        order: [['user_id', 'ASC']],
        transaction
      });
      
      if (!systemUser) {
        throw new Error('No system user found for auto-generated PR');
      }
      
      // Create PR
      const pr = await PurchaseRequisition.create({
        pr_number: prNumber,
        pr_date: new Date().toISOString().split('T')[0],
        requested_by: systemUser.user_id,
        status: prStatus,
        remarks: `Auto-generated reorder: Stock level ${queueEntry.current_stock}, Reorder point ${queueEntry.reorder_point}, Suggested quantity ${queueEntry.suggested_quantity}`
      }, { transaction });
      
      // Create PR Item
      await PRItem.create({
        pr_id: pr.pr_id,
        item_id: queueEntry.item_id,
        requested_qty: Math.round(queueEntry.suggested_quantity),
        justification: `Automatic reorder - Current stock: ${queueEntry.current_stock}, Reorder point: ${queueEntry.reorder_point}, Priority score: ${queueEntry.priority_score}`
      }, { transaction });
      
      // Create alert
      const alertSeverity = this.mapUrgencyToSeverity(urgency);
      const alert = await Alert.create({
        alert_type: 'Reorder',
        item_id: queueEntry.item_id,
        warehouse_id: queueEntry.warehouse_id,
        message: `PR ${prNumber} generated for ${Math.round(queueEntry.suggested_quantity)} ${item.unit_of_measure}. Current stock: ${queueEntry.current_stock}, Reorder point: ${queueEntry.reorder_point}`,
        severity: alertSeverity,
        is_read: false
      }, { transaction });
      
      // Mark queue entry as completed
      await queueEntry.update({
        status: 'completed',
        pr_id: pr.pr_id,
        alert_id: alert.alert_id,
        processed_at: new Date()
      }, { transaction });
      
      // Update rule's last_triggered date if rule exists
      if (rule) {
        await rule.update({
          last_triggered: new Date().toISOString().split('T')[0]
        }, { transaction });
      }
      
      await transaction.commit();
      
      logger.info(`PR ${prNumber} generated for item ${item.item_name} (${item.sku}) - Quantity: ${queueEntry.suggested_quantity}`);
      
      return {
        success: true,
        pr,
        alert,
        supplier: supplier ? {
          supplier_id: supplier.supplier_id,
          supplier_name: supplier.supplier_name
        } : null
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error generating PR from queue entry ${queueEntry.queue_id}:`, error);
      
      await queueEntry.update({
        status: 'failed',
        failure_reason: error.message,
        processed_at: new Date()
      }).catch(err => logger.error('Error updating queue entry status:', err));
      
      throw error;
    }
  }

  /**
   * Select optimal supplier based on multiple criteria
   * @param {number} itemId 
   * @param {number} quantity 
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object|null>} Supplier model instance
   */
  async selectOptimalSupplier(itemId, quantity, transaction = null) {
    try {
      // Get all suppliers for this item with pricing
      const supplierItems = await SupplierItem.findAll({
        where: { item_id: itemId },
        include: [{
          model: Supplier,
          as: 'supplier',
          where: { is_active: true },
          required: true
        }],
        transaction
      });
      
      if (supplierItems.length === 0) {
        logger.warn(`No suppliers found for item ${itemId}`);
        return null;
      }
      
      // Check quantity constraints
      const validSuppliers = supplierItems.filter(si => {
        const minQty = si.min_order_qty || 1;
        const maxQty = si.max_order_qty;
        return quantity >= minQty && (!maxQty || quantity <= maxQty);
      });
      
      if (validSuppliers.length === 0) {
        logger.warn(`No suppliers can fulfill quantity ${quantity} for item ${itemId}`);
        return validSuppliers[0]?.supplier || null; // Return first supplier anyway
      }
      
      // Score each supplier
      const scoredSuppliers = validSuppliers.map(si => {
        let score = 0;
        const supplier = si.supplier;
        
        // Preferred supplier (30 points)
        if (si.is_preferred) {
          score += 30;
        }
        
        // Price factor (25 points) - lower is better
        const prices = validSuppliers.map(s => parseFloat(s.unit_price || 0));
        const minPrice = Math.min(...prices.filter(p => p > 0));
        const unitPrice = parseFloat(si.unit_price || 0);
        if (minPrice > 0 && unitPrice > 0) {
          const priceRatio = minPrice / unitPrice;
          score += priceRatio * 25;
        }
        
        // Lead time factor (20 points) - shorter is better
        const leadTimes = validSuppliers.map(s => s.supplier.avg_lead_time_days || 30);
        const minLeadTime = Math.min(...leadTimes);
        const leadTime = supplier.avg_lead_time_days || 30;
        if (minLeadTime > 0 && leadTime > 0) {
          const leadTimeRatio = minLeadTime / leadTime;
          score += leadTimeRatio * 20;
        }
        
        // Rating (15 points)
        const rating = parseFloat(supplier.performance_rating || 0);
        score += (rating / 5) * 15;
        
        // Reliability (10 points) - based on performance rating
        score += (rating / 5) * 10;
        
        return { supplierItem: si, supplier, score: parseFloat(score.toFixed(2)) };
      });
      
      // Sort by score and return best
      scoredSuppliers.sort((a, b) => b.score - a.score);
      
      logger.debug(`Selected supplier ${scoredSuppliers[0].supplier.supplier_name} (score: ${scoredSuppliers[0].score}) for item ${itemId}`);
      
      return scoredSuppliers[0].supplier;
    } catch (error) {
      logger.error(`Error selecting optimal supplier for item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Determine if PR should be auto-approved
   * @param {Object} rule - ReorderRule instance
   * @param {number} priorityScore - Priority score (0-100)
   * @returns {string} PR status ('Pending' or 'Approved')
   */
  determinePRStatus(rule, priorityScore) {
    if (!rule) {
      return 'Pending';
    }

    if (!rule.approval_required) {
      return 'Approved';
    }

    // Critical items with high priority might be auto-approved
    if (rule.priority_level === 'critical' && priorityScore >= 90) {
      return 'Approved';
    }

    return 'Pending';
  }

  /**
   * Calculate urgency level
   * @param {number} priorityScore - Priority score (0-100)
   * @param {number} daysUntilStockout - Estimated days until stockout
   * @returns {string} Urgency level ('Low', 'Medium', 'High', 'Critical')
   */
  calculateUrgencyLevel(priorityScore, daysUntilStockout) {
    if (priorityScore >= 90 || daysUntilStockout < 3) {
      return 'Critical';
    }
    if (priorityScore >= 75 || daysUntilStockout < 7) {
      return 'High';
    }
    if (priorityScore >= 50 || daysUntilStockout < 14) {
      return 'Medium';
    }
    return 'Low';
  }

  /**
   * Map urgency level to alert severity
   * @param {string} urgency - Urgency level
   * @returns {string} Alert severity
   */
  mapUrgencyToSeverity(urgency) {
    const mapping = {
      'Critical': 'Critical',
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    };
    return mapping[urgency] || 'Medium';
  }

  /**
   * Generate unique PR number
   * Format: PR-YYYYMMDD-XXXX
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<string>} PR number
   */
  async generatePRNumber(transaction = null) {
    try {
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      const prefix = `PR-${dateStr}-`;

      // Get today's count
      const count = await PurchaseRequisition.count({
        where: {
          pr_number: {
            [Op.like]: `${prefix}%`
          }
        },
        transaction
      });

      const sequence = String(count + 1).padStart(4, '0');
      const prNumber = `${prefix}${sequence}`;

      // Verify uniqueness (shouldn't be needed, but safety check)
      const exists = await PurchaseRequisition.findOne({
        where: { pr_number: prNumber },
        transaction
      });

      if (exists) {
        // If collision, try next sequence
        return await this.generatePRNumber(transaction);
      }

      return prNumber;
    } catch (error) {
      logger.error('Error generating PR number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now();
      return `PR-AUTO-${timestamp}`;
    }
  }

  /**
   * Calculate required delivery date
   * @param {number} leadTimeDays - Supplier lead time in days
   * @returns {Date} Required delivery date
   */
  calculateRequiredDate(leadTimeDays) {
    const date = new Date();
    date.setDate(date.getDate() + leadTimeDays + 2); // Add 2 days buffer
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate estimated stockout date
   * @param {number} currentStock 
   * @param {number} avgDailyDemand 
   * @returns {Date|null} Estimated stockout date
   */
  calculateStockoutDate(currentStock, avgDailyDemand) {
    if (avgDailyDemand === 0 || currentStock <= 0) {
      return null;
    }
    
    const daysUntilStockout = currentStock / avgDailyDemand;
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(daysUntilStockout));
    return date.toISOString().split('T')[0];
  }

  /**
   * Process batch of queue entries
   * @param {number} limit - Maximum entries to process (default: 50)
   * @returns {Promise<Object>} Processing statistics
   */
  async processQueueBatch(limit = 50) {
    try {
      const queueEntries = await ReorderQueue.getNextBatch(limit);
      const stats = {
        processed: 0,
        successful: 0,
        failed: 0,
        prsGenerated: [],
        errors: []
      };

      logger.info(`Processing ${queueEntries.length} queue entries for PR generation`);

      for (const entry of queueEntries) {
        stats.processed++;
        try {
          const result = await this.generatePRFromQueue(entry);
          stats.successful++;
          stats.prsGenerated.push(result.pr.pr_number);
        } catch (error) {
          stats.failed++;
          stats.errors.push({
            queueId: entry.queue_id,
            itemId: entry.item_id,
            error: error.message
          });
          logger.error(`Failed to generate PR for queue entry ${entry.queue_id}:`, error);
        }
      }

      logger.info(`PR generation batch completed: ${stats.processed} processed, ${stats.successful} successful, ${stats.failed} failed`);
      
      return stats;
    } catch (error) {
      logger.error('Error processing queue batch:', error);
      throw error;
    }
  }
}

module.exports = new PRGenerationService();
