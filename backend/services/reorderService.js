const { Item, StockLedger, ReorderRule, ReorderQueue, PurchaseRequisition, PurchaseOrder, PRItem, POItem, Warehouse, Supplier, SupplierItem } = require('../models');
const { Op, fn, col } = require('sequelize');
const demandAnalysisService = require('./demandAnalysisService');
const logger = require('../utils/logger');

/**
 * Reorder Service
 * Core reorder logic orchestration
 */
class ReorderService {
  /**
   * Check all items for reorder needs
   * Main entry point called by scheduler
   * @param {number} schedulerLogId - Scheduler log ID for tracking
   * @returns {Promise<Object>} Summary statistics
   */
  async checkAllItems(schedulerLogId) {
    const startTime = Date.now();
    let stats = {
      itemsProcessed: 0,
      itemsEligible: 0,
      queueEntriesCreated: 0,
      errors: []
    };

    try {
      // Get all active items
      const items = await Item.findAll({
        where: { is_active: true },
        include: [
          { 
            model: ReorderRule, 
            as: 'reorderRules', 
            where: { active: true }, 
            required: false 
          }
        ]
      });

      logger.info(`Reorder check started: ${items.length} items to process`);

      for (const item of items) {
        stats.itemsProcessed++;
        
        try {
          // Check per warehouse or globally
          const warehouses = await this.getWarehousesForItem(item.item_id);
          
          for (const warehouse of warehouses) {
            const reorderStatus = await this.checkItemReorderStatus(
              item.item_id,
              warehouse ? warehouse.warehouse_id : null
            );

            if (reorderStatus.needsReorder) {
              stats.itemsEligible++;
              
              // Add to queue
              await ReorderQueue.create({
                item_id: item.item_id,
                warehouse_id: warehouse ? warehouse.warehouse_id : null,
                current_stock: reorderStatus.currentStock,
                reorder_point: reorderStatus.reorderPoint,
                safety_stock: reorderStatus.safetyStock,
                suggested_quantity: reorderStatus.suggestedQuantity,
                priority_score: reorderStatus.priorityScore,
                scheduler_log_id: schedulerLogId,
                status: 'pending'
              });
              
              stats.queueEntriesCreated++;
            }
          }
        } catch (error) {
          logger.error(`Error checking item ${item.item_id}:`, error);
          stats.errors.push({ itemId: item.item_id, error: error.message });
        }
      }

      const executionTime = Date.now() - startTime;
      logger.info(`Reorder check completed: ${stats.itemsEligible} items need reordering, ${stats.queueEntriesCreated} queue entries created (${executionTime}ms)`);

      return stats;
    } catch (error) {
      logger.error('Error in checkAllItems:', error);
      throw error;
    }
  }

