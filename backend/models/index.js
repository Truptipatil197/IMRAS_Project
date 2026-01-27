/**
 * Purpose:
 * This file serves as the central hub for the IMRAS data models. 
 * It imports all Sequelize model definitions and establishes the complex relationships (associations) between them.
 *
 * Responsibility:
 * Model aggregation, database association definition (One-to-Many, Many-to-Many), 
 * and providing a unified sync function to initialize the database schema.
 *
 * Fit:
 * Core of the data layer that ensures referential integrity and provides a clean API for controllers to interact with data.
 */

const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Category = require('./Category');
const Item = require('./Item');
const Warehouse = require('./Warehouse');
const Location = require('./Location');
const Supplier = require('./Supplier');
const SupplierItem = require('./SupplierItem');
const SupplierRating = require('./SupplierRating');
const PurchaseRequisition = require('./PurchaseRequisition');
const PRItem = require('./PRItem');
const PurchaseOrder = require('./PurchaseOrder');
const POItem = require('./POItem');
const GRN = require('./GRN');
const GRNItem = require('./GRNItem');
const Batch = require('./Batch');
const StockLedger = require('./StockLedger');
const ReorderRule = require('./ReorderRule');
const ReorderHistory = require('./ReorderHistory');
const ReorderLog = require('./ReorderLog');
const Alert = require('./Alert');
const BatchDisposal = require('./BatchDisposal');
const SchedulerLog = require('./SchedulerLog');
const ReorderQueue = require('./ReorderQueue');

// ============================================
// ASSOCIATIONS
// ============================================

// User Associations
User.hasMany(PurchaseRequisition, {
  foreignKey: 'requested_by',
  as: 'requestedRequisitions'
});

User.hasMany(PurchaseRequisition, {
  foreignKey: 'approved_by',
  as: 'approvedRequisitions'
});

User.hasMany(PurchaseOrder, {
  foreignKey: 'created_by',
  as: 'createdPurchaseOrders'
});

User.hasMany(GRN, {
  foreignKey: 'received_by',
  as: 'receivedGRNs'
});

User.hasMany(StockLedger, {
  foreignKey: 'created_by',
  as: 'createdStockLedgers'
});

User.hasMany(Alert, {
  foreignKey: 'assigned_to',
  as: 'assignedAlerts'
});

User.hasMany(ReorderRule, {
  foreignKey: 'created_by',
  as: 'createdReorderRules'
});

User.hasMany(ReorderRule, {
  foreignKey: 'updated_by',
  as: 'updatedReorderRules'
});

User.hasMany(SchedulerLog, {
  foreignKey: 'triggered_by_user_id',
  as: 'triggeredSchedulerLogs'
});

User.hasMany(ReorderHistory, {
  foreignKey: 'triggered_by',
  as: 'triggeredReorderHistory'
});

// Category Associations
Category.hasMany(Item, {
  foreignKey: 'category_id',
  as: 'items'
});

// Item Associations
Item.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

Item.hasMany(SupplierItem, {
  foreignKey: 'item_id',
  as: 'supplierItems'
});

Item.hasMany(PRItem, {
  foreignKey: 'item_id',
  as: 'prItems'
});

Item.hasMany(POItem, {
  foreignKey: 'item_id',
  as: 'poItems'
});

Item.hasMany(GRNItem, {
  foreignKey: 'item_id',
  as: 'grnItems'
});

Item.hasMany(Batch, {
  foreignKey: 'item_id',
  as: 'batches'
});

Item.hasMany(StockLedger, {
  foreignKey: 'item_id',
  as: 'stockLedgers'
});

Item.hasMany(ReorderRule, {
  foreignKey: 'item_id',
  as: 'reorderRules'
});

Item.hasMany(Alert, {
  foreignKey: 'item_id',
  as: 'alerts'
});

Item.hasMany(ReorderQueue, {
  foreignKey: 'item_id',
  as: 'reorderQueues'
});

// Warehouse Associations
Warehouse.hasMany(Location, {
  foreignKey: 'warehouse_id',
  as: 'locations'
});

Warehouse.hasMany(GRN, {
  foreignKey: 'warehouse_id',
  as: 'grns'
});

Warehouse.hasMany(StockLedger, {
  foreignKey: 'warehouse_id',
  as: 'stockLedgers'
});

Warehouse.hasMany(ReorderRule, {
  foreignKey: 'warehouse_id',
  as: 'reorderRules'
});

Warehouse.hasMany(Alert, {
  foreignKey: 'warehouse_id',
  as: 'alerts'
});

Warehouse.hasMany(ReorderQueue, {
  foreignKey: 'warehouse_id',
  as: 'reorderQueues'
});

// Location Associations
Location.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

Location.hasMany(StockLedger, {
  foreignKey: 'location_id',
  as: 'stockLedgers'
});

// Supplier Associations
Supplier.hasMany(SupplierItem, {
  foreignKey: 'supplier_id',
  as: 'supplierItems'
});

Supplier.hasMany(PurchaseOrder, {
  foreignKey: 'supplier_id',
  as: 'purchaseOrders'
});

Supplier.hasMany(SupplierRating, {
  foreignKey: 'supplier_id',
  as: 'supplierRatings'
});

// SupplierItem Associations
SupplierItem.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

SupplierItem.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

SupplierRating.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

SupplierRating.belongsTo(User, {
  foreignKey: 'rated_by',
  as: 'rater'
});

SupplierRating.belongsTo(PurchaseOrder, {
  foreignKey: 'po_id',
  as: 'purchaseOrder'
});

