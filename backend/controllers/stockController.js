const { Op, fn, col, literal, Sequelize } = require('sequelize');
const { sequelize, StockLedger, Item, Warehouse, Location, Batch, Category, User, PurchaseOrder, POItem, GRN, GRNItem } = require('../models');
const { getCurrentStock: getCurrentStockUtil } = require('../utils/stockUtils');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate current stock balance for item in warehouse/location/batch
 */
const calculateCurrentStockInternal = async (item_id, warehouse_id, location_id = null, batch_id = null, transaction = null) => {
  return getCurrentStockUtil({ item_id, warehouse_id, location_id, batch_id }, transaction);
};

/**
 * Get batches for issue using FEFO (First Expiry First Out)
 */
const getBatchesForIssue = async (item_id, warehouse_id, transaction = null) => {
  // Get all batches for this item in warehouse with available quantity
  const batches = await Batch.findAll({
    where: {
      item_id,
      available_qty: { [Op.gt]: 0 },
      status: 'Active'
    },
    include: [{
      model: StockLedger,
      as: 'stockLedgers',
      where: {
        warehouse_id,
        item_id
      },
      attributes: [],
      required: false
    }],
    order: [
      [literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
      ['expiry_date', 'ASC'],
      ['batch_id', 'ASC']
    ],
    transaction
  });

  // Filter batches that have stock in this warehouse
  const batchesWithStock = [];
  for (const batch of batches) {
    const stock = await calculateCurrentStockInternal(item_id, warehouse_id, null, batch.batch_id, transaction);
    if (stock > 0) {
      batchesWithStock.push({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        available_qty: Math.min(batch.available_qty, stock),
        stock_in_warehouse: stock
      });
    }
  }

  return batchesWithStock;
};

/**
 * Validate stock availability
 */
const validateStockAvailability = async (item_id, warehouse_id, required_qty, location_id = null, batch_id = null, transaction = null) => {
  const available = await calculateCurrentStockInternal(item_id, warehouse_id, location_id, batch_id, transaction);
  return {
    available: available >= required_qty,
    available_qty: available
  };
};

/**
 * Update batch quantity
 */
const updateBatchQuantity = async (batch_id, quantity_change, transaction) => {
  const batch = await Batch.findByPk(batch_id, { transaction });
  if (!batch) return;

  const newAvailableQty = Math.max(0, batch.available_qty + quantity_change);
  await batch.update({
    available_qty: newAvailableQty,
    status: newAvailableQty === 0 ? 'Disposed' : batch.status
  }, { transaction });
};

/**
 * Get next balance quantity after transaction
 */
const getNextBalanceQty = async (item_id, warehouse_id, quantity_change, location_id = null, batch_id = null, transaction = null) => {
  const currentBalance = await calculateCurrentStockInternal(item_id, warehouse_id, location_id, batch_id, transaction);
  const newBalance = currentBalance + quantity_change;

  if (newBalance < 0) {
    throw new Error('Stock balance cannot be negative');
  }

  return newBalance;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

/**
 * GET CURRENT STOCK SUMMARY
 * GET /api/stock/summary
 */
const getCurrentStock = async (req, res) => {
  try {
    const { item_id, warehouse_id, category_id, low_stock } = req.query;

    // Build where clause for stock ledger
    const stockWhere = {};
    if (item_id) stockWhere.item_id = parseInt(item_id);
    if (warehouse_id) stockWhere.warehouse_id = parseInt(warehouse_id);

    // USER REQ: Use balance_qty only.
    // To get cumulative stock accurately, we find the latest balance_qty for every unique Location/Batch of this Item/Warehouse
    const latestBalances = await StockLedger.findAll({
      attributes: [
        'item_id',
        'warehouse_id',
        [fn('MAX', col('ledger_id')), 'max_id']
      ],
      where: stockWhere,
      group: ['item_id', 'warehouse_id', 'location_id', 'batch_id'],
      raw: true
    });

    const maxIds = latestBalances.map(b => b.max_id);
    const ledgerEntries = await StockLedger.findAll({
      where: { ledger_id: { [Op.in]: maxIds } },
      include: [
        {
          model: Item, as: 'item',
          attributes: ['item_id', 'sku', 'item_name', 'reorder_point', 'safety_stock'],
          include: [{ model: Category, as: 'category', attributes: ['category_name'] }]
        },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }
      ]
    });

    const itemMap = {};
    for (const entry of ledgerEntries) {
      const itemId = entry.item_id;
      const whId = entry.warehouse_id;

      if (!itemMap[itemId]) {
        itemMap[itemId] = {
          item_id: itemId,
          sku: entry.item.sku,
          item_name: entry.item.item_name,
          category_name: entry.item.category?.category_name || null,
          reorder_point: entry.item.reorder_point,
          safety_stock: entry.item.safety_stock,
          stock_by_warehouse_map: {}, // intermediate map for grouping
          total_stock: 0
        };
      }

      if (!itemMap[itemId].stock_by_warehouse_map[whId]) {
        itemMap[itemId].stock_by_warehouse_map[whId] = {
          warehouse_id: whId,
          warehouse_name: entry.warehouse?.warehouse_name || 'Unknown',
          current_stock: 0,
          reorder_point: entry.item.reorder_point,
          safety_stock: entry.item.safety_stock
        };
      }

      const bal = parseFloat(entry.balance_qty || 0);
      itemMap[itemId].stock_by_warehouse_map[whId].current_stock += bal;
      itemMap[itemId].total_stock += bal;
    }

    // Convert internal maps to arrays for response (merged status logic)
    const items = Object.values(itemMap).map(item => {
      item.stock_by_warehouse = Object.values(item.stock_by_warehouse_map).map(wh => {
        let status = 'Good Stock';
        if (wh.current_stock === 0) status = 'Out of Stock';
        else if (wh.current_stock < wh.safety_stock) status = 'Critical Stock';
        else if (wh.current_stock < wh.reorder_point) status = 'Low Stock';
        wh.status = status;
        return wh;
      });
      delete item.stock_by_warehouse_map;

      let overallStatus = 'Good Stock';
      if (item.total_stock === 0) overallStatus = 'Out of Stock';
      else if (item.total_stock < item.safety_stock) overallStatus = 'Critical Stock';
      else if (item.total_stock < item.reorder_point) overallStatus = 'Low Stock';
      item.overall_status = overallStatus;
      return item;
    });

    // Filter low stock if requested
    let filteredItems = items;
    if (low_stock === 'true') {
      filteredItems = items.filter(item =>
        item.overall_status === 'Low Stock' ||
        item.overall_status === 'Critical Stock' ||
        item.overall_status === 'Out of Stock'
      );
    }

    // Calculate summary
    const summary = {
      total_items: filteredItems.length,
      good_stock: filteredItems.filter(i => i.overall_status === 'Good Stock').length,
      low_stock: filteredItems.filter(i => i.overall_status === 'Low Stock').length,
      critical_stock: filteredItems.filter(i => i.overall_status === 'Critical Stock').length,
      out_of_stock: filteredItems.filter(i => i.overall_status === 'Out of Stock').length
    };

    return ok(res, {
      summary,
      items: filteredItems
    }, 'Stock summary retrieved successfully');
  } catch (error) {
    console.error('Get current stock error:', error);
    return fail(res, 'Failed to fetch stock summary', 500);
  }
};

/**
 * TRANSFER BETWEEN LOCATIONS
 * POST /api/stock/transfer/location
 */
const transferBetweenLocations = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { item_id, from_location_id, to_location_id, quantity, batch_id, remarks } = req.body;
    const userId = req.user.user_id;

    // Validate locations exist and belong to same warehouse
    const fromLocation = await Location.findByPk(from_location_id, {
      include: [{ model: Warehouse, as: 'warehouse' }],
      transaction
    });
    const toLocation = await Location.findByPk(to_location_id, {
      include: [{ model: Warehouse, as: 'warehouse' }],
      transaction
    });

    if (!fromLocation || !toLocation) {
      await transaction.rollback();
      return fail(res, 'One or both locations not found', 404);
    }

    if (fromLocation.warehouse_id !== toLocation.warehouse_id) {
      await transaction.rollback();
      return fail(res, 'Locations must belong to the same warehouse', 400);
    }

    if (from_location_id === to_location_id) {
      await transaction.rollback();
      return fail(res, 'Source and destination locations cannot be the same', 400);
    }

    const warehouse_id = fromLocation.warehouse_id;

    // Validate stock availability - check location first, then warehouse level
    let stockCheck = await validateStockAvailability(item_id, warehouse_id, quantity, from_location_id, batch_id, transaction);
    let sourceLocationId = from_location_id;

    // If no stock at location, check warehouse level (location_id = null)
    if (!stockCheck.available) {
      const warehouseStockCheck = await validateStockAvailability(item_id, warehouse_id, quantity, null, batch_id, transaction);
      if (warehouseStockCheck.available) {
        // Stock exists at warehouse level, we can transfer from there
        stockCheck = warehouseStockCheck;
        sourceLocationId = null; // Transfer from warehouse level
      }
    }

    if (!stockCheck.available) {
      const locationStock = await calculateCurrentStockInternal(item_id, warehouse_id, from_location_id, batch_id, transaction);
      const warehouseStock = await calculateCurrentStockInternal(item_id, warehouse_id, null, batch_id, transaction);
      await transaction.rollback();
      return fail(res, `Insufficient stock. Available at location: ${locationStock}, Available at warehouse level: ${warehouseStock}, Required: ${quantity}`, 400);
    }

    // Validate batch if provided
    if (batch_id) {
      const batch = await Batch.findByPk(batch_id, { transaction });
      if (!batch || batch.item_id !== item_id) {
        await transaction.rollback();
        return fail(res, 'Invalid batch or batch does not belong to this item', 400);
      }
      if (batch.available_qty < quantity) {
        await transaction.rollback();
        return fail(res, `Insufficient batch quantity. Available: ${batch.available_qty}`, 400);
      }
    }

    // Calculate balances - use sourceLocationId (may be null if transferring from warehouse level)
    const fromBalance = await getNextBalanceQty(item_id, warehouse_id, -quantity, sourceLocationId, batch_id, transaction);
    const toBalance = await getNextBalanceQty(item_id, warehouse_id, quantity, to_location_id, batch_id, transaction);

    // Create stock ledger entry for source (deduct from source location or warehouse level)
    await StockLedger.create({
      item_id,
      warehouse_id,
      location_id: sourceLocationId, // May be null if transferring from warehouse level
      batch_id,
      transaction_type: 'Transfer',
      quantity: -quantity,
      balance_qty: fromBalance,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_type: 'Location Transfer',
      created_by: userId
    }, { transaction });

    await StockLedger.create({
      item_id,
      warehouse_id,
      location_id: to_location_id,
      batch_id,
      transaction_type: 'Transfer',
      quantity: quantity,
      balance_qty: toBalance,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_type: 'Location Transfer',
      created_by: userId
    }, { transaction });

    // Update batch if provided
    if (batch_id) {
      await updateBatchQuantity(batch_id, -quantity, transaction);
    }

    await transaction.commit();

    // Get warehouse name if association loaded, otherwise fetch it
    let warehouseName = 'Unknown';
    if (fromLocation.warehouse) {
      warehouseName = fromLocation.warehouse.warehouse_name;
    } else {
      const warehouse = await Warehouse.findByPk(warehouse_id, { transaction });
      if (warehouse) {
        warehouseName = warehouse.warehouse_name;
      }
    }

    const transferData = {
      item_id,
      from_location: {
        location_id: from_location_id,
        location_code: fromLocation.location_code,
        current_stock: fromBalance
      },
      to_location: {
        location_id: to_location_id,
        location_code: toLocation.location_code,
        current_stock: toBalance
      },
      quantity,
      warehouse_id,
      warehouse_name: warehouseName
    };

    return ok(res, transferData, 'Stock transferred successfully between locations', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Transfer between locations error:', error);
    console.error('Error stack:', error.stack);
    return fail(res, `Failed to transfer stock: ${error.message}`, 500);
  }
};

