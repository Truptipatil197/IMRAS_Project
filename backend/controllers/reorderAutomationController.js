const reorderService = require('../services/reorderService');
const demandAnalysisService = require('../services/demandAnalysisService');
const { ReorderQueue, Alert, Item, PurchaseRequisition, PRItem, Warehouse } = require('../models');
const { Op } = require('sequelize');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

/**
 * Get reorder dashboard data
 * GET /api/reorder/dashboard
 */
exports.getReorderDashboard = async (req, res) => {
  try {
    // Critical items (below safety stock) - use Critical Stock alert type
    const criticalItems = await Alert.findAll({
      where: {
        alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] },
        severity: 'Critical',
        is_read: false
      },
      include: [{ model: Item, as: 'item' }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Pending reorder queue
    const pendingQueue = await ReorderQueue.getPendingCount();

    // Auto-generated PRs today (check remarks for "Auto-generated")
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMinutes(0, 0, 0);
    today.setSeconds(0, 0);
    
    const autoPRsToday = await PurchaseRequisition.count({
      where: {
        remarks: { [Op.like]: '%Auto-generated%' },
        created_at: { [Op.gte]: today }
      }
    });

    // Pending PRs needing approval (that are auto-generated)
    const pendingPRs = await PurchaseRequisition.count({
      where: {
        status: 'Pending',
        remarks: { [Op.like]: '%Auto-generated%' }
      }
    });

    // Items approaching reorder point (warning level)
    const warningItems = await Alert.count({
      where: {
        alert_type: { [Op.in]: ['Reorder', 'Low Stock'] },
        severity: { [Op.in]: ['Medium', 'High'] },
        is_read: false
      }
    });

    // Recent auto-generated PRs
    const recentPRs = await PurchaseRequisition.findAll({
      where: { 
        remarks: { [Op.like]: '%Auto-generated%' } 
      },
      include: [
        { 
          model: PRItem, 
          as: 'prItems',
          include: [{ 
            model: Item, 
            as: 'item', 
            attributes: ['item_id', 'item_name', 'sku', 'unit_of_measure'] 
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    return ok(res, {
      summary: {
        criticalItemsCount: criticalItems.length,
        pendingQueueCount: pendingQueue,
        autoPRsTodayCount: autoPRsToday,
        pendingPRsCount: pendingPRs,
        warningItemsCount: warningItems
      },
      criticalItems,
      recentPRs
    });
  } catch (error) {
    console.error('Error fetching reorder dashboard:', error);
    return fail(res, 'Failed to fetch reorder dashboard data', 500, error.message);
  }
};

/**
 * Check specific item reorder status
 * GET /api/reorder/check/:itemId
 */
exports.checkItemReorder = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { warehouseId } = req.query;

    const status = await reorderService.checkItemReorderStatus(
      parseInt(itemId),
      warehouseId ? parseInt(warehouseId) : null
    );

    return ok(res, status);
  } catch (error) {
    console.error('Error checking item reorder:', error);
    return fail(res, 'Failed to check item reorder status', 500, error.message);
  }
};

/**
 * Get demand forecast for item
 * GET /api/reorder/forecast/:itemId
 */
exports.getDemandForecast = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { warehouseId, days = 30 } = req.query;

    const forecast = await demandAnalysisService.forecastDemand(
      parseInt(itemId),
      warehouseId ? parseInt(warehouseId) : null,
      parseInt(days)
    );

    // Get historical consumption
    const avgDailyConsumption = await demandAnalysisService.calculateAverageDailyConsumption(
      parseInt(itemId),
      warehouseId ? parseInt(warehouseId) : null,
      90
    );

    // Get variability
    const variability = await demandAnalysisService.calculateDemandVariability(
      parseInt(itemId),
      warehouseId ? parseInt(warehouseId) : null,
      90
    );

    return ok(res, {
      forecast,
      historical: {
        avgDailyConsumption,
        variability
      }
    });
  } catch (error) {
    console.error('Error getting demand forecast:', error);
    return fail(res, 'Failed to get demand forecast', 500, error.message);
  }
};

/**
 * Get items at risk of stockout
 * GET /api/reorder/stockout-prediction
 */
exports.getStockoutPrediction = async (req, res) => {
  try {
    const { days = 14, warehouseId } = req.query;

    // Get all active items
    const items = await Item.findAll({
      where: { is_active: true }
    });

    const predictions = [];

    for (const item of items) {
      try {
        const currentStock = await reorderService.getCurrentStock(
          item.item_id,
          warehouseId ? parseInt(warehouseId) : null
        );

        const avgDemand = await demandAnalysisService.calculateAverageDailyConsumption(
          item.item_id,
          warehouseId ? parseInt(warehouseId) : null,
          60
        );

        if (avgDemand > 0 && currentStock > 0) {
          const daysUntilStockout = currentStock / avgDemand;

          if (daysUntilStockout <= parseInt(days)) {
            predictions.push({
              item: {
                item_id: item.item_id,
                item_name: item.item_name,
                sku: item.sku
              },
              currentStock,
              avgDailyDemand: avgDemand,
              daysUntilStockout: Math.floor(daysUntilStockout),
              estimatedStockoutDate: new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000),
              severity: daysUntilStockout <= 3 ? 'critical' : daysUntilStockout <= 7 ? 'high' : 'medium'
            });
          }
        }
      } catch (error) {
        console.error(`Error predicting stockout for item ${item.item_id}:`, error);
      }
    }

    // Sort by days until stockout
    predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    return ok(res, {
      predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Error getting stockout predictions:', error);
    return fail(res, 'Failed to get stockout predictions', 500, error.message);
  }
};

/**
 * Get reorder queue status
 * GET /api/reorder/queue
 */
exports.getReorderQueue = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: queue, count } = await ReorderQueue.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['item_id', 'item_name', 'sku', 'unit_of_measure']
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name'],
          required: false
        },
        {
          model: PurchaseRequisition,
          as: 'purchaseRequisition',
          attributes: ['pr_id', 'pr_number', 'status'],
          required: false
        }
      ],
      order: [
        ['priority_score', 'DESC'],
        ['created_at', 'ASC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return ok(res, {
      queue,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reorder queue:', error);
    return fail(res, 'Failed to fetch reorder queue', 500, error.message);
  }
};
