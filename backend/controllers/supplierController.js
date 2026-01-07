const { Op, fn, col, literal, Sequelize } = require('sequelize');
const {
  sequelize,
  Supplier,
  SupplierItem,
  SupplierRating,
  Item,
  Category,
  PurchaseOrder,
  POItem,
  GRN,
  GRNItem,
  User
} = require('../models');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const calculateSupplierRating = async (supplier_id) => {
  const ratings = await SupplierRating.findAll({
    where: { supplier_id },
    attributes: ['rating', 'createdAt'],
    order: [['createdAt', 'DESC']]
  });
  if (!ratings.length) return 0;
  // Recency-weighted average: weight = 1 / (index+1)
  let total = 0;
  let weightSum = 0;
  ratings.forEach((r, idx) => {
    const weight = 1 / (idx + 1);
    total += Number(r.rating || 0) * weight;
    weightSum += weight;
  });
  return weightSum ? Number((total / weightSum).toFixed(2)) : 0;
};

const calculateOnTimeDeliveryRate = async (supplier_id) => {
  const pos = await PurchaseOrder.findAll({
    where: { supplier_id, expected_delivery_date: { [Op.ne]: null }, actual_delivery_date: { [Op.ne]: null } },
    attributes: ['po_id', 'expected_delivery_date', 'actual_delivery_date']
  });
  if (!pos.length) return null;
  const onTime = pos.filter(po => new Date(po.actual_delivery_date) <= new Date(po.expected_delivery_date)).length;
  return Number(((onTime / pos.length) * 100).toFixed(2));
};