  /**
   * Check if specific item needs reordering
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @returns {Promise<Object>} Reorder status information
   */
  async checkItemReorderStatus(itemId, warehouseId = null) {
    try {
      const item = await Item.findByPk(itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      // Get active reorder rule
      const rule = await ReorderRule.findActiveRuleForItem(itemId, warehouseId);
      
      // Get current stock
      const currentStock = await this.getCurrentStock(itemId, warehouseId);
      
      // Get pending orders
      const pendingQty = await this.getPendingOrders(itemId, warehouseId);
      
      // Effective stock = current + pending
      const effectiveStock = currentStock + pendingQty;
      
      // Determine reorder point and safety stock
      const reorderPoint = rule?.custom_reorder_point !== null 
        ? parseFloat(rule.custom_reorder_point) 
        : (item.reorder_point || 0);
      const safetyStock = rule?.custom_safety_stock !== null 
        ? parseFloat(rule.custom_safety_stock) 
        : (item.safety_stock || 0);
      
      // Check if reorder needed
      const needsReorder = effectiveStock <= reorderPoint;
      
      if (!needsReorder) {
        return {
          needsReorder: false,
          currentStock,
          effectiveStock,
          reorderPoint,
          pendingQty,
          safetyStock
        };
      }
      
      // Calculate suggested order quantity
      const avgDemand = await demandAnalysisService.calculateAverageDailyConsumption(
        itemId,
        warehouseId,
        60
      );
      
      const supplier = await this.getPreferredSupplier(itemId);
      
      const suggestedQuantity = rule 
        ? await rule.calculateReorderQuantity(currentStock, avgDemand, item, supplier)
        : await this.calculateDefaultOrderQuantity(item, currentStock, avgDemand);
      
      // Calculate priority score
      const priorityScore = this.calculatePriorityScore(
        currentStock,
        reorderPoint,
        safetyStock,
        avgDemand,
        rule
      );
      
      return {
        needsReorder: true,
        currentStock,
        effectiveStock,
        pendingQty,
        reorderPoint,
        safetyStock,
        suggestedQuantity,
        priorityScore,
        avgDailyDemand: avgDemand,
        supplier
      };
    } catch (error) {
      logger.error(`Error checking reorder status for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get current stock level for item
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @returns {Promise<number>} Current stock quantity
   */
  async getCurrentStock(itemId, warehouseId = null) {
    try {
      const whereClause = { item_id: itemId };
      if (warehouseId) {
        whereClause.warehouse_id = warehouseId;
      }
      
      // Get latest balance from stock ledger
      // Find latest ledger entry per warehouse (if warehouseId is null, aggregate)
      if (warehouseId) {
        // Single warehouse
        const latestEntry = await StockLedger.findOne({
          where: whereClause,
          order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']],
          attributes: ['balance_qty']
        });
        
        return latestEntry ? parseFloat(latestEntry.balance_qty) : 0;
      } else {
        // Aggregate across all warehouses
        const latestPerWarehouse = await StockLedger.findAll({
          attributes: [
            'warehouse_id',
            [fn('MAX', col('ledger_id')), 'latest_ledger_id']
          ],
          where: whereClause,
          group: ['warehouse_id'],
          raw: true
        });
        
        if (latestPerWarehouse.length === 0) {
          return 0;
        }
        
        const ledgerIds = latestPerWarehouse.map(l => l.latest_ledger_id);
        const latestLedgers = await StockLedger.findAll({
          where: { ledger_id: { [Op.in]: ledgerIds } },
          attributes: ['balance_qty']
        });
        
        const totalStock = latestLedgers.reduce((sum, ledger) => {
          return sum + parseFloat(ledger.balance_qty || 0);
        }, 0);
        
        return totalStock;
      }
    } catch (error) {
      logger.error(`Error getting current stock for item ${itemId}:`, error);
      return 0;
    }
  }

  /**
   * Get quantity in pending PRs and POs
   * @param {number} itemId 
   * @param {number|null} warehouseId 
   * @returns {Promise<number>} Total pending quantity
   */
  async getPendingOrders(itemId, warehouseId = null) {
    try {
      let totalPending = 0;
      
      // Pending PRs - sum requested_qty from PRItems
      const pendingPRs = await PRItem.findAll({
        include: [{
          model: PurchaseRequisition,
          as: 'purchaseRequisition',
          where: {
            status: { [Op.in]: ['Pending', 'Approved'] }
          },
          required: true,
          attributes: []
        }],
        where: {
          item_id: itemId
        },
        attributes: ['requested_qty'],
        raw: false
      });
      
      const prQty = pendingPRs.reduce((sum, prItem) => {
        return sum + parseFloat(prItem.requested_qty || 0);
      }, 0);
      
      totalPending += prQty;
      
      // Pending/In-Transit POs - sum ordered_qty from POItems
      const pendingPOs = await POItem.findAll({
        include: [{
          model: PurchaseOrder,
          as: 'purchaseOrder',
          where: {
            status: { [Op.in]: ['Issued', 'In-Transit'] }
          },
          required: true,
          attributes: []
        }],
        where: {
          item_id: itemId
        },
        attributes: ['ordered_qty'],
        raw: false
      });
      
      const poQty = pendingPOs.reduce((sum, poItem) => {
        return sum + parseFloat(poItem.ordered_qty || 0);
      }, 0);
      
      totalPending += poQty;
      
      logger.debug(`Pending orders for item ${itemId}: ${totalPending} (PRs: ${prQty}, POs: ${poQty})`);
      
      return totalPending;
    } catch (error) {
      logger.error(`Error getting pending orders for item ${itemId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate priority score (0-100)
   * Higher score = more urgent
   * @param {number} currentStock 
   * @param {number} reorderPoint 
   * @param {number} safetyStock 
   * @param {number} avgDemand 
   * @param {Object} rule - ReorderRule instance
   * @returns {number} Priority score (0-100)
   */
  calculatePriorityScore(currentStock, reorderPoint, safetyStock, avgDemand, rule) {
    let score = 50; // Base score
    
    // Stock level factor (0-40 points)
    if (reorderPoint > 0) {
      const stockRatio = currentStock / reorderPoint;
      if (stockRatio < 0.5) score += 40;
      else if (stockRatio < 0.75) score += 30;
      else if (stockRatio < 1.0) score += 20;
    } else {
      // No reorder point set - prioritize based on stock level
      if (currentStock === 0) score += 40;
      else if (currentStock < safetyStock) score += 30;
    }
    
    // Below safety stock (20 points)
    if (safetyStock > 0 && currentStock < safetyStock) {
      score += 20;
    }
    
    // Consumption rate factor (0-20 points)
    if (avgDemand > 0 && currentStock > 0) {
      const daysUntilStockout = currentStock / avgDemand;
      if (daysUntilStockout < 3) score += 20;
      else if (daysUntilStockout < 7) score += 15;
      else if (daysUntilStockout < 14) score += 10;
    } else if (currentStock === 0) {
      score += 20; // Already out of stock
    }
    
    // Rule priority level (0-20 points)
    if (rule) {
      const priorityPoints = {
        'critical': 20,
        'high': 15,
        'medium': 10,
        'low': 5
      };
      score += priorityPoints[rule.priority_level] || 10;
    }
    
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Get warehouses that stock this item
   * @param {number} itemId 
   * @returns {Promise<Array>} Array of warehouse objects or [null] for global
   */
  async getWarehousesForItem(itemId) {
    try {
      // Check if item has warehouse-specific rules
      const rules = await ReorderRule.findAll({
        where: { 
          item_id: itemId, 
          active: true, 
          warehouse_id: { [Op.ne]: null } 
        },
        attributes: ['warehouse_id'],
        group: ['warehouse_id']
      });
      
      if (rules.length > 0) {
        return rules.map(r => ({ warehouse_id: r.warehouse_id }));
      }
      
      // Check which warehouses actually have stock for this item
      const warehousesWithStock = await StockLedger.findAll({
        attributes: ['warehouse_id'],
        where: { item_id: itemId },
        include: [{
          model: Warehouse,
          as: 'warehouse',
          where: { is_active: true },
          required: true,
          attributes: ['warehouse_id', 'warehouse_name']
        }],
        group: ['warehouse_id'],
        raw: false
      });
      
      if (warehousesWithStock.length > 0) {
        return warehousesWithStock.map(s => ({ 
          warehouse_id: s.warehouse_id 
        }));
      }
      
      // Otherwise, check globally
      return [null];
    } catch (error) {
      logger.error(`Error getting warehouses for item ${itemId}:`, error);
      return [null];
    }
  }

  /**
   * Get preferred supplier for item
   * @param {number} itemId 
   * @returns {Promise<Object|null>} Supplier model instance
   */
  async getPreferredSupplier(itemId) {
    try {
      // Get preferred supplier item
      const preferredSupplierItem = await SupplierItem.findOne({
        where: {
          item_id: itemId,
          is_preferred: true
        },
        include: [{
          model: Supplier,
          as: 'supplier',
          where: { is_active: true },
          required: true
        }],
        order: [['unit_price', 'ASC']] // Prefer lower price if multiple preferred
      });
      
      if (preferredSupplierItem && preferredSupplierItem.supplier) {
        return preferredSupplierItem.supplier;
      }
      
      // If no preferred, get supplier with best rating
      const supplierItem = await SupplierItem.findOne({
        where: { item_id: itemId },
        include: [{
          model: Supplier,
          as: 'supplier',
          where: { is_active: true },
          required: true
        }],
        order: [
          ['supplier', 'performance_rating', 'DESC'],
          ['unit_price', 'ASC']
        ]
      });
      
      return supplierItem?.supplier || null;
    } catch (error) {
      logger.error(`Error getting preferred supplier for item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Default order quantity calculation (when no rule exists)
   * @param {Object} item - Item model instance
   * @param {number} currentStock 
   * @param {number} avgDemand 
   * @returns {number} Suggested order quantity
   */
  async calculateDefaultOrderQuantity(item, currentStock, avgDemand) {
    // Simple: (reorderPoint * 2) - currentStock
    const targetStock = (item.reorder_point || 100) * 2;
    const suggested = Math.max(targetStock - currentStock, item.reorder_point || 100);
    
    // Consider average demand for better estimation
    if (avgDemand > 0) {
      const daysOfStock = suggested / avgDemand;
      // Aim for 30 days of stock
      const idealStock = avgDemand * 30;
      return Math.max(suggested, idealStock - currentStock);
    }
    
    return suggested;
  }

  /**
   * Prioritize items based on various factors
   * @param {Array} items - Array of items with reorder data
   * @returns {Array} Sorted items by priority
   */
  prioritizeItems(items) {
    return items.sort((a, b) => {
      // Sort by priority score (descending)
      if (b.priorityScore !== a.priorityScore) {
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      }
      // Then by current stock (ascending - lower stock first)
      return (a.currentStock || 0) - (b.currentStock || 0);
    });
  }

  /**
   * Process reorder queue batch
   * @param {number} batchSize - Maximum items to process
   * @returns {Promise<Object>} Processing statistics
   */
  async processReorderQueue(batchSize = 50) {
    const stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const queueEntries = await ReorderQueue.getNextBatch(batchSize);
      logger.info(`Processing ${queueEntries.length} queue entries`);

      for (const entry of queueEntries) {
        stats.processed++;
        try {
          // This will be called by PR generation service
          // For now, just mark as ready for processing
          await entry.markProcessing();
        } catch (error) {
          stats.failed++;
          stats.errors.push({ queueId: entry.queue_id, error: error.message });
          logger.error(`Error processing queue entry ${entry.queue_id}:`, error);
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error processing reorder queue:', error);
      throw error;
    }
  }
}

module.exports = new ReorderService();
