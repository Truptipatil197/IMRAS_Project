const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Warehouse, Location, StockLedger, Item } = require('../models');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// CREATE WAREHOUSE (Admin)
const createWarehouse = async (req, res) => {
  try {
    const { warehouse_name, address, city, contact_person, phone, is_active = true } = req.body;

    const exists = await Warehouse.findOne({ where: { warehouse_name } });
    if (exists) return fail(res, 'Warehouse name already exists', 400);

    const warehouse = await Warehouse.create({
      warehouse_name,
      address,
      city,
      contact_person,
      phone,
      is_active
    });

    return ok(res, warehouse, 'Warehouse created successfully', 201);
  } catch (error) {
    console.error('Create warehouse error:', error);
    return fail(res, 'Failed to create warehouse', 500);
  }
};

// GET ALL WAREHOUSES with location count and optional stock value
const getAllWarehouses = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const warehouses = await Warehouse.findAll({
      where,
      attributes: {
        include: [[fn('COUNT', col('locations.location_id')), 'location_count']]
      },
      include: [
        {
          model: Location,
          as: 'locations',
          attributes: []
        }
      ],
      group: ['Warehouse.warehouse_id'],
      order: [['warehouse_name', 'ASC']],
      subQuery: false
    });

    // Calculate total stock value (quantity * unit_price) per warehouse
    const stockValues = await StockLedger.findAll({
      attributes: [
        'warehouse_id',
      [fn('SUM', literal('quantity * `item`.`unit_price`')), 'stock_value']
      ],
      include: [{ model: Item, as: 'item', attributes: [] }],
      group: ['warehouse_id'],
      raw: true
    });
    const valueMap = {};
    stockValues.forEach(sv => {
      valueMap[sv.warehouse_id] = Number(sv.stock_value || 0);
    });

    const data = warehouses.map(w => ({
      ...w.toJSON(),
      total_stock_value: valueMap[w.warehouse_id] || 0
    }));

    return ok(res, data, 'Warehouses fetched successfully');
  } catch (error) {
    console.error('Get warehouses error:', error);
    return fail(res, 'Failed to fetch warehouses', 500);
  }
};

// GET WAREHOUSE BY ID with locations and stock summary
const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id, {
      include: [{ model: Location, as: 'locations' }]
    });
    if (!warehouse) return fail(res, 'Warehouse not found', 404);

    // Stock summary
    const stockSummary = await StockLedger.findOne({
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('item_id'))), 'total_items'],
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_quantity']
      ],
      where: { warehouse_id: id },
      raw: true
    });

    return ok(res, {
      ...warehouse.toJSON(),
      stock_summary: {
        total_items: Number(stockSummary?.total_items || 0),
        total_quantity: Number(stockSummary?.total_quantity || 0)
      }
    });
  } catch (error) {
    console.error('Get warehouse by id error:', error);
    return fail(res, 'Failed to fetch warehouse', 500);
  }
};

// UPDATE WAREHOUSE (Admin)
const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_name, address, city, contact_person, phone, is_active } = req.body;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return fail(res, 'Warehouse not found', 404);

    if (warehouse_name && warehouse_name !== warehouse.warehouse_name) {
      const exists = await Warehouse.findOne({
        where: { warehouse_name, warehouse_id: { [Op.ne]: id } }
      });
      if (exists) return fail(res, 'Warehouse name already exists', 400);
    }

    await warehouse.update({
      warehouse_name,
      address,
      city,
      contact_person,
      phone,
      is_active
    });

    return ok(res, warehouse, 'Warehouse updated successfully');
  } catch (error) {
    console.error('Update warehouse error:', error);
    return fail(res, 'Failed to update warehouse', 500);
  }
};

// DELETE WAREHOUSE (soft) - Admin
const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return fail(res, 'Warehouse not found', 404);

    // Check stock
    const stock = await StockLedger.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_stock']],
      where: { warehouse_id: id },
      raw: true
    });
    if (Number(stock?.total_stock || 0) > 0) {
      return fail(res, 'Cannot delete warehouse with existing stock', 400);
    }

    // Check locations
    const locationCount = await Location.count({ where: { warehouse_id: id } });
    if (locationCount > 0) {
      return fail(res, 'Cannot delete warehouse with existing locations', 400);
    }

    await warehouse.update({ is_active: false });
    return ok(res, null, 'Warehouse deactivated successfully');
  } catch (error) {
    console.error('Delete warehouse error:', error);
    return fail(res, 'Failed to delete warehouse', 500);
  }
};

module.exports = {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
};