const calculateQualityAcceptanceRate = async (supplier_id) => {
  const grns = await GRN.findAll({
    where: { '$purchaseOrder.supplier_id$': supplier_id },
    include: [
      { model: GRNItem, as: 'grnItems' },
      { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_id', 'supplier_id'] }
    ]
  });
  let received = 0;
  let accepted = 0;
  grns.forEach(g => {
    (g.grnItems || []).forEach(gi => {
      received += Number(gi.received_qty || 0);
      accepted += Number(gi.accepted_qty || 0);
    });
  });
  if (received === 0) return null;
  return Number(((accepted / received) * 100).toFixed(2));
};

const checkCreditLimit = async (supplier_id, new_po_amount) => {
  const supplier = await Supplier.findByPk(supplier_id);
  if (!supplier || !supplier.credit_limit) return true;
  const outstanding = await PurchaseOrder.sum('total_amount', {
    where: {
      supplier_id,
      status: { [Op.in]: ['Issued', 'In-Transit'] }
    }
  }) || 0;
  return (Number(outstanding) + Number(new_po_amount || 0)) <= Number(supplier.credit_limit);
};

const calculateValueScore = (price, performance_rating, lead_time_days) => {
  const normPrice = price ? Math.max(0, Math.min(10, 10 - price / 1000)) : 5;
  const normRating = performance_rating ? (performance_rating / 5) * 10 : 5;
  const normLead = lead_time_days ? Math.max(0, Math.min(10, 10 - (lead_time_days / 30) * 10)) : 5;
  return Number(((normPrice * 0.4) + (normRating * 0.4) + (normLead * 0.2)).toFixed(2));
};

// ---------------------------------------------------------------------------
// Controller functions
// ---------------------------------------------------------------------------

// CREATE SUPPLIER
const createSupplier = async (req, res) => {
  try {
    const data = req.body;
    const existingName = await Supplier.findOne({ where: { supplier_name: data.supplier_name } });
    if (existingName) return fail(res, 'Supplier name already exists', 400);
    const existingEmail = data.email ? await Supplier.findOne({ where: { email: data.email } }) : null;
    if (existingEmail) return fail(res, 'Email already exists', 400);

    const supplier = await Supplier.create({
      supplier_name: data.supplier_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone,
      alternate_phone: data.alternate_phone || null,
      address: data.address,
      city: data.city || null,
      state: data.state || null,
      country: data.country || 'India',
      postal_code: data.postal_code || null,
      gstin: data.gstin || null,
      pan_number: data.pan_number || null,
      payment_terms_days: data.payment_terms_days || 30,
      avg_lead_time_days: data.avg_lead_time_days || 7,
      credit_limit: data.credit_limit || 0,
      bank_details: data.bank_details ? JSON.stringify(data.bank_details) : null,
      performance_rating: 0,
      is_active: data.is_active !== undefined ? data.is_active : true
    });

    return ok(res, supplier, 'Supplier created successfully', 201);
  } catch (error) {
    console.error('createSupplier error:', error);
    return fail(res, error.message || 'Failed to create supplier', 500);
  }
};

// GET ALL SUPPLIERS
const getAllSuppliers = async (req, res) => {
  try {
    const {
      is_active,
      city,
      min_rating,
      search,
      page = 1,
      limit = 20,
      sort = 'name'
    } = req.query;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
    if (city) where.city = city;
    if (min_rating) where.performance_rating = { [Op.gte]: Number(min_rating) };
    if (search) {
      const term = `%${search.toLowerCase()}%`;
      where[Op.or] = [
        sequelize.where(fn('LOWER', col('supplier_name')), { [Op.like]: term }),
        sequelize.where(fn('LOWER', col('contact_person')), { [Op.like]: term }),
        sequelize.where(fn('LOWER', col('email')), { [Op.like]: term })
      ];
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let order = [['supplier_name', 'ASC']];
    if (sort === 'rating') order = [['performance_rating', 'DESC']];
    if (sort === 'created_at') order = [['createdAt', 'DESC']];

    const { rows, count } = await Supplier.findAndCountAll({
      where,
      order,
      limit: parseInt(limit, 10),
      offset
    });

    // Enrich with metrics
    const suppliers = [];
    for (const s of rows) {
      const items_supplied_count = await SupplierItem.count({ where: { supplier_id: s.supplier_id } });
      const total_pos = await PurchaseOrder.count({ where: { supplier_id: s.supplier_id } });
      const total_business_value = await PurchaseOrder.sum('total_amount', { where: { supplier_id: s.supplier_id } }) || 0;
      const last_po = await PurchaseOrder.findOne({
        where: { supplier_id: s.supplier_id },
        order: [['po_date', 'DESC']]
      });
      const outstanding_amount = await PurchaseOrder.sum('total_amount', {
        where: { supplier_id: s.supplier_id, status: { [Op.in]: ['Issued', 'In-Transit'] } }
      }) || 0;
      const credit_utilization_pct = s.credit_limit && Number(s.credit_limit) > 0
        ? Number(((outstanding_amount / Number(s.credit_limit)) * 100).toFixed(2))
        : null;

      suppliers.push({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        contact_person: s.contact_person,
        email: s.email,
        phone: s.phone,
        city: s.city,
        state: s.state,
        payment_terms_days: s.payment_terms_days,
        avg_lead_time_days: s.avg_lead_time_days,
        performance_rating: Number(s.performance_rating),
        is_active: s.is_active,
        items_supplied_count,
        total_pos,
        total_business_value: Number(total_business_value),
        last_po_date: last_po ? last_po.po_date : null,
        outstanding_amount: Number(outstanding_amount),
        credit_utilization_pct,
        status: s.is_active ? 'Active - Good Standing' : 'Inactive'
      });
    }

    return ok(res, {
      suppliers,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)) || 1
      }
    }, 'Suppliers retrieved successfully');
  } catch (error) {
    console.error('getAllSuppliers error:', error);
    return fail(res, error.message || 'Failed to fetch suppliers', 500);
  }
};

