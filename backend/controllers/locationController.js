const { Op, fn, col } = require('sequelize');
const { sequelize, Location, Warehouse, StockLedger, Item } = require('../models');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// Helper to generate location code
const buildLocationCode = ({ warehouse_id, aisle = 'A', rack = 'R', bin = 'B' }) =>
  `WH${warehouse_id}-${aisle || 'A'}-${rack || 'R'}-${bin || 'B'}`;

// CREATE LOCATION (Admin)
const createLocation = async (req, res) => {
  try {
    const { warehouse_id, aisle, rack, bin, location_code, capacity } = req.body;

    const warehouse = await Warehouse.findByPk(warehouse_id);
    if (!warehouse) return fail(res, 'Warehouse not found', 404);

    const finalCode =
      location_code && location_code.trim().length > 0
        ? location_code
        : buildLocationCode({ warehouse_id, aisle, rack, bin });

    const exists = await Location.findOne({ where: { location_code: finalCode } });
    if (exists) return fail(res, 'location_code already exists', 400);

    const location = await Location.create({
      warehouse_id,
      aisle,
      rack,
      bin,
      location_code: finalCode,
      capacity
    });

    const result = await Location.findByPk(location.location_id, {
      include: [{ model: Warehouse, as: 'warehouse' }]
    });

    return ok(res, result, 'Location created successfully', 201);
  } catch (error) {
    console.error('Create location error:', error);
    return fail(res, 'Failed to create location', 500);
  }
};

// GET ALL LOCATIONS with occupancy
const getAllLocations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { warehouse_id } = req.query;

    const where = {};
    if (warehouse_id) where.warehouse_id = warehouse_id;

    const { rows, count } = await Location.findAndCountAll({
      where,
      include: [{ model: Warehouse, as: 'warehouse' }],
      order: [
        ['warehouse_id', 'ASC'],
        ['aisle', 'ASC'],
        ['rack', 'ASC'],
        ['bin', 'ASC']
      ],
      limit,
      offset
    });

    // Occupancy per location
    const occupancyRows = await StockLedger.findAll({
      attributes: ['location_id', [fn('COALESCE', fn('SUM', col('quantity')), 0), 'qty']],
      where: warehouse_id ? { warehouse_id } : {},
      group: ['location_id'],
      raw: true
    });
    const occMap = {};
    occupancyRows.forEach(r => (occMap[r.location_id] = Number(r.qty || 0)));

    const data = rows.map(loc => {
      const occupancy = occMap[loc.location_id] || 0;
      const available_capacity =
        loc.capacity !== null && loc.capacity !== undefined
          ? Math.max(loc.capacity - occupancy, 0)
          : null;
      return {
        ...loc.toJSON(),
        occupancy,
        available_capacity
      };
    });

    return ok(res, {
      locations: data,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit) || 1
    });
  } catch (error) {
    console.error('Get locations error:', error);
    return fail(res, 'Failed to fetch locations', 500);
  }
};

// GET LOCATION BY ID
const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findByPk(id, {
      include: [{ model: Warehouse, as: 'warehouse' }]
    });
    if (!location) return fail(res, 'Location not found', 404);

    // Items stored in this location
    const items = await StockLedger.findAll({
      attributes: [
        'item_id',
        [fn('COALESCE', fn('SUM', col('quantity')), 0), 'quantity']
      ],
      where: { location_id: id },
      include: [{ model: Item, as: 'item', attributes: ['item_name', 'sku'] }],
      group: ['item_id', 'item.item_id'],
      raw: true
    });

    const occupancy = items.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const capacity = location.capacity;
    const occupancy_percentage =
      capacity && capacity > 0 ? Math.min((occupancy / capacity) * 100, 100) : null;

    return ok(res, {
      ...location.toJSON(),
      items,
      occupancy,
      occupancy_percentage
    });
  } catch (error) {
    console.error('Get location by id error:', error);
    return fail(res, 'Failed to fetch location', 500);
  }
};

// GET LOCATIONS BY WAREHOUSE
const getLocationsByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const locations = await Location.findAll({
      where: { warehouse_id: warehouseId },
      order: [
        ['aisle', 'ASC'],
        ['rack', 'ASC'],
        ['bin', 'ASC']
      ]
    });

    // occupancy per location
    const occupancyRows = await StockLedger.findAll({
      attributes: ['location_id', [fn('COALESCE', fn('SUM', col('quantity')), 0), 'qty']],
      where: { warehouse_id: warehouseId },
      group: ['location_id'],
      raw: true
    });
    const occMap = {};
    occupancyRows.forEach(r => (occMap[r.location_id] = Number(r.qty || 0)));

    const data = locations.map(loc => ({
      ...loc.toJSON(),
      occupancy: occMap[loc.location_id] || 0
    }));

    return ok(res, data, 'Locations fetched successfully');
  } catch (error) {
    console.error('Get locations by warehouse error:', error);
    return fail(res, 'Failed to fetch locations', 500);
  }
};

// UPDATE LOCATION (Admin)
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { aisle, rack, bin, location_code, capacity, warehouse_id } = req.body;

    const location = await Location.findByPk(id);
    if (!location) return fail(res, 'Location not found', 404);

    if (warehouse_id && Number(warehouse_id) !== location.warehouse_id) {
      return fail(res, 'warehouse_id cannot be changed', 400);
    }

    if (location_code && location_code !== location.location_code) {
      const exists = await Location.findOne({
        where: { location_code, location_id: { [Op.ne]: id } }
      });
      if (exists) return fail(res, 'location_code already exists', 400);
    }

    await location.update({ aisle, rack, bin, location_code, capacity });

    const updated = await Location.findByPk(id, {
      include: [{ model: Warehouse, as: 'warehouse' }]
    });
    return ok(res, updated, 'Location updated successfully');
  } catch (error) {
    console.error('Update location error:', error);
    return fail(res, 'Failed to update location', 500);
  }
};

// DELETE LOCATION (Admin)
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const location = await Location.findByPk(id);
    if (!location) return fail(res, 'Location not found', 404);

    // Check stock
    const stock = await StockLedger.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'qty']],
      where: { location_id: id },
      raw: true
    });
    if (Number(stock?.qty || 0) > 0) {
      return fail(res, 'Cannot delete location with existing stock', 400);
    }

    await location.destroy();
    return ok(res, null, 'Location deleted successfully');
  } catch (error) {
    console.error('Delete location error:', error);
    return fail(res, 'Failed to delete location', 500);
  }
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  getLocationsByWarehouse,
  updateLocation,
  deleteLocation
};

