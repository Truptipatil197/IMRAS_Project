const { ReorderRule, Item, Warehouse, User, Category } = require('../models');
const { Op } = require('sequelize');

/**
 * Helper function to check if user has required role
 */
const checkRole = (user, allowedRoles) => {
  return user && allowedRoles.includes(user.role);
};

/**
 * Get all reorder rules with filters
 * GET /api/reorder/rules
 * Query params: itemId, warehouseId, active, priorityLevel, page, limit
 */
exports.getAllRules = async (req, res) => {
  try {
    const { 
      item_id, 
      warehouse_id, 
      active, 
      priority_level,
      reorder_formula,
      page = 1, 
      limit = 50,
      search 
    } = req.query;

    const whereClause = {};
    
    if (item_id) whereClause.item_id = parseInt(item_id);
    if (warehouse_id) whereClause.warehouse_id = warehouse_id === 'null' ? null : parseInt(warehouse_id);
    if (active !== undefined) whereClause.active = active === 'true';
    if (priority_level) whereClause.priority_level = priority_level;
    if (reorder_formula) whereClause.reorder_formula = reorder_formula;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const itemWhere = {};
    if (search) {
      itemWhere[Op.or] = [
        { item_name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows: rules, count } = await ReorderRule.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['item_id', 'item_name', 'sku', 'reorder_point', 'safety_stock', 'lead_time_days'],
          where: Object.keys(itemWhere).length > 0 ? itemWhere : undefined,
          required: true
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'username', 'email'],
          required: false
        }
      ],
      order: [
        ['priority_level', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      success: true,
      data: rules,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reorder rules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reorder rules',
      error: error.message
    });
  }
};

/**
 * Get single reorder rule by ID
 * GET /api/reorder/rules/:id
 */
exports.getRuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await ReorderRule.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          include: [{ model: Category, as: 'category' }]
        },
        {
          model: Warehouse,
          as: 'warehouse',
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'username', 'email'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['user_id', 'username', 'email'],
          required: false
        }
      ]
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Reorder rule not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error fetching reorder rule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reorder rule',
      error: error.message
    });
  }
};

/**
 * Create new reorder rule
 * POST /api/reorder/rules
 */
exports.createRule = async (req, res) => {
  try {
    const {
      item_id,
      warehouse_id,
      reorder_formula,
      auto_generate_pr,
      approval_required,
      lead_time_buffer,
      priority_level,
      min_order_quantity,
      max_order_quantity,
      order_multiple,
      seasonal_multiplier,
      custom_reorder_point,
      custom_safety_stock,
      eoq_parameters,
      active
    } = req.body;

    // Validate item exists
    const item = await Item.findByPk(item_id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Validate warehouse if provided
    if (warehouse_id) {
      const warehouse = await Warehouse.findByPk(warehouse_id);
      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }
    }

    // Check for duplicate rule
    const existingRule = await ReorderRule.findOne({
      where: {
        item_id,
        warehouse_id: warehouse_id || null,
        active: true
      }
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: 'Active reorder rule already exists for this item/warehouse combination'
      });
    }

    // Create rule
    const rule = await ReorderRule.create({
      item_id,
      warehouse_id: warehouse_id || null,
      reorder_formula: reorder_formula || 'dynamic',
      auto_generate_pr: auto_generate_pr !== undefined ? auto_generate_pr : true,
      approval_required: approval_required !== undefined ? approval_required : true,
      lead_time_buffer: lead_time_buffer || 0,
      priority_level: priority_level || 'medium',
      min_order_quantity,
      max_order_quantity,
      order_multiple: order_multiple || 1,
      seasonal_multiplier: seasonal_multiplier || 1.0,
      custom_reorder_point,
      custom_safety_stock,
      eoq_parameters,
      active: active !== undefined ? active : true,
      created_by: req.user.user_id
    });

    // Fetch with associations
    const createdRule = await ReorderRule.findByPk(rule.rule_id, {
      include: [
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse', required: false }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Reorder rule created successfully',
      data: createdRule
    });
  } catch (error) {
    console.error('Error creating reorder rule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create reorder rule',
      error: error.message
    });
  }
};

/**
 * Update reorder rule
 * PUT /api/reorder/rules/:id
 */
exports.updateRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rule = await ReorderRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Reorder rule not found'
      });
    }

    // Update fields
    updateData.updated_by = req.user.user_id;
    await rule.update(updateData);

    // Fetch updated rule with associations
    const updatedRule = await ReorderRule.findByPk(id, {
      include: [
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse', required: false }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Reorder rule updated successfully',
      data: updatedRule
    });
  } catch (error) {
    console.error('Error updating reorder rule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update reorder rule',
      error: error.message
    });
  }
};

/**
 * Delete reorder rule
 * DELETE /api/reorder/rules/:id
 */
exports.deleteRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await ReorderRule.findByPk(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Reorder rule not found'
      });
    }

    // Soft delete - deactivate instead of removing
    await rule.update({ active: false, updated_by: req.user.user_id });

    return res.status(200).json({
      success: true,
      message: 'Reorder rule deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting reorder rule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete reorder rule',
      error: error.message
    });
  }
};

/**
 * Bulk create/update reorder rules
 * POST /api/reorder/rules/bulk
 */
exports.bulkCreateRules = async (req, res) => {
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rules array'
      });
    }

    const created = [];
    const errors = [];

    for (const ruleData of rules) {
      try {
        // Add creator
        ruleData.created_by = req.user.user_id;
        
        const rule = await ReorderRule.create(ruleData);
        created.push(rule);
      } catch (error) {
        errors.push({
          itemId: ruleData.item_id,
          error: error.message
        });
      }
    }

    return res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      message: `Created ${created.length} rules, ${errors.length} failed`,
      data: {
        created,
        errors
      }
    });
  } catch (error) {
    console.error('Error bulk creating reorder rules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk create reorder rules',
      error: error.message
    });
  }
};

/**
 * Get rules by category
 * GET /api/reorder/rules/category/:categoryId
 */
exports.getRulesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const rules = await ReorderRule.findAll({
      include: [{
        model: Item,
        as: 'item',
        where: { category_id: parseInt(categoryId) },
        include: [{ model: Category, as: 'category' }],
        required: true
      }],
      where: { active: true }
    });

    return res.status(200).json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Error fetching rules by category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rules by category',
      error: error.message
    });
  }
};