// GET SUPPLIER BY ID
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    // Supplier items with pricing
    const supplierItems = await SupplierItem.findAll({
      where: { supplier_id: id },
      include: [{ model: Item, as: 'item', include: [{ model: Category, as: 'category', attributes: ['category_name'] }] }]
    });

    // Purchase orders (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const purchaseOrders = await PurchaseOrder.findAll({
      where: { supplier_id: id, po_date: { [Op.gte]: twelveMonthsAgo } },
      include: [{ model: POItem, as: 'poItems' }]
    });

    const total_pos = purchaseOrders.length;
    const completed_pos = purchaseOrders.filter(p => p.status === 'Completed').length;
    const cancelled_pos = purchaseOrders.filter(p => p.status === 'Cancelled').length;
    const on_time_rate = await calculateOnTimeDeliveryRate(id);

    // Quality acceptance from GRNs
    const quality_rate = await calculateQualityAcceptanceRate(id);

    // Avg actual lead time
    const leadTimes = purchaseOrders
      .filter(p => p.expected_delivery_date && p.actual_delivery_date)
      .map(p => (new Date(p.actual_delivery_date) - new Date(p.po_date)) / (1000 * 60 * 60 * 24));
    const avg_actual_lead_time = leadTimes.length ? Number((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(2)) : null;

    // Financial summary
    const total_business_lifetime = await PurchaseOrder.sum('total_amount', { where: { supplier_id: id } }) || 0;
    const business_last_12months = purchaseOrders.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
    const outstanding_amount = await PurchaseOrder.sum('total_amount', {
      where: { supplier_id: id, status: { [Op.in]: ['Issued', 'In-Transit'] } }
    }) || 0;
    const credit_available = supplier.credit_limit ? Number(supplier.credit_limit) - Number(outstanding_amount) : null;

    const ratings = await SupplierRating.findAll({
      where: { supplier_id: id },
      order: [['createdAt', 'DESC']]
    });
    const overall_rating = await calculateSupplierRating(id);

    const recent_pos = purchaseOrders
      .sort((a, b) => new Date(b.po_date) - new Date(a.po_date))
      .slice(0, 5)
      .map(po => ({
        po_id: po.po_id,
        po_number: po.po_number,
        po_date: po.po_date,
        total_amount: Number(po.total_amount || 0),
        status: po.status,
        expected_delivery: po.expected_delivery_date
      }));

    return ok(res, {
      supplier_id: supplier.supplier_id,
      supplier_name: supplier.supplier_name,
      contact_details: {
        contact_person: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        alternate_phone: supplier.alternate_phone
      },
      address_details: {
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        postal_code: supplier.postal_code
      },
      business_details: {
        gstin: supplier.gstin,
        pan_number: supplier.pan_number,
        payment_terms_days: supplier.payment_terms_days,
        avg_lead_time_days: supplier.avg_lead_time_days,
        credit_limit: supplier.credit_limit,
        bank_details: supplier.bank_details ? JSON.parse(supplier.bank_details) : null
      },
      items_supplied: supplierItems.map(si => ({
        supplier_item_id: si.supplier_item_id,
        item_id: si.item_id,
        sku: si.item?.sku,
        item_name: si.item?.item_name,
        unit_price: Number(si.unit_price),
        min_order_qty: si.min_order_qty,
        max_order_qty: si.max_order_qty,
        discount_percentage: si.discount_percentage,
        last_updated: si.last_updated,
        effective_from: si.effective_from,
        effective_to: si.effective_to,
        is_preferred: si.is_preferred
      })),
      performance_metrics: {
        overall_rating,
        total_pos,
        completed_pos,
        cancelled_pos,
        on_time_delivery_rate: on_time_rate,
        quality_acceptance_rate: quality_rate,
        avg_actual_lead_time,
        price_competitiveness: null,
        rating_breakdown: null
      },
      financial_summary: {
        total_business_lifetime: Number(total_business_lifetime),
        business_last_12months: Number(business_last_12months),
        outstanding_amount: Number(outstanding_amount),
        credit_limit: supplier.credit_limit,
        credit_available,
        payment_behavior: null,
        avg_payment_days: null
      },
      recent_pos,
      ratings,
      is_active: supplier.is_active,
      created_at: supplier.createdAt,
      updated_at: supplier.updatedAt
    }, 'Supplier details retrieved successfully');
  } catch (error) {
    console.error('getSupplierById error:', error);
    return fail(res, error.message || 'Failed to fetch supplier', 500);
  }
};

// UPDATE SUPPLIER
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const allowOverride = data.allow_override === true || data.allow_override === 'true';
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    // Check pending POs; allow admin override if explicitly requested
    const pendingPOs = await PurchaseOrder.count({
      where: { supplier_id: id, status: { [Op.in]: ['Issued', 'In-Transit'] } }
    });
    if (pendingPOs > 0 && !(allowOverride && req.user && req.user.role === 'Admin')) {
      return fail(res, 'Cannot update supplier with pending purchase orders', 400);
    }

    // Uniqueness checks
    if (data.supplier_name) {
      const existing = await Supplier.findOne({ where: { supplier_name: data.supplier_name, supplier_id: { [Op.ne]: id } } });
      if (existing) return fail(res, 'Supplier name already exists', 400);
    }
    if (data.email) {
      const existingEmail = await Supplier.findOne({ where: { email: data.email, supplier_id: { [Op.ne]: id } } });
      if (existingEmail) return fail(res, 'Email already exists', 400);
    }

    await supplier.update({
      ...data,
      bank_details: data.bank_details ? JSON.stringify(data.bank_details) : supplier.bank_details
    });

    return ok(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    console.error('updateSupplier error:', error);
    return fail(res, error.message || 'Failed to update supplier', 500);
  }
};

