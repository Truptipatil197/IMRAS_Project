const { Op, fn, col, literal, Sequelize } = require('sequelize');
const {
  sequelize,
  Batch,
  Item,
  Category,
  GRNItem,
  GRN,
  Warehouse,
  Location,
  StockLedger,
  Alert,
  BatchDisposal,
  User
} = require('../models');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

const findManagerOrAdmin = async () => {
  return User.findOne({
    where: { role: { [Op.in]: ['Manager', 'Admin'] }, is_active: true },
    order: [['role', 'ASC']]
  });
};

const calculateDaysToExpiry = (expiry_date) => {
  if (!expiry_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiry_date);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const categorizeExpiryStatus = (days) => {
  if (days === null || days === undefined) return 'valid';
  if (days < 0) return 'expired';
  if (days <= 7) return 'expiring_7';
  if (days <= 30) return 'expiring_30';
  return 'valid';
};

const getExpiryAlertSeverity = (days) => {
  if (days < 0) return 'Critical';
  if (days <= 7) return 'High';
  return 'Medium';
};

const calculateFinancialImpact = async (item_id, quantity) => {
  const item = await Item.findByPk(item_id);
  const unitPrice = item ? Number(item.unit_price || 0) : 0;
  return {
    unit_price: unitPrice,
    value: Number(quantity || 0) * unitPrice
  };
};

const updateBatchStatus = async (batch, transaction = null) => {
  if (!batch) return batch;
  let newStatus = batch.status;
  const days = calculateDaysToExpiry(batch.expiry_date);
  if (batch.available_qty === 0) {
    newStatus = 'Disposed';
  } else if (days !== null && days < 0) {
    newStatus = 'Expired';
  } else {
    newStatus = 'Active';
  }
  if (newStatus !== batch.status) {
    await batch.update({ status: newStatus }, { transaction });
  }
  return batch;
};

const mapBatchResponse = (batch, options = {}) => {
  const daysToExpiry = calculateDaysToExpiry(batch.expiry_date);
  const expiryStatus = categorizeExpiryStatus(daysToExpiry);
  const usagePct = batch.quantity ? Math.round(((batch.quantity - batch.available_qty) / batch.quantity) * 100) : 0;

  return {
    batch_id: batch.batch_id,
    batch_number: batch.batch_number,
    lot_number: batch.lot_number,
    manufacturing_date: batch.manufacturing_date,
    expiry_date: batch.expiry_date,
    quantity: batch.quantity,
    available_qty: batch.available_qty,
    usage_percentage: usagePct,
    status: batch.status,
    days_to_expiry: daysToExpiry,
    expiry_status: expiryStatus,
    item: batch.item
      ? {
          item_id: batch.item.item_id,
          sku: batch.item.sku,
          item_name: batch.item.item_name,
          category_name: batch.item.category ? batch.item.category.category_name : null,
          unit_price: batch.item.unit_price
        }
      : null,
    grn_reference: batch.grnItem && batch.grnItem.grn
      ? {
          grn_id: batch.grnItem.grn.grn_id,
          grn_number: batch.grnItem.grn.grn_number
        }
      : null,
    warehouse: batch.grnItem && batch.grnItem.grn && batch.grnItem.grn.warehouse
      ? {
          warehouse_id: batch.grnItem.grn.warehouse.warehouse_id,
          warehouse_name: batch.grnItem.grn.warehouse.warehouse_name
        }
      : options.warehouse || null,
    created_at: batch.createdAt
  };
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

const getAllBatches = async (req, res) => {
  try {
    const {
      item_id,
      warehouse_id,
      status,
      expiry_status,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    if (item_id) where.item_id = parseInt(item_id, 10);
    if (status) where.status = status;

    const include = [
      {
        model: Item,
        as: 'item',
        attributes: ['item_id', 'sku', 'item_name', 'unit_price'],
        include: [{ model: Category, as: 'category', attributes: ['category_name'], required: false }]
      },
      {
        model: GRNItem,
        as: 'grnItem',
        include: [
          {
            model: GRN,
            as: 'grn',
            include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }],
            where: warehouse_id ? { warehouse_id: parseInt(warehouse_id, 10) } : undefined,
            required: true
          }
        ]
      }
    ];

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { rows, count } = await Batch.findAndCountAll({
      where,
      include,
      order: [
        [literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['expiry_date', 'ASC'],
        ['batch_id', 'ASC']
      ],
      limit: parseInt(limit, 10),
      offset
    });

    const batches = rows
      .map(b => mapBatchResponse(b))
      .filter(b => {
        if (!expiry_status) return true;
        return b.expiry_status === expiry_status;
      });

    const summary = {
      total_batches: batches.length,
      active_batches: batches.filter(b => b.status === 'Active').length,
      expiring_soon_30days: batches.filter(b => b.expiry_status === 'expiring_30').length,
      expiring_soon_7days: batches.filter(b => b.expiry_status === 'expiring_7').length,
      expired_batches: batches.filter(b => b.expiry_status === 'expired').length
    };

    return ok(res, {
      summary,
      batches,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)) || 1
      }
    }, 'Batches retrieved successfully');
  } catch (error) {
    console.error('getAllBatches error:', error);
    return fail(res, 'Failed to fetch batches', 500);
  }
};

