const { fn, col, Op } = require('sequelize');
const { StockLedger } = require('../models');

/**
 * Robust stock calculation using SUM(quantity) from StockLedgers.
 * This is the system's single source of truth for current stock.
 * 
 * @param {Object} options - Filtering options
 * @param {number} [options.item_id] - Filter by item
 * @param {number} [options.warehouse_id] - Filter by warehouse
 * @param {number} [options.location_id] - Filter by location
 * @param {number} [options.batch_id] - Filter by batch
 * @param {Object} [transaction] - Sequelize transaction
 * @returns {Promise<number>} Current stock quantity
 */
const getCurrentStock = async (options = {}, transaction = null) => {
    const { item_id, warehouse_id, location_id, batch_id } = options;

    const where = {};
    if (item_id) where.item_id = item_id;
    if (warehouse_id) where.warehouse_id = warehouse_id;
    if (location_id) where.location_id = location_id;
    if (batch_id) where.batch_id = batch_id;

    const result = await StockLedger.findOne({
        attributes: [
            [fn('COALESCE', fn('SUM', col('quantity')), 0), 'total_stock']
        ],
        where,
        raw: true,
        transaction
    });

    return parseFloat(result.total_stock || 0);
};

/**
 * Get current stock for all items, optionally filtered by warehouse.
 * Returns a map of item_id -> stock.
 * 
 * @param {number} [warehouse_id] - Optional warehouse filter
 * @param {Object} [transaction] - Sequelize transaction
 * @returns {Promise<Object>} Map of item_id to current_stock
 */
const getAllItemsStock = async (warehouse_id = null, transaction = null) => {
    const where = {};
    if (warehouse_id) where.warehouse_id = warehouse_id;

    const results = await StockLedger.findAll({
        attributes: [
            'item_id',
            [fn('COALESCE', fn('SUM', col('quantity')), 0), 'current_stock']
        ],
        where,
        group: ['item_id'],
        raw: true,
        transaction
    });

    const stockMap = {};
    results.forEach(r => {
        stockMap[r.item_id] = parseFloat(r.current_stock || 0);
    });

    return stockMap;
};

module.exports = {
    getCurrentStock,
    getAllItemsStock
};
