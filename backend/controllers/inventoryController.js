const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Item, Category, StockLedger, Warehouse, Batch } = require('../models');

/**
 * Helper: build standard success response
 */
const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

/**
 * Helper: build standard error response
 */
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

/**
 * CREATE ITEM (Admin only)
 */
const createItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      sku,
      item_name,
      description,
      category_id,
      unit_of_measure,
      unit_price,
      reorder_point = 0,
      safety_stock = 0,
      lead_time_days = 0,
      is_active = true
    } = req.body;

    // Validate category exists
    const category = await Category.findByPk(category_id, { transaction: t });
    if (!category) {
      await t.rollback();
      return fail(res, 'Category not found', 404);
    }

    if (Number(unit_price) <= 0) {
      await t.rollback();
      return fail(res, 'unit_price must be greater than 0', 400);
    }

    // Auto-generate SKU if not provided
    const finalSku = sku && sku.trim().length > 0 ? sku : `SKU-${Date.now()}`;

    // Ensure SKU uniqueness
    const existing = await Item.findOne({ where: { sku: finalSku }, transaction: t });
    if (existing) {
      await t.rollback();
      return fail(res, 'SKU already exists', 400);
    }

    const item = await Item.create(
      {
        sku: finalSku,
        item_name,
        description,
        category_id,
        unit_of_measure,
        unit_price,
        reorder_point,
        safety_stock,
        lead_time_days,
        is_active
      },
      { transaction: t }
    );

    const created = await Item.findByPk(item.item_id, {
      include: [{ model: Category, as: 'category' }],
      transaction: t
    });

    await t.commit();
    return ok(res, created, 'Item created successfully', 201);
  } catch (error) {
    await t.rollback();
    console.error('Create item error:', error);
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors.map(e => e.message).join(', ');
      return fail(res, `Validation error: ${msg}`, 400);
    }
    return fail(res, 'Failed to create item', 500);
  }
};

/**
 * GET ALL ITEMS (paginated, searchable, sortable)
 */
const getAllItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { search, category_id, is_active, sort = 'item_name', order = 'ASC' } = req.query;

    const where = {};
    if (category_id) where.category_id = category_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(fn('LOWER', col('item_name')), { [Op.like]: term }),
        sequelize.where(fn('LOWER', col('sku')), { [Op.like]: term })
      ];
    }

    const sortable = ['item_name', 'unit_price', 'reorder_point'];
    const sortField = sortable.includes(sort) ? sort : 'item_name';
    const sortOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { rows, count } = await Item.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: [[sortField, sortOrder]],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return ok(res, {
      items: rows,
      total: count,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Get all items error:', error);
    return fail(res, 'Failed to fetch items', 500);
  }
};

/**
 * GET SINGLE ITEM BY ID with stock summary
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, {
      include: [{ model: Category, as: 'category' }]
    });

    if (!item) {
      return fail(res, 'Item not found', 404);
    }

    // Total stock across all warehouses
    const totalStockResult = await StockLedger.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_stock']],
      where: { item_id: id },
      raw: true
    });
    const total_stock = Number(totalStockResult?.total_stock || 0);

    // Stock by warehouse
    const stockByWarehouse = await StockLedger.findAll({
      attributes: [
        'warehouse_id',
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'quantity']
      ],
      where: { item_id: id },
      include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_name'] }],
      group: ['StockLedger.warehouse_id', 'warehouse.warehouse_id'],
      raw: true
    });

    return ok(res, {
      item,
      total_stock,
      stock_by_warehouse: stockByWarehouse
    });
  } catch (error) {
    console.error('Get item by id error:', error);
    return fail(res, 'Failed to fetch item', 500);
  }
};

/**
 * UPDATE ITEM (Admin only)
 */
const updateItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      item_name,
      description,
      category_id,
      unit_of_measure,
      unit_price,
      reorder_point,
      safety_stock,
      lead_time_days,
      is_active
    } = req.body;

    const item = await Item.findByPk(id, { transaction: t });
    if (!item) {
      await t.rollback();
      return fail(res, 'Item not found', 404);
    }

    if (category_id) {
      const category = await Category.findByPk(category_id, { transaction: t });
      if (!category) {
        await t.rollback();
        return fail(res, 'Category not found', 404);
      }
    }

    if (unit_price !== undefined && Number(unit_price) <= 0) {
      await t.rollback();
      return fail(res, 'unit_price must be greater than 0', 400);
    }

    // Prevent SKU updates
    const updates = {
      item_name,
      description,
      category_id,
      unit_of_measure,
      unit_price,
      reorder_point,
      safety_stock,
      lead_time_days,
      is_active
    };
    delete updates.sku;

    await item.update(updates, { transaction: t });

    const updated = await Item.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
      transaction: t
    });

    await t.commit();
    return ok(res, updated, 'Item updated successfully');
  } catch (error) {
    await t.rollback();
    console.error('Update item error:', error);
    return fail(res, 'Failed to update item', 500);
  }
};

/**
 * DELETE ITEM (soft delete) - Admin only
 */
const deleteItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, { transaction: t });
    if (!item) {
      await t.rollback();
      return fail(res, 'Item not found', 404);
    }

    // Check stock
    const stockResult = await StockLedger.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_stock']],
      where: { item_id: id },
      transaction: t,
      raw: true
    });
    const totalStock = Number(stockResult?.total_stock || 0);
    if (totalStock > 0) {
      await t.rollback();
      return fail(res, 'Cannot delete item with existing stock', 400);
    }

    await item.update({ is_active: false }, { transaction: t });
    await t.commit();
    return ok(res, null, 'Item deactivated successfully');
  } catch (error) {
    await t.rollback();
    console.error('Delete item error:', error);
    return fail(res, 'Failed to delete item', 500);
  }
};

/**
 * GET ITEM STOCK SUMMARY
 */
const getItemStock = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, {
      include: [{ model: Category, as: 'category' }]
    });
    if (!item) {
      return fail(res, 'Item not found', 404);
    }

    // Total stock
    const totalStockResult = await StockLedger.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_stock']],
      where: { item_id: id },
      raw: true
    });
    const total_stock = Number(totalStockResult?.total_stock || 0);

    // Stock by warehouse
    const stock_by_warehouse = await StockLedger.findAll({
      attributes: [
        'warehouse_id',
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'quantity']
      ],
      where: { item_id: id },
      include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_name'] }],
      group: ['StockLedger.warehouse_id', 'warehouse.warehouse_id'],
      raw: true
    });

    // Batches for this item (if any)
    const batches = await Batch.findAll({
      where: { item_id: id },
      attributes: [
        'batch_id',
        'batch_number',
        'lot_number',
        'manufacturing_date',
        'expiry_date',
        'quantity',
        'available_qty',
        'status'
      ],
      order: [['expiry_date', 'ASC']]
    });

    // Allocated quantity not modeled separately yet; keep 0 placeholder
    const allocated_qty = 0;
    const available_qty = total_stock - allocated_qty;

    return ok(res, {
      item,
      total_stock,
      allocated_qty,
      available_qty,
      stock_by_warehouse,
      batches
    });
  } catch (error) {
    console.error('Get item stock error:', error);
    return fail(res, 'Failed to fetch item stock', 500);
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  getItemStock
};

