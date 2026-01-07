const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validator');

const {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  getItemStock
} = require('../controllers/inventoryController');

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
} = require('../controllers/warehouseController');

const {
  createLocation,
  getAllLocations,
  getLocationById,
  getLocationsByWarehouse,
  updateLocation,
  deleteLocation
} = require('../controllers/locationController');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Validators
const itemCreateValidators = [
  body('item_name').isLength({ min: 2 }).withMessage('item_name required (min 2 chars)'),
  body('unit_price').isFloat({ gt: 0 }).withMessage('unit_price must be > 0'),
  body('category_id').isInt().withMessage('category_id is required and must be integer'),
  body('sku').optional().isAlphanumeric().withMessage('sku must be alphanumeric'),
  body('unit_of_measure').notEmpty().withMessage('unit_of_measure is required')
];

const itemUpdateValidators = [
  body('item_name').optional().isLength({ min: 2 }).withMessage('item_name min 2 chars'),
  body('unit_price').optional().isFloat({ gt: 0 }).withMessage('unit_price must be > 0'),
  body('category_id').optional().isInt().withMessage('category_id must be integer'),
  body('sku').not().exists().withMessage('sku cannot be updated'),
  body('unit_of_measure').optional().notEmpty().withMessage('unit_of_measure required')
];

const categoryCreateValidators = [
  body('category_name').isLength({ min: 2 }).withMessage('category_name must be at least 2 chars')
];
const categoryUpdateValidators = [
  body('category_name').optional().isLength({ min: 2 }).withMessage('category_name must be at least 2 chars')
];

const warehouseCreateValidators = [
  body('warehouse_name').isLength({ min: 2 }).withMessage('warehouse_name must be at least 2 chars'),
  body('phone').optional().isMobilePhone().withMessage('phone must be a valid phone number')
];
const warehouseUpdateValidators = [
  body('warehouse_name').optional().isLength({ min: 2 }).withMessage('warehouse_name must be at least 2 chars'),
  body('phone').optional().isMobilePhone().withMessage('phone must be a valid phone number')
];

const locationCreateValidators = [
  body('warehouse_id').isInt().withMessage('warehouse_id is required and must be integer'),
  body('location_code').optional().isLength({ min: 3 }).withMessage('location_code min 3 chars'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('capacity must be >= 0')
];
const locationUpdateValidators = [
  body('location_code').optional().isLength({ min: 3 }).withMessage('location_code min 3 chars'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('capacity must be >= 0'),
  body('warehouse_id').not().exists().withMessage('warehouse_id cannot be changed')
];

// ITEM ROUTES
router.post('/items', isAdmin, itemCreateValidators, validate, createItem);
router.get('/items', getAllItems);
router.get('/items/:id', param('id').isInt(), validate, getItemById);
router.put('/items/:id', isAdmin, param('id').isInt(), itemUpdateValidators, validate, updateItem);
router.delete('/items/:id', isAdmin, param('id').isInt(), validate, deleteItem);
router.get('/items/:id/stock', param('id').isInt(), validate, getItemStock);

// CATEGORY ROUTES
router.post('/categories', isAdmin, categoryCreateValidators, validate, createCategory);
router.get('/categories', getAllCategories);
router.get('/categories/:id', param('id').isInt(), validate, getCategoryById);
router.put('/categories/:id', isAdmin, param('id').isInt(), categoryUpdateValidators, validate, updateCategory);
router.delete('/categories/:id', isAdmin, param('id').isInt(), validate, deleteCategory);

// WAREHOUSE ROUTES
router.post('/warehouses', isAdmin, warehouseCreateValidators, validate, createWarehouse);
router.get('/warehouses', getAllWarehouses);
router.get('/warehouses/:id', param('id').isInt(), validate, getWarehouseById);
router.put('/warehouses/:id', isAdmin, param('id').isInt(), warehouseUpdateValidators, validate, updateWarehouse);
router.delete('/warehouses/:id', isAdmin, param('id').isInt(), validate, deleteWarehouse);

// LOCATION ROUTES
router.post('/locations', isAdmin, locationCreateValidators, validate, createLocation);
router.get('/locations', getAllLocations);
router.get('/locations/:id', param('id').isInt(), validate, getLocationById);
router.get('/locations/warehouse/:warehouseId', param('warehouseId').isInt(), validate, getLocationsByWarehouse);
router.put('/locations/:id', isAdmin, param('id').isInt(), locationUpdateValidators, validate, updateLocation);
router.delete('/locations/:id', isAdmin, param('id').isInt(), validate, deleteLocation);

module.exports = router;