/**
 * TRANSFER BETWEEN WAREHOUSES
 * POST /api/stock/transfer/warehouse
 */
const transferBetweenWarehouses = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { item_id, from_warehouse_id, to_warehouse_id, from_location_id, to_location_id, quantity, batch_id, expected_date, remarks } = req.body;
    const userId = req.user.user_id;

    if (from_warehouse_id === to_warehouse_id) {
      await transaction.rollback();
      return fail(res, 'Source and destination warehouses cannot be the same', 400);
    }

    // Validate warehouses
    const fromWarehouse = await Warehouse.findByPk(from_warehouse_id, { transaction });
    const toWarehouse = await Warehouse.findByPk(to_warehouse_id, { transaction });

    if (!fromWarehouse || !toWarehouse) {
      await transaction.rollback();
      return fail(res, 'One or both warehouses not found', 404);
    }

    if (!fromWarehouse.is_active || !toWarehouse.is_active) {
      await transaction.rollback();
      return fail(res, 'Both warehouses must be active', 400);
    }

    // Validate locations if provided
    if (from_location_id) {
      const fromLocation = await Location.findByPk(from_location_id, { transaction });
      if (!fromLocation || fromLocation.warehouse_id !== from_warehouse_id) {
        await transaction.rollback();
        return fail(res, 'Invalid source location', 400);
      }
    }

    if (to_location_id) {
      const toLocation = await Location.findByPk(to_location_id, { transaction });
      if (!toLocation || toLocation.warehouse_id !== to_warehouse_id) {
        await transaction.rollback();
        return fail(res, 'Invalid destination location', 400);
      }
    }

    // Validate stock availability (check specific source location first, then warehouse-level)
    let sourceLocationId = from_location_id || null;
    let stockCheck = await validateStockAvailability(
      item_id,
      from_warehouse_id,
      quantity,
      sourceLocationId,
      batch_id,
      transaction
    );

    if (!stockCheck.available && sourceLocationId) {
      // Fallback to warehouse-level stock (location_id = null)
      const warehouseStockCheck = await validateStockAvailability(
        item_id,
        from_warehouse_id,
        quantity,
        null,
        batch_id,
        transaction
      );
      if (warehouseStockCheck.available) {
        stockCheck = warehouseStockCheck;
        sourceLocationId = null; // deduct from warehouse-level stock
      }
    }

    if (!stockCheck.available) {
      const locStock = await calculateCurrentStockInternal(item_id, from_warehouse_id, from_location_id, batch_id, transaction);
      const whStock = await calculateCurrentStockInternal(item_id, from_warehouse_id, null, batch_id, transaction);
      await transaction.rollback();
      return fail(
        res,
        `Insufficient stock in source warehouse. Available at location: ${locStock}, at warehouse: ${whStock}, required: ${quantity}`,
        400
      );
    }

    // Validate batch if provided
    if (batch_id) {
      const batch = await Batch.findByPk(batch_id, { transaction });
      if (!batch || batch.item_id !== item_id) {
        await transaction.rollback();
        return fail(res, 'Invalid batch or batch does not belong to this item', 400);
      }
    }

    // Calculate balances
    const fromBalance = await getNextBalanceQty(
      item_id,
      from_warehouse_id,
      -quantity,
      sourceLocationId,
      batch_id,
      transaction
    );
    const toBalance = await getNextBalanceQty(
      item_id,
      to_warehouse_id,
      quantity,
      to_location_id,
      null,
      transaction
    ); // Don't transfer batch to new warehouse

    // Create stock ledger entries
    await StockLedger.create({
      item_id,
      warehouse_id: from_warehouse_id,
      location_id: sourceLocationId,
      batch_id,
      transaction_type: 'Transfer',
      quantity: -quantity,
      balance_qty: fromBalance,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_type: 'Warehouse Transfer',
      created_by: userId
    }, { transaction });

    await StockLedger.create({
      item_id,
      warehouse_id: to_warehouse_id,
      location_id: to_location_id,
      batch_id: null, // Batch doesn't transfer to new warehouse
      transaction_type: 'Transfer',
      quantity: quantity,
      balance_qty: toBalance,
      transaction_date: expected_date || new Date().toISOString().split('T')[0],
      reference_type: 'Warehouse Transfer',
      created_by: userId
    }, { transaction });

    // Update batch if provided
    if (batch_id) {
      await updateBatchQuantity(batch_id, -quantity, transaction);
    }

    await transaction.commit();

    const transferData = {
      item_id,
      from_warehouse: {
        warehouse_id: from_warehouse_id,
        warehouse_name: fromWarehouse.warehouse_name,
        current_stock: fromBalance
      },
      to_warehouse: {
        warehouse_id: to_warehouse_id,
        warehouse_name: toWarehouse.warehouse_name,
        current_stock: toBalance
      },
      quantity,
      expected_date: expected_date || null
    };

    return ok(res, transferData, 'Stock transferred successfully between warehouses', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Transfer between warehouses error:', error);
    return fail(res, error.message || 'Failed to transfer stock', 500);
  }
};