const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id, 10))) {
      return fail(res, 'Invalid batch ID', 400);
    }

    const batch = await Batch.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          required: false,
          include: [{ model: Category, as: 'category', attributes: ['category_name'], required: false }]
        },
        {
          model: GRNItem,
          as: 'grnItem',
          required: false,
          include: [
            {
              model: GRN,
              as: 'grn',
              required: false,
              include: [
                { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'], required: false },
                { model: User, as: 'receiver', attributes: ['full_name'], required: false }
              ]
            }
          ]
        }
      ]
    });

    if (!batch) {
      return fail(res, 'Batch not found', 404);
    }

    const daysToExpiry = calculateDaysToExpiry(batch.expiry_date);
    const expiryStatus = categorizeExpiryStatus(daysToExpiry);
    const usagePct = batch.quantity ? Math.round(((batch.quantity - batch.available_qty) / batch.quantity) * 100) : 0;

    const latestLedger = await StockLedger.findOne({
      where: { batch_id: batch.batch_id },
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'], required: false },
        { model: Location, as: 'location', attributes: ['location_id', 'location_code'], required: false }
      ],
      order: [['ledger_id', 'DESC']]
    });

    const movements = await StockLedger.findAll({
      where: { batch_id: batch.batch_id },
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'], required: false },
        { model: Location, as: 'location', attributes: ['location_id', 'location_code'], required: false },
        { model: User, as: 'creator', attributes: ['full_name'], required: false }
      ],
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
    });

    const usageTimeline = movements
      .slice()
      .reverse()
      .map(m => ({
        date: m.transaction_date,
        available_qty: m.balance_qty
      }));

    const response = {
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      lot_number: batch.lot_number,
      manufacturing_date: batch.manufacturing_date,
      expiry_date: batch.expiry_date,
      shelf_life_days: batch.manufacturing_date && batch.expiry_date
        ? Math.round((new Date(batch.expiry_date) - new Date(batch.manufacturing_date)) / (1000 * 60 * 60 * 24))
        : null,
      days_to_expiry: daysToExpiry,
      expiry_status: expiryStatus,
      quantity: batch.quantity,
      available_qty: batch.available_qty,
      issued_qty: batch.quantity - batch.available_qty,
      usage_percentage: usagePct,
      status: batch.status,
      item: batch.item ? {
        item_id: batch.item.item_id,
        sku: batch.item.sku,
        item_name: batch.item.item_name,
        unit_of_measure: batch.item.unit_of_measure,
        category_name: batch.item.category ? batch.item.category.category_name : null
      } : null,
      grn: batch.grnItem && batch.grnItem.grn ? {
        grn_id: batch.grnItem.grn.grn_id,
        grn_number: batch.grnItem.grn.grn_number,
        grn_date: batch.grnItem.grn.grn_date,
        received_by: batch.grnItem.grn.receiver ? batch.grnItem.grn.receiver.full_name : null
      } : null,
      current_location: latestLedger ? {
        warehouse_id: latestLedger.warehouse_id,
        warehouse_name: latestLedger.warehouse ? latestLedger.warehouse.warehouse_name : null,
        location_id: latestLedger.location_id,
        location_code: latestLedger.location ? latestLedger.location.location_code : null
      } : (batch.grnItem && batch.grnItem.grn && batch.grnItem.grn.warehouse ? {
        warehouse_id: batch.grnItem.grn.warehouse.warehouse_id,
        warehouse_name: batch.grnItem.grn.warehouse.warehouse_name,
        location_id: null,
        location_code: null
      } : null),
      movements: movements.map(m => ({
        ledger_id: m.ledger_id,
        transaction_type: m.transaction_type,
        quantity: m.quantity,
        balance_qty: m.balance_qty,
        transaction_date: m.transaction_date,
        reference_type: m.reference_type,
        created_by: m.creator ? m.creator.full_name : null,
        warehouse_name: m.warehouse ? m.warehouse.warehouse_name : null
      })),
      usage_timeline: usageTimeline
    };

    return ok(res, response, 'Batch details retrieved successfully');
  } catch (error) {
    console.error('getBatchById error:', error);
    console.error('Error stack:', error.stack);
    return fail(res, `Failed to fetch batch details: ${error.message}`, 500);
  }
};

const getBatchesByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { warehouse_id, available_only } = req.query;

    if (!itemId || isNaN(parseInt(itemId, 10))) {
      return fail(res, 'Invalid item ID', 400);
    }

    const item = await Item.findByPk(itemId);
    if (!item) {
      // Provide helpful error message with suggestion
      const itemCount = await Item.count({ where: { is_active: true } });
      return fail(res, `Item with ID ${itemId} not found. There are ${itemCount} active items in the system. Use GET /api/inventory/items to see available items.`, 404);
    }

    const whereClause = {
      item_id: parseInt(itemId, 10)
    };

    if (available_only === 'true') {
      whereClause.available_qty = { [Op.gt]: 0 };
    }

    const includeOptions = [
      {
        model: GRNItem,
        as: 'grnItem',
        required: false,
        include: [
          {
            model: GRN,
            as: 'grn',
            required: false,
            include: [
              {
                model: Warehouse,
                as: 'warehouse',
                attributes: ['warehouse_id', 'warehouse_name'],
                required: false
              }
            ]
          }
        ]
      }
    ];

    // If warehouse_id filter is provided, add it to the GRN where clause
    if (warehouse_id) {
      includeOptions[0].include[0].where = { warehouse_id: parseInt(warehouse_id, 10) };
      includeOptions[0].include[0].required = true;
    }

    const batches = await Batch.findAll({
      where: whereClause,
      include: includeOptions,
      order: [
        [literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['expiry_date', 'ASC'],
        ['batch_id', 'ASC']
      ]
    });

    // Filter by warehouse_id in memory if needed (for batches without GRN)
    let filteredBatches = batches;
    if (warehouse_id) {
      filteredBatches = batches.filter(b => {
        const whId = b.grnItem?.grn?.warehouse_id;
        return whId === parseInt(warehouse_id, 10);
      });
    }

    const mapped = filteredBatches.map(b => {
      const days = calculateDaysToExpiry(b.expiry_date);
      return {
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        days_to_expiry: days,
        available_qty: b.available_qty,
        warehouse_name: b.grnItem && b.grnItem.grn && b.grnItem.grn.warehouse ? b.grnItem.grn.warehouse.warehouse_name : null,
        expiry_status: categorizeExpiryStatus(days)
      };
    });

    const total_quantity = filteredBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const total_available = filteredBatches.reduce((sum, b) => sum + (b.available_qty || 0), 0);
    const fefo = mapped.find(b => b.available_qty > 0);

    return ok(res, {
      item: {
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.item_name
      },
      total_batches: mapped.length,
      total_quantity,
      total_available,
      batches: mapped,
      fefo_recommendation: fefo ? {
        message: `For next issuance, pick from ${fefo.batch_number} (expiring in ${fefo.days_to_expiry} days)`,
        batch_id: fefo.batch_id,
        available_qty: fefo.available_qty
      } : null
    }, 'Batches for item retrieved successfully');
  } catch (error) {
    console.error('getBatchesByItem error:', error);
    console.error('Error stack:', error.stack);
    return fail(res, `Failed to fetch batches for item: ${error.message}`, 500);
  }
};

