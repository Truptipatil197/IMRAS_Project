const { Op, fn, col, literal } = require('sequelize');
const { sequelize, GRN, GRNItem, PurchaseOrder, POItem, Warehouse, Item, StockLedger, Batch, Supplier, User } = require('../models');
const { getCurrentStock } = require('../utils/stockUtils');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate current stock balance for item in warehouse
 */
const calculateStockBalance = async (item_id, warehouse_id, transaction = null) => {
  return getCurrentStock({ item_id, warehouse_id }, transaction);
};

/**
 * Update PO status based on received quantities
 */
const updatePOStatus = async (po_id, transaction) => {
  const po = await PurchaseOrder.findByPk(po_id, {
    include: [{
      model: POItem,
      as: 'poItems'
    }],
    transaction
  });

  if (!po) return;

  let allReceived = true;
  let anyReceived = false;

  for (const poItem of po.poItems) {
    // Calculate total received quantity for this item from all GRNs
    const totalReceived = await GRNItem.sum('accepted_qty', {
      include: [{
        model: GRN,
        as: 'grn',
        where: { po_id },
        attributes: []
      }],
      where: { item_id: poItem.item_id },
      transaction
    }) || 0;

    if (totalReceived < poItem.ordered_qty) {
      allReceived = false;
    }
    if (totalReceived > 0) {
      anyReceived = true;
    }
  }

  const updateData = {};
  if (allReceived) {
    updateData.status = 'Completed';
    updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
  } else if (anyReceived) {
    updateData.status = 'In-Transit';
  }

  if (Object.keys(updateData).length > 0) {
    await po.update(updateData, { transaction });
  }
};

/**
 * Validate GRN items against PO
 */
const validateGRNItems = async (po_id, items, transaction) => {
  const po = await PurchaseOrder.findByPk(po_id, {
    include: [{
      model: POItem,
      as: 'poItems'
    }],
    transaction
  });

  if (!po) {
    return { valid: false, error: 'Purchase Order not found' };
  }

  if (po.status !== 'Issued' && po.status !== 'In-Transit') {
    return { valid: false, error: `Cannot create GRN for PO with status: ${po.status}` };
  }

  const poItemMap = {};
  po.poItems.forEach(item => {
    poItemMap[item.item_id] = item;
  });

  // Calculate already received quantities
  const receivedMap = {};
  for (const poItem of po.poItems) {
    const totalReceived = await GRNItem.sum('accepted_qty', {
      include: [{
        model: GRN,
        as: 'grn',
        where: { po_id },
        attributes: []
      }],
      where: { item_id: poItem.item_id },
      transaction
    }) || 0;
    receivedMap[poItem.item_id] = totalReceived;
  }

  for (const item of items) {
    // Check if item belongs to PO
    if (!poItemMap[item.item_id]) {
      return { valid: false, error: `Item ID ${item.item_id} does not belong to this Purchase Order` };
    }

    const poItem = poItemMap[item.item_id];
    const alreadyReceived = receivedMap[item.item_id] || 0;
    const pendingQty = poItem.ordered_qty - alreadyReceived;

    // Check received quantity doesn't exceed pending
    if (item.received_qty > pendingQty) {
      return {
        valid: false,
        error: `Item ${item.item_id}: Received quantity (${item.received_qty}) exceeds pending quantity (${pendingQty})`
      };
    }

    // Validate received_qty = accepted_qty + rejected_qty
    if (item.received_qty !== item.accepted_qty + item.rejected_qty) {
      return {
        valid: false,
        error: `Item ${item.item_id}: received_qty must equal accepted_qty + rejected_qty`
      };
    }

    // If rejected, require rejection reason
    if (item.rejected_qty > 0 && !item.rejection_reason) {
      return {
        valid: false,
        error: `Item ${item.item_id}: rejection_reason is required when rejected_qty > 0`
      };
    }

    // Validate expiry date if provided
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        return {
          valid: false,
          error: `Item ${item.item_id}: expiry_date must be a future date`
        };
      }
    }
  }

  return { valid: true };
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * GET PENDING PURCHASE ORDERS
 * GET /api/grn/pending-pos
 */
const getPendingPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.findAll({
      where: {
        status: {
          [Op.in]: ['Issued', 'In-Transit']
        }
      },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['supplier_id', 'supplier_name']
        },
        {
          model: POItem,
          as: 'poItems',
          include: [{
            model: Item,
            as: 'item',
            attributes: ['item_id', 'item_name', 'sku']
          }]
        }
      ],
      order: [['po_date', 'DESC']]
    });

    const pendingPOsResult = [];

    for (const po of pos) {
      const poItems = po.poItems || [];
      const filteredItems = [];

      for (const poItem of poItems) {
        // Get received sum directly
        const stats = await GRNItem.findAll({
          attributes: [[sequelize.fn('SUM', sequelize.col('accepted_qty')), 'total']],
          include: [{
            model: GRN,
            as: 'grn',
            where: { po_id: po.po_id },
            attributes: []
          }],
          where: { item_id: poItem.item_id },
          raw: true
        });

        const receivedQty = parseFloat(stats[0]?.total || 0);
        const pendingQty = poItem.ordered_qty - receivedQty;

        if (pendingQty > 0) {
          filteredItems.push({
            po_item_id: poItem.po_item_id,
            item_id: poItem.item_id,
            item_name: poItem.item?.item_name || 'Unknown',
            sku: poItem.item?.sku || 'N/A',
            ordered_qty: poItem.ordered_qty,
            received_qty: receivedQty,
            pending_qty: pendingQty,
            unit_price: parseFloat(poItem.unit_price || 0)
          });
        }
      }

      if (filteredItems.length > 0) {
        pendingPOsResult.push({
          po_id: po.po_id,
          po_number: po.po_number,
          po_date: po.po_date,
          expected_delivery_date: po.expected_delivery_date,
          supplier: {
            supplier_id: po.supplier?.supplier_id,
            supplier_name: po.supplier?.supplier_name || 'N/A'
          },
          items: filteredItems
        });
      }
    }

    return ok(res, pendingPOsResult, 'Pending POs retrieved successfully');
  } catch (error) {
    console.error('Get pending POs error:', error);
    return res.status(500).json({ success: false, message: error.message, data: [] });
  }
};

/**
 * CREATE GRN
 * POST /api/grn
 */
const createGRN = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { po_id, warehouse_id, grn_date, remarks, items } = req.body;
    const userId = req.user.user_id;

    // Validate warehouse exists and is active
    const warehouse = await Warehouse.findByPk(warehouse_id, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return fail(res, 'Warehouse not found', 404);
    }
    if (!warehouse.is_active) {
      await transaction.rollback();
      return fail(res, 'Warehouse is not active', 400);
    }

    // Validate GRN items
    const validation = await validateGRNItems(po_id, items, transaction);
    if (!validation.valid) {
      await transaction.rollback();
      return fail(res, validation.error, 400);
    }

    // Create GRN (Number handled by model hook)
    const grn = await GRN.create({
      grn_date: grn_date || new Date().toISOString().split('T')[0],
      po_id,
      warehouse_id,
      received_by: userId,
      status: 'Draft',
      remarks
    }, { transaction });

    const grnItems = [];

    // Process each item
    for (const itemData of items) {
      // Create GRN Item
      const grnItem = await GRNItem.create({
        grn_id: grn.grn_id,
        item_id: itemData.item_id,
        received_qty: itemData.received_qty,
        accepted_qty: itemData.accepted_qty,
        rejected_qty: itemData.rejected_qty,
        rejection_reason: itemData.rejection_reason || null
      }, { transaction });

      grnItems.push(grnItem);

      let batchId = null;

      // Create batch if batch details provided
      if (itemData.batch_number && itemData.accepted_qty > 0) {
        const batch = await Batch.create({
          item_id: itemData.item_id,
          batch_number: itemData.batch_number,
          lot_number: itemData.lot_number || null,
          manufacturing_date: itemData.manufacturing_date || null,
          expiry_date: itemData.expiry_date || null,
          grn_item_id: grnItem.grn_item_id,
          quantity: itemData.accepted_qty,
          available_qty: itemData.accepted_qty,
          status: 'Active'
        }, { transaction });

        batchId = batch.batch_id;
      }

      // Create stock ledger entry for accepted quantity
      if (itemData.accepted_qty > 0) {
        const currentBalance = await calculateStockBalance(itemData.item_id, warehouse_id, transaction);
        const newBalance = currentBalance + itemData.accepted_qty;

        await StockLedger.create({
          item_id: itemData.item_id,
          warehouse_id,
          location_id: null, // Can be updated later
          batch_id: batchId,
          transaction_type: 'GRN',
          quantity: itemData.accepted_qty,
          balance_qty: newBalance,
          transaction_date: grn.grn_date,
          reference_id: grn.grn_id,
          reference_type: 'GRN',
          created_by: userId
        }, { transaction });
      }
    }

    // Update GRN status to Completed
    await grn.update({ status: 'Completed' }, { transaction });

    // Update PO status
    await updatePOStatus(po_id, transaction);

    // Commit transaction
    await transaction.commit();

    // Fetch complete GRN with all relations
    const completeGRN = await GRN.findByPk(grn.grn_id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['supplier_id', 'supplier_name']
          }]
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['user_id', 'full_name', 'username']
        },
        {
          model: GRNItem,
          as: 'grnItems',
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['item_id', 'item_name', 'sku']
            },
            {
              model: Batch,
              as: 'batches',
              attributes: ['batch_id', 'batch_number', 'lot_number', 'expiry_date', 'quantity']
            }
          ]
        }
      ]
    });

    return ok(res, completeGRN, 'GRN created successfully', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Create GRN error:', error);
    return fail(res, `Failed to create GRN: ${error.message}`, 500);
  }
};

/**
 * GET ALL GRNs
 * GET /api/grn
 */