/**
 * ISSUE STOCK (FEFO Logic)
 * POST /api/stock/issue
 */
const issueStock = async (req, res) => {
  const { warehouse_id, items, order_reference, remarks } = req.body;
  const userId = req.user.user_id;

  try {
    const result = await sequelize.transaction(async (transaction) => {
      // Validate warehouse
      const warehouse = await Warehouse.findByPk(warehouse_id, { transaction });
      if (!warehouse || !warehouse.is_active) {
        throw new Error('Warehouse not found or inactive');
      }

      const issueDetails = [];
      const batchesUsed = [];

      // Process each item
      for (const itemData of items) {
        const { item_id, quantity, location_id } = itemData;
        let sourceLocationId = location_id || null;

        // Check stock at the given location; if insufficient and a location was specified, fall back to warehouse-level stock
        let totalStock = await calculateCurrentStockInternal(item_id, warehouse_id, sourceLocationId, null, transaction);
        if (totalStock < quantity && sourceLocationId) {
          const warehouseLevelStock = await calculateCurrentStockInternal(item_id, warehouse_id, null, null, transaction);
          if (warehouseLevelStock >= quantity) {
            sourceLocationId = null; // issue from warehouse-level stock
            totalStock = warehouseLevelStock;
          }
        }

        if (totalStock < quantity) {
          const whStock = await calculateCurrentStockInternal(item_id, warehouse_id, null, null, transaction);
          const locStock = sourceLocationId
            ? await calculateCurrentStockInternal(item_id, warehouse_id, sourceLocationId, null, transaction)
            : whStock;
          throw new Error(
            `Insufficient stock for item ${item_id}. Available at location: ${locStock}, at warehouse: ${whStock}, Required: ${quantity}`
          );
        }

        // Get batches using FEFO
        const batches = await getBatchesForIssue(item_id, warehouse_id, transaction);

        if (batches.length === 0) {
          // No batches, issue from general stock
          const balance = await getNextBalanceQty(item_id, warehouse_id, -quantity, sourceLocationId, null, transaction);

          await StockLedger.create(
            {
              item_id,
              warehouse_id,
              location_id: sourceLocationId,
              batch_id: null,
              transaction_type: 'Issue',
              quantity: -quantity,
              balance_qty: balance,
              transaction_date: new Date().toISOString().split('T')[0],
              reference_type: 'Order Fulfillment',
              reference_id: order_reference ? parseInt(order_reference) : null,
              created_by: userId
            },
            { transaction }
          );

          issueDetails.push({
            item_id,
            quantity,
            batches_used: [],
            remaining_stock: balance
          });
        } else {
          // Issue from batches using FEFO
          let remainingQty = quantity;
          const itemBatchesUsed = [];

          for (const batch of batches) {
            if (remainingQty <= 0) break;

            const qtyFromBatch = Math.min(remainingQty, batch.available_qty);
            const batchStock = await calculateCurrentStock(item_id, warehouse_id, sourceLocationId, batch.batch_id, transaction);

            if (batchStock < qtyFromBatch) {
              throw new Error(`Insufficient stock in batch ${batch.batch_number}`);
            }

            const balance = await getNextBalanceQty(
              item_id,
              warehouse_id,
              -qtyFromBatch,
              sourceLocationId,
              batch.batch_id,
              transaction
            );

            await StockLedger.create(
              {
                item_id,
                warehouse_id,
                location_id: sourceLocationId,
                batch_id: batch.batch_id,
                transaction_type: 'Issue',
                quantity: -qtyFromBatch,
                balance_qty: balance,
                transaction_date: new Date().toISOString().split('T')[0],
                reference_type: 'Order Fulfillment',
                reference_id: order_reference ? parseInt(order_reference) : null,
                created_by: userId
              },
              { transaction }
            );

            await updateBatchQuantity(batch.batch_id, -qtyFromBatch, transaction);

            itemBatchesUsed.push({
              batch_id: batch.batch_id,
              batch_number: batch.batch_number,
              expiry_date: batch.expiry_date,
              quantity: qtyFromBatch
            });

            remainingQty -= qtyFromBatch;
          }

          if (remainingQty > 0) {
            throw new Error(`Insufficient stock in batches for item ${item_id}`);
          }

          const finalBalance = await calculateCurrentStockInternal(item_id, warehouse_id, sourceLocationId, null, transaction);
          issueDetails.push({
            item_id,
            quantity,
            batches_used: itemBatchesUsed,
            remaining_stock: finalBalance
          });
          batchesUsed.push(...itemBatchesUsed);
        }
      }

      // Check for near-expiry batches
      const warnings = [];
      for (const batch of batchesUsed) {
        if (batch.expiry_date) {
          const expiryDate = new Date(batch.expiry_date);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            warnings.push({
              batch_number: batch.batch_number,
              expiry_date: batch.expiry_date,
              days_until_expiry: daysUntilExpiry
            });
          }
        }
      }

      return {
        warehouse_id,
        warehouse_name: warehouse.warehouse_name,
        order_reference,
        items: issueDetails,
        warnings: warnings.length > 0 ? warnings : null
      };
    });

    return ok(res, result, 'Stock issued successfully', 201);
  } catch (error) {
    console.error('Issue stock error:', error);
    return fail(res, error.message || 'Failed to issue stock', 500);
  }
};