// DEACTIVATE SUPPLIER
const deactivateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    const pendingPOs = await PurchaseOrder.count({
      where: { supplier_id: id, status: { [Op.in]: ['Issued', 'In-Transit'] } }
    });
    if (pendingPOs > 0) {
      return fail(res, 'Cannot deactivate supplier with pending purchase orders', 400);
    }

    const outstanding = await PurchaseOrder.sum('total_amount', {
      where: { supplier_id: id, status: { [Op.in]: ['Issued', 'In-Transit'] } }
    }) || 0;
    if (outstanding > 0) {
      return fail(res, 'Cannot deactivate supplier with outstanding amounts', 400);
    }

    await supplier.update({ is_active: false });
    return ok(res, supplier, 'Supplier deactivated successfully');
  } catch (error) {
    console.error('deactivateSupplier error:', error);
    return fail(res, error.message || 'Failed to deactivate supplier', 500);
  }
};

// ADD SUPPLIER-ITEM PRICING
const addSupplierItemPricing = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { items } = req.body;
    const supplier = await Supplier.findByPk(id, { transaction });
    if (!supplier || !supplier.is_active) {
      await transaction.rollback();
      return fail(res, 'Supplier not found or inactive', 404);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return fail(res, 'items array is required', 400);
    }

    let itemsAdded = 0;
    let itemsUpdated = 0;
    const pricingDetails = [];

    for (const it of items) {
      const item = await Item.findByPk(it.item_id, { transaction });
      if (!item) {
        await transaction.rollback();
        return fail(res, `Item ${it.item_id} not found`, 404);
      }
      const existing = await SupplierItem.findOne({
        where: { supplier_id: id, item_id: it.item_id },
        transaction
      });

      const payload = {
        supplier_id: id,
        item_id: it.item_id,
        unit_price: it.unit_price,
        min_order_qty: it.min_order_qty || 1,
        max_order_qty: it.max_order_qty || null,
        discount_percentage: it.discount_percentage || 0,
        effective_from: it.effective_from || new Date(),
        effective_to: it.effective_to || null,
        is_preferred: it.is_preferred || false,
        last_updated: new Date()
      };

      if (existing) {
        await existing.update(payload, { transaction });
        itemsUpdated += 1;
        pricingDetails.push({ ...payload, supplier_item_id: existing.supplier_item_id, item_name: item.item_name, base_price: item.unit_price, discount: Number(item.unit_price || 0) - Number(it.unit_price || 0) });
      } else {
        const created = await SupplierItem.create(payload, { transaction });
        itemsAdded += 1;
        pricingDetails.push({ ...payload, supplier_item_id: created.supplier_item_id, item_name: item.item_name, base_price: item.unit_price, discount: Number(item.unit_price || 0) - Number(it.unit_price || 0) });
      }
    }

    await transaction.commit();
    return ok(res, {
      supplier_id: supplier.supplier_id,
      supplier_name: supplier.supplier_name,
      items_added: itemsAdded,
      items_updated: itemsUpdated,
      pricing_details: pricingDetails,
      total_items_now: await SupplierItem.count({ where: { supplier_id: id } })
    }, 'Supplier-item pricing added successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('addSupplierItemPricing error:', error);
    return fail(res, error.message || 'Failed to add supplier-item pricing', 500);
  }
};

