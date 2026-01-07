const { Op, fn, col } = require('sequelize');
const { sequelize, Category, Item } = require('../models');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// CREATE CATEGORY (Admin)
const createCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    const existing = await Category.findOne({ where: { category_name } });
    if (existing) return fail(res, 'Category name already exists', 400);

    const category = await Category.create({ category_name, description });
    return ok(res, category, 'Category created successfully', 201);
  } catch (error) {
    console.error('Create category error:', error);
    return fail(res, 'Failed to create category', 500);
  }
};

// GET ALL CATEGORIES with item count
const getAllCategories = async (_req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: {
        include: [[fn('COUNT', col('items.item_id')), 'item_count']]
      },
      include: [{ model: Item, as: 'items', attributes: [] }],
      group: ['Category.category_id'],
      order: [['category_name', 'ASC']]
    });

    return ok(res, categories, 'Categories fetched successfully');
  } catch (error) {
    console.error('Get categories error:', error);
    return fail(res, 'Failed to fetch categories', 500);
  }
};

// GET CATEGORY BY ID with items
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id, {
      include: [{ model: Item, as: 'items' }]
    });
    if (!category) return fail(res, 'Category not found', 404);
    return ok(res, category, 'Category fetched successfully');
  } catch (error) {
    console.error('Get category by id error:', error);
    return fail(res, 'Failed to fetch category', 500);
  }
};

// UPDATE CATEGORY (Admin)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    const category = await Category.findByPk(id);
    if (!category) return fail(res, 'Category not found', 404);

    if (category_name && category_name !== category.category_name) {
      const exists = await Category.findOne({
        where: { category_name, category_id: { [Op.ne]: id } }
      });
      if (exists) return fail(res, 'Category name already exists', 400);
    }

    await category.update({ category_name, description });
    return ok(res, category, 'Category updated successfully');
  } catch (error) {
    console.error('Update category error:', error);
    return fail(res, 'Failed to update category', 500);
  }
};

// DELETE CATEGORY (Admin)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id, {
      include: [{ model: Item, as: 'items', attributes: ['item_id'] }]
    });
    if (!category) return fail(res, 'Category not found', 404);

    if (category.items && category.items.length > 0) {
      return fail(res, 'Cannot delete category with existing items', 400);
    }

    await category.destroy();
    return ok(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    return fail(res, 'Failed to delete category', 500);
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};