/**
 * STOCK ADJUSTMENT
 * POST /api/stock/adjust
 */
const adjustStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { item_id, warehouse_id, location_id, batch_id, adjustment_type, quantity, reason, remarks } = req.body;
    const userId = req.user.user_id;

    // Validate adjustment type
    if (!['Addition', 'Reduction'].includes(adjustment_type)) {
      await transaction.rollback();
      return fail(res, 'adjustment_type must be "Addition" or "Reduction"', 400);
    }

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouse_id, { transaction });
    if (!warehouse || !warehouse.is_active) {
      await transaction.rollback();
      return fail(res, 'Warehouse not found or inactive', 404);
    }

    // Validate location if provided
    if (location_id) {
      const location = await Location.findByPk(location_id, { transaction });
      if (!location || location.warehouse_id !== warehouse_id) {
        await transaction.rollback();
        return fail(res, 'Invalid location', 400);
      }
    }

    // Validate batch if provided
    if (batch_id) {
      const batch = await Batch.findByPk(batch_id, { transaction });
      if (!batch || batch.item_id !== item_id) {
        await transaction.rollback();
        return fail(res, 'Invalid batch or batch does not belong to this item', 400);
      }
    }

    // For reduction, check stock availability
    if (adjustment_type === 'Reduction') {
      const stockCheck = await validateStockAvailability(item_id, warehouse_id, quantity, location_id, batch_id, transaction);
      if (!stockCheck.available) {
        await transaction.rollback();
        return fail(res, `Insufficient stock for reduction. Available: ${stockCheck.available_qty}`, 400);
      }
    }

    // Calculate quantity (positive for addition, negative for reduction)
    const quantityChange = adjustment_type === 'Addition' ? quantity : -quantity;
    const balance = await getNextBalanceQty(item_id, warehouse_id, quantityChange, location_id, batch_id, transaction);

    // Create stock ledger entry
    await StockLedger.create({
      item_id,
      warehouse_id,
      location_id,
      batch_id,
      transaction_type: 'Adjustment',
      quantity: quantityChange,
      balance_qty: balance,
      transaction_date: new Date().toISOString().split('T')[0],
      reference_type: `${adjustment_type} - ${reason}`,
      created_by: userId
    }, { transaction });

    // Update batch if provided
    if (batch_id) {
      await updateBatchQuantity(batch_id, quantityChange, transaction);
    }

    await transaction.commit();

    const adjustmentData = {
      item_id,
      warehouse_id,
      warehouse_name: warehouse.warehouse_name,
      location_id,
      batch_id,
      adjustment_type,
      quantity: Math.abs(quantityChange),
      reason,
      new_balance: balance
    };

    return ok(res, adjustmentData, 'Stock adjusted successfully', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Adjust stock error:', error);
    return fail(res, error.message || 'Failed to adjust stock', 500);
  }
};