const getAllGRNs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      warehouse_id,
      po_id,
      start_date,
      end_date
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (warehouse_id) where.warehouse_id = parseInt(warehouse_id);
    if (po_id) where.po_id = parseInt(po_id);
    if (start_date || end_date) {
      where.grn_date = {};
      if (start_date) where.grn_date[Op.gte] = start_date;
      if (end_date) where.grn_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: grns } = await GRN.findAndCountAll({
      where,
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['po_number'],
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['supplier_name']
          }]
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_name']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['full_name']
        },
        {
          model: GRNItem,
          as: 'grnItems',
          attributes: ['received_qty', 'accepted_qty', 'rejected_qty']
        }
      ],
      order: [['grn_date', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const data = grns.map(grn => {
      const grnJson = grn.toJSON();
      const totalAccepted = grnJson.grnItems.reduce((sum, item) => sum + item.accepted_qty, 0);
      const totalRejected = grnJson.grnItems.reduce((sum, item) => sum + item.rejected_qty, 0);

      return {
        grn_id: grnJson.grn_id,
        grn_number: grnJson.grn_number,
        grn_date: grnJson.grn_date,
        status: grnJson.status,
        po_number: grnJson.purchaseOrder?.po_number,
        supplier_name: grnJson.purchaseOrder?.supplier?.supplier_name,
        warehouse_name: grnJson.warehouse?.warehouse_name,
        received_by: grnJson.receiver?.full_name,
        item_count: grnJson.grnItems.length,
        total_accepted_qty: totalAccepted,
        total_rejected_qty: totalRejected,
        remarks: grnJson.remarks,
        createdAt: grnJson.createdAt,
        updatedAt: grnJson.updatedAt
      };
    });

    return ok(res, {
      grns: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    }, 'GRNs retrieved successfully');
  } catch (error) {
    console.error('Get all GRNs error:', error);
    return fail(res, 'Failed to fetch GRNs', 500);
  }
};

/**
 * GET GRN BY ID
 * GET /api/grn/:id
 */
const getGRNById = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['supplier_id', 'supplier_name']
          }],
          attributes: ['po_id', 'po_number', 'po_date', 'expected_delivery_date']
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name', 'address', 'city']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['user_id', 'full_name', 'username', 'email']
        },
        {
          model: GRNItem,
          as: 'grnItems',
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['item_id', 'item_name', 'sku', 'unit_of_measure']
            },
            {
              model: Batch,
              as: 'batches',
              attributes: ['batch_id', 'batch_number', 'lot_number', 'manufacturing_date', 'expiry_date', 'quantity', 'available_qty', 'status']
            }
          ]
        }
      ]
    });

    if (!grn) {
      return fail(res, 'GRN not found', 404);
    }

    return ok(res, grn, 'GRN retrieved successfully');
  } catch (error) {
    console.error('Get GRN by ID error:', error);
    return fail(res, 'Failed to fetch GRN', 500);
  }
};

/**
 * UPDATE GRN
 * PUT /api/grn/:id
 */
const updateGRN = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { grn_date, remarks } = req.body;

    const grn = await GRN.findByPk(id, { transaction });

    if (!grn) {
      await transaction.rollback();
      return fail(res, 'GRN not found', 404);
    }

    if (grn.status === 'Completed') {
      await transaction.rollback();
      return fail(res, 'Cannot update completed GRN', 400);
    }

    const updateData = {};
    if (grn_date) updateData.grn_date = grn_date;
    if (remarks !== undefined) updateData.remarks = remarks;

    await grn.update(updateData, { transaction });

    await transaction.commit();

    const updatedGRN = await GRN.findByPk(id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          include: [{
            model: Supplier,
            as: 'supplier',
            attributes: ['supplier_name']
          }]
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_name']
        },
        {
          model: GRNItem,
          as: 'grnItems',
          include: [{
            model: Item,
            as: 'item',
            attributes: ['item_name', 'sku']
          }]
        }
      ]
    });

    return ok(res, updatedGRN, 'GRN updated successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Update GRN error:', error);
    return fail(res, 'Failed to update GRN', 500);
  }
};

/**
 * COMPLETE GRN
 * PUT /api/grn/:id/complete
 */
const completeGRN = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id, { transaction });

    if (!grn) {
      await transaction.rollback();
      return fail(res, 'GRN not found', 404);
    }

    if (grn.status === 'Completed') {
      await transaction.rollback();
      return fail(res, 'GRN is already completed', 400);
    }

    await grn.update({ status: 'Completed' }, { transaction });

    // Update PO status
    await updatePOStatus(grn.po_id, transaction);

    await transaction.commit();

    const completedGRN = await GRN.findByPk(id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['po_number', 'status']
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_name']
        }
      ]
    });

    return ok(res, completedGRN, 'GRN completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Complete GRN error:', error);
    return fail(res, 'Failed to complete GRN', 500);
  }
};

module.exports = {
  getPendingPOs,
  createGRN,
  getAllGRNs,
  getGRNById,
  updateGRN,
  completeGRN
};