// GET SUPPLIER PRICING
const getSupplierPricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_inactive } = req.query;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    const where = { supplier_id: id };
    if (include_inactive !== 'true') {
      where['$item.is_active$'] = true;
    }

    const items = await SupplierItem.findAll({
      where,
      include: [
        { model: Item, as: 'item', include: [{ model: Category, as: 'category', attributes: ['category_name'] }] }
      ],
      order: [['is_preferred', 'DESC'], ['unit_price', 'ASC']]
    });

    const summary = {
      total_items: items.length,
      avg_discount_percentage: items.length
        ? Number((items.reduce((sum, it) => sum + Number(it.discount_percentage || 0), 0) / items.length).toFixed(2))
        : 0,
      preferred_items: items.filter(i => i.is_preferred).length
    };

    return ok(res, {
      supplier: {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name
      },
      items: items.map(it => ({
        supplier_item_id: it.supplier_item_id,
        item_id: it.item_id,
        sku: it.item?.sku,
        item_name: it.item?.item_name,
        category_name: it.item?.category?.category_name || null,
        base_unit_price: it.item?.unit_price,
        supplier_unit_price: it.unit_price,
        discount_amount: it.item ? Number(it.item.unit_price || 0) - Number(it.unit_price || 0) : null,
        discount_percentage: it.discount_percentage,
        min_order_qty: it.min_order_qty,
        max_order_qty: it.max_order_qty,
        effective_from: it.effective_from,
        effective_to: it.effective_to,
        is_preferred: it.is_preferred,
        last_updated: it.last_updated
      })),
      summary
    }, 'Supplier pricing retrieved successfully');
  } catch (error) {
    console.error('getSupplierPricing error:', error);
    return fail(res, error.message || 'Failed to fetch supplier pricing', 500);
  }
};

// COMPARE SUPPLIER PRICING
const compareSupplierPricing = async (req, res) => {
  try {
    const { item_ids, item_id } = req.query;
    let ids = [];
    if (item_ids && Array.isArray(item_ids)) ids = item_ids;
    if (item_id) ids.push(item_id);
    if (!ids.length) return fail(res, 'item_id or item_ids[] is required', 400);

    const uniqueIds = [...new Set(ids.map(i => parseInt(i, 10)))];

    const items = [];
    for (const id of uniqueIds) {
      const item = await Item.findByPk(id);
      if (!item) continue;
      const supplierItems = await SupplierItem.findAll({
        where: { item_id: id },
        include: [{ model: Supplier, as: 'supplier' }]
      });
      const suppliers = supplierItems.map(si => ({
        supplier_id: si.supplier_id,
        supplier_name: si.supplier?.supplier_name,
        unit_price: Number(si.unit_price),
        discount_pct: Number(si.discount_percentage || 0),
        min_order_qty: si.min_order_qty,
        payment_terms_days: si.supplier?.payment_terms_days,
        avg_lead_time: si.supplier?.avg_lead_time_days,
        performance_rating: Number(si.supplier?.performance_rating || 0),
        value_score: calculateValueScore(Number(si.unit_price), Number(si.supplier?.performance_rating || 0), si.supplier?.avg_lead_time_days),
        is_preferred: si.is_preferred
      })).sort((a, b) => a.unit_price - b.unit_price);

      const bestPrice = suppliers.length ? suppliers[0] : null;
      const bestPerformance = suppliers.length ? suppliers.reduce((p, c) => (c.performance_rating > (p?.performance_rating || 0) ? c : p), null) : null;
      const bestValue = suppliers.length ? suppliers.reduce((p, c) => (c.value_score > (p?.value_score || 0) ? c : p), null) : null;

      items.push({
        item_id: item.item_id,
        item_name: item.item_name,
        base_unit_price: item.unit_price,
        suppliers,
        best_price_supplier: bestPrice ? `${bestPrice.supplier_name} (${bestPrice.unit_price})` : null,
        best_performance_supplier: bestPerformance ? `${bestPerformance.supplier_name} (${bestPerformance.performance_rating}/5)` : null,
        recommended_supplier: bestValue ? `${bestValue.supplier_name} (Value score ${bestValue.value_score})` : null
      });
    }

    return ok(res, { items }, 'Supplier pricing comparison completed');
  } catch (error) {
    console.error('compareSupplierPricing error:', error);
    return fail(res, error.message || 'Failed to compare pricing', 500);
  }
};

// RATE SUPPLIER PERFORMANCE
const rateSupplierPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { po_id, rating_type, rating, comments } = req.body;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    const newRating = await SupplierRating.create({
      supplier_id: id,
      po_id: po_id || null,
      rating_type,
      rating,
      comments: comments || null,
      rated_by: req.user.user_id
    });

    const overall = await calculateSupplierRating(id);
    await supplier.update({ performance_rating: overall });

    return ok(res, {
      rating: newRating,
      overall_rating: overall
    }, 'Supplier rated successfully', 201);
  } catch (error) {
    console.error('rateSupplierPerformance error:', error);
    return fail(res, error.message || 'Failed to rate supplier', 500);
  }
};