/**
 * RECORD STOCK COUNT
 * POST /api/stock/count
 */
const recordStockCount = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { warehouse_id, location_id, counted_items, count_date, counted_by, remarks } = req.body;
    const userId = req.user.user_id;

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouse_id, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return fail(res, 'Warehouse not found', 404);
    }

    // Validate location if provided
    if (location_id) {
      const location = await Location.findByPk(location_id, { transaction });
      if (!location || location.warehouse_id !== warehouse_id) {
        await transaction.rollback();
        return fail(res, 'Invalid location', 400);
      }
    }

    const countResults = [];
    const itemsRequiringInvestigation = [];
    let totalVarianceValue = 0;

    // Process each counted item
    for (const countedItem of counted_items) {
      const { item_id, batch_id, counted_qty } = countedItem;

      // Get system stock
      const systemQty = await calculateCurrentStock(item_id, warehouse_id, location_id, batch_id, transaction);
      const variance = counted_qty - systemQty;
      const variancePercentage = systemQty > 0 ? ((variance / systemQty) * 100).toFixed(2) : (counted_qty > 0 ? 100 : 0);

      // Get item details for value calculation
      const item = await Item.findByPk(item_id, { transaction });
      const varianceValue = Math.abs(variance) * parseFloat(item.unit_price || 0);
      totalVarianceValue += varianceValue;

      let status = 'Matching';
      if (Math.abs(variance) > 0) {
        status = Math.abs(parseFloat(variancePercentage)) > 5 ? 'Significant Variance' : 'Minor Variance';
      }

      countResults.push({
        item_id,
        item_name: item.item_name,
        sku: item.sku,
        batch_id,
        system_qty: systemQty,
        counted_qty,
        variance,
        variance_percentage: parseFloat(variancePercentage),
        variance_value: varianceValue,
        status
      });

      // Create adjustment if variance exists
      if (variance !== 0) {
        const adjustmentType = variance > 0 ? 'Addition' : 'Reduction';
        const adjustmentQty = Math.abs(variance);
        const balance = await getNextBalanceQty(item_id, warehouse_id, variance, location_id, batch_id, transaction);

        await StockLedger.create({
          item_id,
          warehouse_id,
          location_id,
          batch_id,
          transaction_type: 'Count',
          quantity: variance,
          balance_qty: balance,
          transaction_date: count_date || new Date().toISOString().split('T')[0],
          reference_type: `Stock Count - ${adjustmentType}`,
          created_by: userId
        }, { transaction });

        // Update batch if provided
        if (batch_id) {
          await updateBatchQuantity(batch_id, variance, transaction);
        }
      }

      // Flag for investigation if significant variance
      if (Math.abs(parseFloat(variancePercentage)) > 5) {
        itemsRequiringInvestigation.push({
          item_id,
          item_name: item.item_name,
          variance,
          variance_percentage: parseFloat(variancePercentage),
          status: 'Significant Variance'
        });
      }
    }

    await transaction.commit();

    const summary = {
      total_items_counted: counted_items.length,
      items_matching: countResults.filter(r => r.status === 'Matching').length,
      items_with_variance: countResults.filter(r => r.status !== 'Matching').length,
      total_variance_value: totalVarianceValue
    };

    return ok(res, {
      count_summary: summary,
      items: countResults,
      items_requiring_investigation: itemsRequiringInvestigation.length > 0 ? itemsRequiringInvestigation : null,
      warehouse_id,
      warehouse_name: warehouse.warehouse_name,
      count_date: count_date || new Date().toISOString().split('T')[0],
      counted_by
    }, 'Stock count recorded successfully', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('Record stock count error:', error);
    return fail(res, error.message || 'Failed to record stock count', 500);
  }
};