const checkExpiryAlerts = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const manager = await findManagerOrAdmin();
    
    const batches = await Batch.findAll({
      where: { status: { [Op.ne]: 'Disposed' } },
      include: [
        { 
          model: Item, 
          as: 'item', 
          required: false,
          attributes: ['item_id', 'item_name', 'sku']
        },
        {
          model: GRNItem,
          as: 'grnItem',
          required: false,
          include: [
            { 
              model: GRN, 
              as: 'grn', 
              required: false,
              include: [{ 
                model: Warehouse, 
                as: 'warehouse',
                required: false,
                attributes: ['warehouse_id', 'warehouse_name']
              }] 
            }
          ]
        }
      ],
      transaction
    });

    let alertsCreated = 0;
    const summary = { expiring_30days: 0, expiring_7days: 0, expired: 0 };
    const requiringAction = [];

    for (const batch of batches) {
      try {
        const days = calculateDaysToExpiry(batch.expiry_date);
        if (days === null) continue;

        let alert_type = null;
        let severity = null;
        if (days < 0) {
          alert_type = 'Expired';
          severity = 'Critical';
          summary.expired += 1;
        } else if (days <= 7) {
          alert_type = 'Expiry Warning - 7 Days';
          severity = 'High';
          summary.expiring_7days += 1;
        } else if (days <= 30) {
          alert_type = 'Expiry Warning - 30 Days';
          severity = 'Medium';
          summary.expiring_30days += 1;
        } else {
          continue;
        }

        const warehouseId = batch.grnItem?.grn?.warehouse_id || null;
        const itemName = batch.item?.item_name || 'Unknown Item';
        
        // Check for existing alert
        const existingAlert = await Alert.findOne({
          where: {
            batch_id: batch.batch_id,
            alert_type,
            is_read: false
          },
          transaction
        });

        if (!existingAlert) {
          const alertMessage = alert_type === 'Expired'
            ? `CRITICAL: Batch ${batch.batch_number} of ${itemName} has EXPIRED`
            : days <= 7
              ? `URGENT: Batch ${batch.batch_number} of ${itemName} expiring in ${days} days`
              : `Batch ${batch.batch_number} of ${itemName} expiring in ${days} days`;

          await Alert.create({
            alert_type,
            severity,
            batch_id: batch.batch_id,
            item_id: batch.item_id,
            warehouse_id: warehouseId,
            message: alertMessage,
            assigned_to: manager ? manager.user_id : null
          }, { transaction });
          alertsCreated += 1;
        }

        // Update batch status if expired
        if (alert_type === 'Expired' && batch.status !== 'Disposed' && batch.status !== 'Expired') {
          await batch.update({ status: 'Expired' }, { transaction });
        }

        requiringAction.push({
          batch_id: batch.batch_id,
          batch_number: batch.batch_number,
          item_name: itemName,
          expiry_date: batch.expiry_date,
          days_to_expiry: days,
          available_qty: batch.available_qty,
          alert_type,
          severity,
          warehouse_name: batch.grnItem?.grn?.warehouse?.warehouse_name || null,
          recommended_action: alert_type === 'Expired'
            ? 'Immediate disposal required'
            : 'Prioritize issuance or consider discount sale'
        });
      } catch (batchError) {
        console.error(`Error processing batch ${batch.batch_id}:`, batchError);
        // Continue with next batch instead of failing entire operation
        continue;
      }
    }

    await transaction.commit();

    return ok(res, {
      alerts_created: alertsCreated,
      summary,
      batches_requiring_action: requiringAction
    }, 'Expiry check completed');
  } catch (error) {
    await transaction.rollback();
    console.error('checkExpiryAlerts error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      ...(error.errors && { errors: error.errors })
    });
    return fail(res, `Failed to run expiry check: ${error.message}`, 500);
  }
};