// GET SUPPLIER PERFORMANCE HISTORY
const getSupplierPerformanceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    const ratings = await SupplierRating.findAll({
      where: { supplier_id: id },
      include: [{ model: User, as: 'rater', attributes: ['user_id', 'full_name'] }],
      order: [['createdAt', 'DESC']]
    });

    return ok(res, {
      supplier: {
        supplier_id: supplier.supplier_id,
        supplier_name: supplier.supplier_name,
        performance_rating: supplier.performance_rating
      },
      ratings
    }, 'Supplier performance history retrieved successfully');
  } catch (error) {
    console.error('getSupplierPerformanceHistory error:', error);
    return fail(res, error.message || 'Failed to fetch performance history', 500);
  }
};

// SUPPLIER COMPARISON REPORT
const getSupplierComparisonReport = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ where: { is_active: true } });
    const comparison = [];
    for (const s of suppliers) {
      const total_business = await PurchaseOrder.sum('total_amount', { where: { supplier_id: s.supplier_id } }) || 0;
      const items_supplied = await SupplierItem.count({ where: { supplier_id: s.supplier_id } });
      const avg_discount = await SupplierItem.findAll({
        where: { supplier_id: s.supplier_id },
        attributes: [[fn('AVG', col('discount_percentage')), 'avg_discount']]
      });
      const on_time_rate = await calculateOnTimeDeliveryRate(s.supplier_id);
      const quality_rate = await calculateQualityAcceptanceRate(s.supplier_id);

      const overall_score = calculateValueScore(0, Number(s.performance_rating || 0), s.avg_lead_time_days || 7);
      comparison.push({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        overall_score,
        total_business: Number(total_business),
        items_supplied,
        avg_discount: Number(avg_discount?.[0]?.dataValues?.avg_discount || 0),
        performance_rating: Number(s.performance_rating || 0),
        on_time_rate,
        quality_rate,
        payment_terms: s.payment_terms_days,
        avg_lead_time: s.avg_lead_time_days,
        status: 'Preferred Supplier'
      });
    }

    // Rank by overall_score
    comparison.sort((a, b) => b.overall_score - a.overall_score);
    comparison.forEach((c, idx) => { c.rank = idx + 1; });

    return ok(res, {
      report_date: new Date().toISOString().split('T')[0],
      total_suppliers: suppliers.length,
      active_suppliers: suppliers.length,
      comparison
    }, 'Supplier comparison report generated');
  } catch (error) {
    console.error('getSupplierComparisonReport error:', error);
    return fail(res, error.message || 'Failed to generate comparison report', 500);
  }
};

// SET PREFERRED SUPPLIER
const setPreferredSupplier = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { item_ids, is_preferred, reason } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      await transaction.rollback();
      return fail(res, 'item_ids array is required', 400);
    }
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      await transaction.rollback();
      return fail(res, 'Supplier not found', 404);
    }

    for (const itemId of item_ids) {
      const existing = await SupplierItem.findOne({ where: { supplier_id: id, item_id: itemId }, transaction });
      if (!existing) {
        await transaction.rollback();
        return fail(res, `Supplier-item link not found for item ${itemId}`, 404);
      }
      if (is_preferred) {
        // Un-prefer others
        await SupplierItem.update({ is_preferred: false }, { where: { item_id: itemId }, transaction });
      }
      await existing.update({ is_preferred: !!is_preferred }, { transaction });
    }

    await transaction.commit();
    return ok(res, { supplier_id: id, item_ids, is_preferred, reason: reason || null }, 'Preferred supplier updated');
  } catch (error) {
    await transaction.rollback();
    console.error('setPreferredSupplier error:', error);
    return fail(res, error.message || 'Failed to update preferred supplier', 500);
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier,
  addSupplierItemPricing,
  getSupplierPricing,
  compareSupplierPricing,
  rateSupplierPerformance,
  getSupplierPerformanceHistory,
  getSupplierComparisonReport,
  setPreferredSupplier,
  // helpers
  calculateSupplierRating,
  calculateOnTimeDeliveryRate,
  calculateQualityAcceptanceRate,
  checkCreditLimit,
  calculateValueScore
};