/**
 * GET STOCK LEDGER / MOVEMENT HISTORY
 * GET /api/stock/ledger
 */
const getStockLedger = async (req, res) => {
  try {
    const {
      item_id,
      warehouse_id,
      transaction_type,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (item_id) where.item_id = parseInt(item_id);
    if (warehouse_id) where.warehouse_id = parseInt(warehouse_id);
    if (transaction_type) where.transaction_type = transaction_type;
    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date[Op.gte] = start_date;
      if (end_date) where.transaction_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ledgers } = await StockLedger.findAndCountAll({
      where,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['item_id', 'sku', 'item_name']
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['location_id', 'location_code'],
          required: false
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['batch_id', 'batch_number', 'expiry_date'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'username']
        }
      ],
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const data = ledgers.map(ledger => ({
      ledger_id: ledger.ledger_id,
      transaction_type: ledger.transaction_type,
      transaction_date: ledger.transaction_date,
      quantity: parseFloat(ledger.quantity || 0),
      balance_qty: parseFloat(ledger.balance_qty || 0),
      item: {
        item_id: ledger.item.item_id,
        sku: ledger.item.sku,
        item_name: ledger.item.item_name
      },
      warehouse: {
        warehouse_id: ledger.warehouse.warehouse_id,
        warehouse_name: ledger.warehouse.warehouse_name
      },
      location: ledger.location ? {
        location_id: ledger.location.location_id,
        location_code: ledger.location.location_code
      } : null,
      batch: ledger.batch ? {
        batch_id: ledger.batch.batch_id,
        batch_number: ledger.batch.batch_number,
        expiry_date: ledger.batch.expiry_date
      } : null,
      created_by: {
        user_id: ledger.creator.user_id,
        full_name: ledger.creator.full_name,
        username: ledger.creator.username
      },
      reference_type: ledger.reference_type,
      reference_id: ledger.reference_id,
      createdAt: ledger.createdAt
    }));

    return ok(res, {
      transactions: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    }, 'Stock ledger retrieved successfully');
  } catch (error) {
    console.error('Get stock ledger error:', error);
    return fail(res, 'Failed to fetch stock ledger', 500);
  }
};