// PurchaseRequisition Associations
PurchaseRequisition.belongsTo(User, {
  foreignKey: 'requested_by',
  as: 'requester'
});

PurchaseRequisition.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approver'
});

PurchaseRequisition.hasMany(PRItem, {
  foreignKey: 'pr_id',
  as: 'prItems'
});

PurchaseRequisition.hasMany(PurchaseOrder, {
  foreignKey: 'pr_id',
  as: 'purchaseOrders'
});

PurchaseRequisition.hasMany(ReorderQueue, {
  foreignKey: 'pr_id',
  as: 'reorderQueues'
});

// PRItem Associations
PRItem.belongsTo(PurchaseRequisition, {
  foreignKey: 'pr_id',
  as: 'purchaseRequisition'
});

PRItem.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

// PurchaseOrder Associations
PurchaseOrder.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

PurchaseOrder.belongsTo(PurchaseRequisition, {
  foreignKey: 'pr_id',
  as: 'purchaseRequisition'
});

PurchaseOrder.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

PurchaseOrder.hasMany(POItem, {
  foreignKey: 'po_id',
  as: 'poItems'
});

PurchaseOrder.hasMany(GRN, {
  foreignKey: 'po_id',
  as: 'grns'
});

// POItem Associations
POItem.belongsTo(PurchaseOrder, {
  foreignKey: 'po_id',
  as: 'purchaseOrder'
});

POItem.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

// GRN Associations
GRN.belongsTo(PurchaseOrder, {
  foreignKey: 'po_id',
  as: 'purchaseOrder'
});

GRN.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

GRN.belongsTo(User, {
  foreignKey: 'received_by',
  as: 'receiver'
});

GRN.hasMany(GRNItem, {
  foreignKey: 'grn_id',
  as: 'grnItems'
});

// GRNItem Associations
GRNItem.belongsTo(GRN, {
  foreignKey: 'grn_id',
  as: 'grn'
});

GRNItem.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

GRNItem.hasMany(Batch, {
  foreignKey: 'grn_item_id',
  as: 'batches'
});

// Batch Associations
Batch.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

Batch.belongsTo(GRNItem, {
  foreignKey: 'grn_item_id',
  as: 'grnItem'
});

Batch.hasMany(StockLedger, {
  foreignKey: 'batch_id',
  as: 'stockLedgers'
});

Batch.hasMany(BatchDisposal, {
  foreignKey: 'batch_id',
  as: 'disposals'
});

BatchDisposal.belongsTo(Batch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

BatchDisposal.belongsTo(User, {
  foreignKey: 'disposed_by',
  as: 'disposer'
});

// StockLedger Associations
StockLedger.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

StockLedger.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

StockLedger.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});

StockLedger.belongsTo(Batch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

StockLedger.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// ReorderRule Associations
ReorderRule.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

ReorderRule.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

ReorderRule.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

ReorderRule.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updater'
});

// Alert Associations
Alert.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

Alert.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

Alert.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignedUser'
});

Alert.belongsTo(Batch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

Alert.hasMany(ReorderQueue, {
  foreignKey: 'alert_id',
  as: 'reorderQueues'
});

// SchedulerLog Associations
SchedulerLog.belongsTo(User, {
  foreignKey: 'triggered_by_user_id',
  as: 'triggeredByUser'
});

SchedulerLog.hasMany(ReorderQueue, {
  foreignKey: 'scheduler_log_id',
  as: 'reorderQueues'
});

// ReorderQueue Associations
ReorderQueue.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

ReorderQueue.belongsTo(Warehouse, {
  foreignKey: 'warehouse_id',
  as: 'warehouse'
});

ReorderQueue.belongsTo(PurchaseRequisition, {
  foreignKey: 'pr_id',
  as: 'purchaseRequisition'
});

ReorderQueue.belongsTo(Alert, {
  foreignKey: 'alert_id',
  as: 'alert'
});

ReorderQueue.belongsTo(SchedulerLog, {
  foreignKey: 'scheduler_log_id',
  as: 'schedulerLog'
});

// ReorderHistory Associations
ReorderHistory.belongsTo(User, {
  foreignKey: 'triggered_by',
  as: 'triggeredBy'
});

ReorderHistory.hasMany(ReorderLog, {
  foreignKey: 'run_id',
  as: 'logs'
});

// ReorderLog Associations
ReorderLog.belongsTo(ReorderHistory, {
  foreignKey: 'run_id',
  as: 'run'
});

ReorderLog.belongsTo(Item, {
  foreignKey: 'item_id',
  as: 'item'
});

// ============================================
// SYNC FUNCTION
// ============================================

/**
 * Sync all models with database
 * @param {Object} options - Sequelize sync options
 * @returns {Promise}
 */
const syncModels = async (options = {}) => {
  const defaultOptions = {
    alter: false,
    force: false,
    ...options
  };

  try {
    await sequelize.sync(defaultOptions);
    console.log('✅ All models synchronized successfully.');
    return true;
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
    throw error;
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  sequelize,
  // Models
  User,
  Category,
  Item,
  Warehouse,
  Location,
  Supplier,
  SupplierItem,
  SupplierRating,
  PurchaseRequisition,
  PRItem,
  PurchaseOrder,
  POItem,
  GRN,
  GRNItem,
  Batch,
  BatchDisposal,
  StockLedger,
  ReorderRule,
  ReorderHistory,
  ReorderLog,
  Alert,
  BatchDisposal,
  SchedulerLog,
  ReorderQueue,
  // Utility functions
  syncModels
};