const getExpiryAlerts = async (req, res) => {
  try {
    const { severity, alert_type, warehouse_id, is_read } = req.query;
    
    const where = {
      alert_type: alert_type 
        ? alert_type 
        : { [Op.in]: ['Expiry Warning - 30 Days', 'Expiry Warning - 7 Days', 'Expired'] }
    };
    
    if (severity) where.severity = severity;
    if (warehouse_id) where.warehouse_id = parseInt(warehouse_id, 10);
    if (is_read !== undefined) {
      where.is_read = is_read === 'true' || is_read === true;
    }

    const alerts = await Alert.findAll({
      where,
      include: [
        { 
          model: Batch, 
          as: 'batch',
          required: false,
          attributes: ['batch_id', 'batch_number', 'expiry_date', 'available_qty']
        },
        { 
          model: Item, 
          as: 'item',
          required: false,
          attributes: ['item_id', 'sku', 'item_name', 'unit_price']
        },
        { 
          model: Warehouse, 
          as: 'warehouse',
          required: false,
          attributes: ['warehouse_id', 'warehouse_name']
        }
      ],
      order: [
        [literal(`CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`), 'ASC'],
        ['created_at', 'DESC']
      ]
    });

    // FIXED: Count queries - use base where without alert_type filter for summary
    const baseWhere = { ...where };
    // Remove alert_type from baseWhere for summary counts (count all expiry alert types)
    delete baseWhere.alert_type;
    baseWhere.alert_type = { [Op.in]: ['Expiry Warning - 30 Days', 'Expiry Warning - 7 Days', 'Expired'] };
    
    const unread_count = await Alert.count({ 
      where: { ...where, is_read: false } 
    });
    const critical_count = await Alert.count({ 
      where: { ...where, severity: 'Critical' } 
    });

    // FIXED: Summary counts should include all expiry alerts regardless of query filter
    const summary = {
      expired_items: await Alert.count({ 
        where: { 
          alert_type: 'Expired',
          ...(severity ? { severity } : {}),
          ...(warehouse_id ? { warehouse_id: parseInt(warehouse_id, 10) } : {}),
          ...(is_read !== undefined ? { is_read: is_read === 'true' || is_read === true } : {})
        } 
      }),
      expiring_7days: await Alert.count({ 
        where: { 
          alert_type: 'Expiry Warning - 7 Days',
          ...(severity ? { severity } : {}),
          ...(warehouse_id ? { warehouse_id: parseInt(warehouse_id, 10) } : {}),
          ...(is_read !== undefined ? { is_read: is_read === 'true' || is_read === true } : {})
        } 
      }),
      expiring_30days: await Alert.count({ 
        where: { 
          alert_type: 'Expiry Warning - 30 Days',
          ...(severity ? { severity } : {}),
          ...(warehouse_id ? { warehouse_id: parseInt(warehouse_id, 10) } : {}),
          ...(is_read !== undefined ? { is_read: is_read === 'true' || is_read === true } : {})
        } 
      })
    };

    const alertPayload = alerts.map(a => {
      const days_to_expiry = a.batch ? calculateDaysToExpiry(a.batch.expiry_date) : null;
      const recommended_action = a.alert_type === 'Expired'
        ? 'Immediate disposal required'
        : (days_to_expiry !== null && days_to_expiry <= 7
          ? 'Prioritize issuance or consider discount sale'
          : 'Monitor and plan issuance');

      const estimated_loss_value = a.batch && a.item
        ? Number(a.batch.available_qty || 0) * Number(a.item.unit_price || 0)
        : null;

      return {
        alert_id: a.alert_id,
        alert_type: a.alert_type,
        severity: a.severity,
        is_read: a.is_read,
        message: a.message,
        batch: a.batch ? {
          batch_id: a.batch.batch_id,
          batch_number: a.batch.batch_number,
          expiry_date: a.batch.expiry_date,
          days_to_expiry,
          available_qty: a.batch.available_qty
        } : null,
        item: a.item ? {
          item_id: a.item.item_id,
          sku: a.item.sku,
          item_name: a.item.item_name,
          unit_price: a.item.unit_price
        } : null,
        warehouse: a.warehouse ? {
          warehouse_id: a.warehouse.warehouse_id,
          warehouse_name: a.warehouse.warehouse_name
        } : null,
        estimated_loss_value,
        recommended_action,
        created_at: a.createdAt,
        days_since_alert: Math.ceil((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    return ok(res, {
      unread_count,
      critical_count,
      summary,
      alerts: alertPayload
    }, 'Expiry alerts retrieved successfully');
  } catch (error) {
    console.error('getExpiryAlerts error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      ...(error.errors && { errors: error.errors })
    });
    return fail(res, `Failed to fetch expiry alerts: ${error.message}`, 500);
  }
};

const disposeExpiredBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { disposal_qty, disposal_reason, disposal_method, disposal_date, disposal_cost = 0, remarks } = req.body;
    const userId = req.user.user_id;

    const batch = await Batch.findByPk(id, {
      include: [
        { model: Item, as: 'item' },
        {
          model: GRNItem,
          as: 'grnItem',
          include: [{ model: GRN, as: 'grn', include: [{ model: Warehouse, as: 'warehouse' }] }]
        }
      ],
      transaction
    });

    if (!batch) {
      await transaction.rollback();
      return fail(res, 'Batch not found', 404);
    }

    if (!disposal_qty || disposal_qty <= 0) {
      await transaction.rollback();
      return fail(res, 'disposal_qty must be greater than 0', 400);
    }

    if (disposal_qty > batch.available_qty) {
      await transaction.rollback();
      return fail(res, 'disposal_qty cannot exceed available_qty', 400);
    }

    if (!disposal_reason || disposal_reason.length < 5) {
      await transaction.rollback();
      return fail(res, 'disposal_reason is required (min 5 characters)', 400);
    }

    const latestLedger = await StockLedger.findOne({
      where: { batch_id: batch.batch_id },
      order: [['ledger_id', 'DESC']],
      transaction
    });

    const warehouse_id = latestLedger ? latestLedger.warehouse_id : batch.grnItem?.grn?.warehouse_id;
    const location_id = latestLedger ? latestLedger.location_id : null;
    const newBalance = Math.max(0, (latestLedger ? latestLedger.balance_qty : batch.available_qty) - disposal_qty);

    await StockLedger.create({
      item_id: batch.item_id,
      warehouse_id,
      location_id,
      batch_id: batch.batch_id,
      transaction_type: 'Adjustment',
      quantity: -disposal_qty,
      balance_qty: newBalance,
      transaction_date: disposal_date || new Date().toISOString().split('T')[0],
      reference_type: `Batch Disposal - ${disposal_reason}`,
      created_by: userId
    }, { transaction });

    await batch.update({
      available_qty: batch.available_qty - disposal_qty,
      status: batch.available_qty - disposal_qty === 0 ? 'Disposed' : batch.status
    }, { transaction });

    const disposal = await BatchDisposal.create({
      batch_id: batch.batch_id,
      disposal_qty,
      disposal_reason,
      disposal_method: disposal_method || null,
      disposal_date,
      disposal_cost: disposal_cost || 0,
      remarks: remarks || null,
      disposed_by: userId
    }, { transaction });

    await Alert.update({ is_read: true }, {
      where: { batch_id: batch.batch_id, alert_type: { [Op.in]: ['Expired', 'Expiry Warning - 7 Days', 'Expiry Warning - 30 Days'] } },
      transaction
    });

    const impact = await calculateFinancialImpact(batch.item_id, disposal_qty);
    const total_loss = impact.value + Number(disposal_cost || 0);

    await transaction.commit();

    return ok(res, {
      disposal_id: disposal.disposal_id,
      batch: {
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        item_name: batch.item?.item_name
      },
      disposal_qty,
      disposal_reason,
      disposal_method: disposal_method || null,
      disposal_date,
      disposal_cost: Number(disposal_cost || 0),
      financial_impact: {
        item_value_lost: impact.value,
        disposal_cost: Number(disposal_cost || 0),
        total_loss
      },
      batch_status: batch.available_qty === 0 ? 'Disposed' : batch.status,
      disposed_by: {
        user_id: req.user.user_id,
        full_name: req.user.username
      },
      timestamp: disposal.createdAt
    }, 'Batch disposed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('disposeExpiredBatch error:', error);
    return fail(res, error.message || 'Failed to dispose batch', 500);
  }
};

const getExpirySummaryReport = async (req, res) => {
  try {
    const { warehouse_id, category_id, start_date, end_date } = req.query;

    const batches = await Batch.findAll({
      where: {
        ...(start_date || end_date
          ? { expiry_date: {
              ...(start_date ? { [Op.gte]: start_date } : {}),
              ...(end_date ? { [Op.lte]: end_date } : {})
            } }
          : {})
      },
      include: [
        {
          model: Item,
          as: 'item',
          include: [{ model: Category, as: 'category', attributes: ['category_id', 'category_name'], required: false }],
          where: category_id ? { category_id: parseInt(category_id, 10) } : undefined
        },
        {
          model: GRNItem,
          as: 'grnItem',
          include: [
            {
              model: GRN,
              as: 'grn',
              include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }],
              where: warehouse_id ? { warehouse_id: parseInt(warehouse_id, 10) } : undefined,
              required: true
            }
          ]
        }
      ]
    });

    const summary = {
      total_batches: batches.length,
      active_batches: batches.filter(b => b.status === 'Active').length,
      valid_batches: 0,
      expiring_30days: 0,
      expiring_7days: 0,
      expired_batches: 0,
      disposed_batches: batches.filter(b => b.status === 'Disposed').length
    };

    const byWarehouseMap = {};
    const byCategoryMap = {};
    const highValue = [];

    for (const b of batches) {
      const days = calculateDaysToExpiry(b.expiry_date);
      const expStatus = categorizeExpiryStatus(days);
      if (expStatus === 'valid') summary.valid_batches += 1;
      if (expStatus === 'expiring_30') summary.expiring_30days += 1;
      if (expStatus === 'expiring_7') summary.expiring_7days += 1;
      if (expStatus === 'expired') summary.expired_batches += 1;

      const warehouse = b.grnItem?.grn?.warehouse;
      if (warehouse) {
        if (!byWarehouseMap[warehouse.warehouse_id]) {
          byWarehouseMap[warehouse.warehouse_id] = {
            warehouse_id: warehouse.warehouse_id,
            warehouse_name: warehouse.warehouse_name,
            total_batches: 0,
            expiring_soon: 0,
            expired: 0
          };
        }
        byWarehouseMap[warehouse.warehouse_id].total_batches += 1;
        if (expStatus === 'expired') byWarehouseMap[warehouse.warehouse_id].expired += 1;
        if (expStatus === 'expiring_7' || expStatus === 'expiring_30') byWarehouseMap[warehouse.warehouse_id].expiring_soon += 1;
      }

      const category = b.item?.category;
      if (category) {
        if (!byCategoryMap[category.category_name]) {
          byCategoryMap[category.category_name] = {
            category_name: category.category_name,
            total_batches: 0,
            expiring_soon: 0,
            expired: 0,
            shelf_life_days: []
          };
        }
        byCategoryMap[category.category_name].total_batches += 1;
        if (expStatus === 'expired') byCategoryMap[category.category_name].expired += 1;
        if (expStatus === 'expiring_7' || expStatus === 'expiring_30') byCategoryMap[category.category_name].expiring_soon += 1;
        if (b.manufacturing_date && b.expiry_date) {
          const shelf = Math.round((new Date(b.expiry_date) - new Date(b.manufacturing_date)) / (1000 * 60 * 60 * 24));
          byCategoryMap[category.category_name].shelf_life_days.push(shelf);
        }
      }

      if (days !== null && days <= 30 && b.available_qty > 0 && b.item) {
        const potential_loss = Number(b.available_qty) * Number(b.item.unit_price || 0);
        highValue.push({
          item_name: b.item.item_name,
          batch_number: b.batch_number,
          expiry_date: b.expiry_date,
          days_to_expiry: days,
          available_qty: b.available_qty,
          unit_price: b.item.unit_price,
          potential_loss
        });
      }
    }

    const byWarehouse = Object.values(byWarehouseMap);
    const byCategory = Object.values(byCategoryMap).map(c => ({
      ...c,
      avg_shelf_life_days: c.shelf_life_days.length
        ? Math.round(c.shelf_life_days.reduce((a, b) => a + b, 0) / c.shelf_life_days.length)
        : null
    }));

    highValue.sort((a, b) => b.potential_loss - a.potential_loss);

    const disposalHistory = await BatchDisposal.findAll({
      where: {
        disposal_date: {
          [Op.gte]: fn('DATE_SUB', fn('CURDATE'), literal('INTERVAL 30 DAY'))
        }
      },
      include: [
        {
          model: Batch,
          as: 'batch',
          include: [{ model: Item, as: 'item' }]
        }
      ]
    });

    const disposalSummary = {
      total_disposals: disposalHistory.length,
      total_qty_disposed: disposalHistory.reduce((sum, d) => sum + Number(d.disposal_qty || 0), 0),
      total_value_lost: 0,
      total_disposal_cost: disposalHistory.reduce((sum, d) => sum + Number(d.disposal_cost || 0), 0),
      items: disposalHistory.map(d => ({
        item_name: d.batch?.item?.item_name,
        qty_disposed: d.disposal_qty,
        value_lost: d.batch?.item ? Number(d.disposal_qty || 0) * Number(d.batch.item.unit_price || 0) : 0,
        disposal_date: d.disposal_date
      }))
    };
    disposalSummary.total_value_lost = disposalSummary.items.reduce((sum, i) => sum + (i.value_lost || 0), 0);

    const potential_loss_expiring_7days = batches.reduce((sum, b) => {
      const days = calculateDaysToExpiry(b.expiry_date);
      if (days !== null && days <= 7 && b.item) {
        return sum + Number(b.available_qty || 0) * Number(b.item.unit_price || 0);
      }
      return sum;
    }, 0);

    const potential_loss_expiring_30days = batches.reduce((sum, b) => {
      const days = calculateDaysToExpiry(b.expiry_date);
      if (days !== null && days <= 30 && b.item) {
        return sum + Number(b.available_qty || 0) * Number(b.item.unit_price || 0);
      }
      return sum;
    }, 0);

    return ok(res, {
      report_date: new Date().toISOString().split('T')[0],
      summary,
      by_warehouse: byWarehouse,
      by_category: byCategory,
      high_value_items_expiring: highValue,
      disposal_history_30days: disposalSummary,
      financial_impact: {
        potential_loss_expiring_7days,
        potential_loss_expiring_30days,
        actual_loss_last_30days: disposalSummary.total_value_lost + disposalSummary.total_disposal_cost
      }
    }, 'Expiry summary report generated');
  } catch (error) {
    console.error('getExpirySummaryReport error:', error);
    return fail(res, 'Failed to generate expiry summary report', 500);
  }
};

const getBatchUsageAnalysis = async (req, res) => {
  try {
    const { warehouse_id, min_age_days = 0 } = req.query;

    const batches = await Batch.findAll({
      include: [
        { model: Item, as: 'item' },
        {
          model: GRNItem,
          as: 'grnItem',
          include: [
            { model: GRN, as: 'grn', include: [{ model: Warehouse, as: 'warehouse' }] }
          ],
          where: warehouse_id ? {
            '$grnItem.grn.warehouse_id$': parseInt(warehouse_id, 10)
          } : undefined,
          required: false
        }
      ]
    });

    const slow_moving_batches = [];
    const fast_moving_batches = [];

    for (const b of batches) {
      const receiptDate = b.grnItem?.grn?.grn_date || b.manufacturing_date;
      const age_days = receiptDate
        ? Math.max(1, Math.floor((new Date() - new Date(receiptDate)) / (1000 * 60 * 60 * 24)))
        : 1;
      if (age_days < min_age_days) continue;

      const issued = (b.quantity || 0) - (b.available_qty || 0);
      const usage_rate = issued / age_days;
      const projected_days_to_full_utilization = usage_rate > 0 ? (b.available_qty || 0) / usage_rate : null;
      const days_to_expiry = calculateDaysToExpiry(b.expiry_date);
      const risk_level = projected_days_to_full_utilization !== null && days_to_expiry !== null
        ? (projected_days_to_full_utilization > days_to_expiry ? 'High' : 'Low')
        : 'Low';

      const entry = {
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        item_name: b.item?.item_name,
        age_days,
        quantity: b.quantity,
        available_qty: b.available_qty,
        usage_rate: Number(usage_rate.toFixed(2)),
        days_to_expiry,
        projected_days_to_full_utilization: projected_days_to_full_utilization !== null
          ? Number(projected_days_to_full_utilization.toFixed(0))
          : null,
        risk_level,
        recommendation: risk_level === 'High'
          ? 'Likely to expire before full utilization. Consider promotional sale or redistribution.'
          : 'Healthy usage rate'
      };

      if (risk_level === 'High') slow_moving_batches.push(entry);
      if (usage_rate > 1) fast_moving_batches.push(entry);
    }

    return ok(res, {
      slow_moving_batches,
      fast_moving_batches
    }, 'Batch usage analysis completed');
  } catch (error) {
    console.error('getBatchUsageAnalysis error:', error);
    return fail(res, 'Failed to analyze batch usage', 500);
  }
};

module.exports = {
  getAllBatches,
  getBatchById,
  getBatchesByItem,
  checkExpiryAlerts,
  getExpiryAlerts,
  disposeExpiredBatch,
  getExpirySummaryReport,
  getBatchUsageAnalysis,
  // Helpers for scheduled jobs/tests
  calculateDaysToExpiry,
  categorizeExpiryStatus,
  getExpiryAlertSeverity,
  calculateFinancialImpact,
  updateBatchStatus
};