/**
 * GET STOCK BALANCE BY ITEM
 * GET /api/stock/item/:itemId
 */
const getStockBalanceByItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { warehouse_id } = req.query;

    // Get item details
    const item = await Item.findByPk(itemId, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['category_id', 'category_name']
      }]
    });

    if (!item) {
      return fail(res, 'Item not found', 404);
    }

    // USER REQ: Use balance_qty only.
    // We sum the LATEST balances from each location/batch for this item.
    // Optional: filter by warehouse_id for precision
    const balanceWhere = { item_id: itemId };
    if (warehouse_id) balanceWhere.warehouse_id = parseInt(warehouse_id);

    const latestWarehouseEntries = await StockLedger.findAll({
      attributes: [
        'warehouse_id',
        [fn('MAX', col('ledger_id')), 'max_id']
      ],
      where: balanceWhere,
      group: ['warehouse_id', 'location_id', 'batch_id'],
      raw: true
    });

    const maxWhIds = latestWarehouseEntries.map(e => e.max_id);
    const warehouseData = await StockLedger.findAll({
      where: { ledger_id: { [Op.in]: maxWhIds } },
      include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }]
    });

    const warehouseMap = {};
    let totalStock = 0;

    for (const ledger of warehouseData) {
      const whId = ledger.warehouse_id;
      if (!warehouseMap[whId]) {
        warehouseMap[whId] = {
          warehouse_id: whId,
          warehouse_name: ledger.warehouse?.warehouse_name || 'Unknown',
          total_stock: 0,
          current_stock: 0,
          locations: []
        };
      }

      const bal = parseFloat(ledger.balance_qty || 0);
      warehouseMap[whId].total_stock += bal;
      warehouseMap[whId].current_stock = warehouseMap[whId].total_stock;
      totalStock += bal;
    }

    // Get batches
    const batches = await Batch.findAll({
      where: {
        item_id: itemId,
        available_qty: { [Op.gt]: 0 }
      },
      order: [
        [literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['expiry_date', 'ASC']
      ]
    });

    const batchDetails = [];
    for (const batch of batches) {
      // Get stock for this batch across all warehouses
      const batchStock = await StockLedger.findAll({
        attributes: [
          'warehouse_id',
          [fn('MAX', col('ledger_id')), 'latest_ledger_id']
        ],
        where: {
          item_id: itemId,
          batch_id: batch.batch_id
        },
        group: ['warehouse_id'],
        raw: true
      });

      let batchTotalStock = 0;
      if (batchStock.length > 0) {
        const batchLedgerIds = batchStock.map(b => b.latest_ledger_id);
        const batchLedgers = await StockLedger.findAll({
          where: { ledger_id: { [Op.in]: batchLedgerIds } },
          include: [{
            model: Warehouse,
            as: 'warehouse',
            attributes: ['warehouse_name']
          }]
        });

        batchTotalStock = batchLedgers.reduce((sum, l) => sum + (l.balance_qty || 0), 0);
      }

      batchDetails.push({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        lot_number: batch.lot_number,
        manufacturing_date: batch.manufacturing_date,
        expiry_date: batch.expiry_date,
        quantity: batch.quantity,
        available_qty: batch.available_qty,
        stock_in_warehouses: batchTotalStock,
        status: batch.status
      });
    }

    // Get recent movements (last 10)
    const recentMovements = await StockLedger.findAll({
      where: { item_id: itemId },
      include: [
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['full_name']
        }
      ],
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']],
      limit: 10
    });

    // Determine stock status
    let stockStatus = 'Good Stock';
    if (totalStock === 0) {
      stockStatus = 'Out of Stock';
    } else if (totalStock < item.safety_stock) {
      stockStatus = 'Critical Stock';
    } else if (totalStock < item.reorder_point) {
      stockStatus = 'Low Stock';
    }

    return ok(res, {
      item: {
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.item_name,
        category: item.category ? item.category.category_name : null,
        reorder_point: item.reorder_point,
        safety_stock: item.safety_stock,
        unit_price: parseFloat(item.unit_price)
      },
      total_stock: totalStock,
      stock_status: stockStatus,
      stock_by_warehouse: Object.values(warehouseMap).length > 0 ? Object.values(warehouseMap) : [],
      batches: batchDetails,
      recent_movements: recentMovements.map(m => ({
        ledger_id: m.ledger_id,
        transaction_type: m.transaction_type,
        transaction_date: m.transaction_date,
        quantity: parseFloat(m.quantity || 0),
        balance_qty: parseFloat(m.balance_qty || 0),
        warehouse_name: m.warehouse ? m.warehouse.warehouse_name : null,
        created_by: m.creator ? m.creator.full_name : null,
        reference_type: m.reference_type
      }))
    }, 'Stock balance retrieved successfully');
  } catch (error) {
    console.error('Get stock balance by item error:', error);
    console.error('Error stack:', error.stack);
    return fail(res, `Failed to fetch stock balance: ${error.message}`, 500);
  }
};

/**
 * GET STOCK COUNT TASKS
 * GET /api/stock/count-tasks
 * Returns pending stock count tasks for staff
 */
const getStockCountTasks = async (req, res) => {
  try {
    const { warehouse_id, status = 'pending', limit = 20, page = 1 } = req.query;

    const where = {};
    if (warehouse_id) {
      where.warehouse_id = parseInt(warehouse_id);
    }
    if (status) {
      where.status = status; // pending, in-progress, completed
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query tasks - for now, return items that need cycle counting
    // In a full implementation, you'd have a dedicated StockCountTask table
    // For now, we'll get items that haven't been counted recently
    const tasks = await Item.findAll({
      attributes: ['item_id', 'sku', 'item_name'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['category_id', 'category_name']
        },
        {
          model: StockLedger,
          as: 'stockLedgers',
          attributes: ['ledger_id', 'balance_qty', 'transaction_date'],
          required: false,
          order: [['transaction_date', 'DESC']],
          limit: 1
        }
      ],
      order: [['item_name', 'ASC']],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    // Transform response to include task-specific data
    const taskData = tasks.map(item => ({
      task_id: `TASK-${item.item_id}`,
      item_id: item.item_id,
      sku: item.sku,
      item_name: item.item_name,
      category_name: item.category?.category_name || 'Uncategorized',
      current_balance: item.stockLedgers && item.stockLedgers.length > 0
        ? item.stockLedgers[0].balance_qty
        : 0,
      last_count_date: item.stockLedgers && item.stockLedgers.length > 0
        ? item.stockLedgers[0].transaction_date
        : null,
      status: 'pending',
      assigned_to: null,
      priority: item.stockLedgers && item.stockLedgers.length > 0
        && (new Date() - new Date(item.stockLedgers[0].transaction_date)) > (90 * 24 * 60 * 60 * 1000)
        ? 'high'
        : 'normal'
    }));

    return ok(res, {
      tasks: taskData,
      pagination: {
        total: taskData.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }, 'Stock count tasks retrieved successfully');
  } catch (error) {
    console.error('Get stock count tasks error:', error);
    return fail(res, 'Failed to fetch stock count tasks', 500);
  }
};

/**
 * GET STAFF DASHBOARD STATS
 * GET /api/stock/staff/dashboard
 */
const getStaffDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Pending GRNs Count (Simplified & Robust)
    // Find POs that are not Complete/Rejected and have items with pending qty
    const pendingPOs = await PurchaseOrder.findAll({
      where: { status: { [Op.in]: ['Issued', 'In-Transit'] } },
      attributes: ['po_id'],
      raw: true
    });

    let pendingCount = 0;
    if (pendingPOs.length > 0) {
      for (const po of pendingPOs) {
        // Count items in this PO
        const items = await POItem.findAll({ where: { po_id: po.po_id }, raw: true });
        let poHasPending = false;

        for (const item of items) {
          const received = await GRNItem.sum('accepted_qty', {
            include: [{ model: GRN, as: 'grn', where: { po_id: po.po_id }, attributes: [] }],
            where: { item_id: item.item_id }
          }) || 0;

          if (item.ordered_qty > received) {
            poHasPending = true;
            break;
          }
        }
        if (poHasPending) pendingCount++;
      }
    }

    // 2. Today's Movements
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMovements = await StockLedger.count({
      where: {
        [Op.or]: [
          { transaction_date: todayStr },
          { createdAt: { [Op.gte]: new Date(todayStr + 'T00:00:00Z') } }
        ]
      }
    });

    // 3. Stock Count Tasks
    const tasksCount = await Item.count();

    res.json({
      success: true,
      stats: {
        pending_grns: pendingCount,
        today_movements: todayMovements,
        stock_count_tasks: tasksCount,
        debug_info: {
          today_str: todayStr,
          found_pos: pendingPOs.length
        }
      }
    });
  } catch (error) {
    console.error('Staff Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stats: { pending_grns: 0, today_movements: 0, stock_count_tasks: 0 }
    });
  }
};

module.exports = {
  getCurrentStock,
  transferBetweenLocations,
  transferBetweenWarehouses,
  issueStock,
  adjustStock,
  recordStockCount,
  getStockLedger,
  getStockBalanceByItem,
  getStockCountTasks,
  getStaffDashboard
};

