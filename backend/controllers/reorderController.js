const { Op, fn, col, literal, where: sequelizeWhere } = require('sequelize');
const {
  sequelize,
  Item,
  Category,
  Warehouse,
  StockLedger,
  Alert,
  PurchaseRequisition,
  PRItem,
  PurchaseOrder,
  POItem,
  Supplier,
  SupplierItem,
  GRN,
  GRNItem,
  User
} = require('../models');
const { sendPRApprovalNotification, sendPRRejectionNotification, sendPOCreatedNotification, sendReorderAlertNotification } = require('../utils/notifications');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

const findManagerOrAdmin = async () => {
  const manager = await User.findOne({
    where: { role: { [Op.in]: ['Manager', 'Admin'] }, is_active: true },
    order: [['role', 'ASC']]
  });
  return manager;
};

const calculateReorderQuantity = (current_stock, reorder_point, safety_stock) => {
  const recommended = (reorder_point + safety_stock) - current_stock;
  const minimum = reorder_point;
  return Math.max(minimum, recommended > 0 ? recommended : minimum);
};

const generateSequenceNumber = async (prefix, model, field, transaction) => {
  const year = new Date().getFullYear();
  const latest = await model.findOne({
    where: sequelizeWhere(fn('YEAR', col('created_at')), year),
    order: [[field, 'DESC']],
    transaction
  });

  let next = 1;
  if (latest && latest[field]) {
    const match = latest[field].match(/(\d{4})(\d{5})$/);
    if (match && parseInt(match[1], 10) === year) {
      next = parseInt(match[2], 10) + 1;
    }
  }

  return `${prefix}${year}${String(next).padStart(5, '0')}`;
};

const generatePRNumber = async (transaction) => {
  return generateSequenceNumber('PR', PurchaseRequisition, 'pr_number', transaction);
};

const generatePONumber = async (transaction) => {
  return generateSequenceNumber('PO', PurchaseOrder, 'po_number', transaction);
};

const getSupplierPricing = async (supplier_id, item_id) => {
  const pricing = await SupplierItem.findOne({
    where: { supplier_id, item_id }
  });
  return pricing ? Number(pricing.unit_price) : null;
};

const checkPOCompletion = async (po_id, transaction) => {
  const poItems = await POItem.findAll({ where: { po_id }, transaction });
  const grns = await GRN.findAll({
    where: { po_id },
    include: [{ model: GRNItem, as: 'grnItems' }],
    transaction
  });

  const receivedMap = {};
  for (const grn of grns) {
    for (const item of grn.grnItems || []) {
      receivedMap[item.item_id] = (receivedMap[item.item_id] || 0) + Number(item.accepted_qty || item.received_qty || 0);
    }
  }

  let orderedTotal = 0;
  let receivedTotal = 0;
  for (const poItem of poItems) {
    const ordered = Number(poItem.ordered_qty || 0);
    orderedTotal += ordered;
    const rec = receivedMap[poItem.item_id] || 0;
    receivedTotal += Math.min(rec, ordered);
  }

  const completionPct = orderedTotal > 0 ? Math.min(100, (receivedTotal / orderedTotal) * 100) : 0;
  let status = 'Issued';
  if (receivedTotal > 0 && receivedTotal < orderedTotal) status = 'In-Transit';
  if (orderedTotal > 0 && receivedTotal >= orderedTotal) status = 'Completed';

  return { completionPct, orderedTotal, receivedTotal, status };
};

const getCurrentStockMaps = async (transaction = null) => {
  const latestPerWarehouse = await StockLedger.findAll({
    attributes: [
      'item_id',
      'warehouse_id',
      [fn('MAX', col('ledger_id')), 'latest_ledger_id']
    ],
    group: ['item_id', 'warehouse_id'],
    raw: true,
    transaction
  });

  if (!latestPerWarehouse.length) {
    return { stockMap: {}, perWarehouse: {} };
  }

  const ledgerIds = latestPerWarehouse.map(l => l.latest_ledger_id);
  const latestLedgers = await StockLedger.findAll({
    where: { ledger_id: { [Op.in]: ledgerIds } },
    include: [{ model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }],
    transaction
  });

  const stockMap = {};
  const perWarehouse = {};
  for (const ledger of latestLedgers) {
    const qty = Number(ledger.balance_qty || 0);
    stockMap[ledger.item_id] = (stockMap[ledger.item_id] || 0) + qty;
    if (!perWarehouse[ledger.item_id]) perWarehouse[ledger.item_id] = [];
    perWarehouse[ledger.item_id].push({
      warehouse_id: ledger.warehouse_id,
      warehouse_name: ledger.warehouse ? ledger.warehouse.warehouse_name : null,
      current_stock: qty
    });
  }

  return { stockMap, perWarehouse };
};

const getCurrentStockForItem = async (item_id, transaction = null) => {
  const { stockMap } = await getCurrentStockMaps(transaction);
  return stockMap[item_id] || 0;
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

const checkReorderPoints = async (req, res) => {
  try {
    const items = await Item.findAll({
      where: { is_active: true },
      attributes: ['item_id', 'sku', 'item_name', 'reorder_point', 'safety_stock', 'unit_price']
    });

    const { stockMap, perWarehouse } = await getCurrentStockMaps();
    const manager = await findManagerOrAdmin();

    let itemsNeedingReorder = 0;
    let criticalItems = 0;
    let alertsCreated = 0;
    const itemsResponse = [];

    for (const item of items) {
      const currentStock = stockMap[item.item_id] || 0;
      if (currentStock <= item.reorder_point) {
        itemsNeedingReorder += 1;
        const status = currentStock < item.safety_stock ? 'Critical Stock' : 'Below Reorder Point';
        const urgency = currentStock < item.safety_stock ? 'Critical' : 'Medium';
        if (currentStock < item.safety_stock) criticalItems += 1;

        const recommended_order_qty = calculateReorderQuantity(
          currentStock,
          item.reorder_point,
          item.safety_stock
        );

        // Pick warehouse with lowest stock for alert context
        const warehouses = perWarehouse[item.item_id] || [];
        let selectedWarehouseId = null;
        if (warehouses.length > 0) {
          warehouses.sort((a, b) => a.current_stock - b.current_stock);
          selectedWarehouseId = warehouses[0].warehouse_id;
        }

        const existingAlert = await Alert.findOne({
          where: {
            item_id: item.item_id,
            alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] },
            is_read: false
          }
        });

        if (!existingAlert) {
          await Alert.create({
            alert_type: status === 'Critical Stock' ? 'Critical Stock' : 'Reorder',
            severity: urgency,
            item_id: item.item_id,
            warehouse_id: selectedWarehouseId,
            message: `Item ${item.item_name} stock is ${currentStock}, below reorder point of ${item.reorder_point}`,
            assigned_to: manager ? manager.user_id : null
          });
          alertsCreated += 1;
        }

        itemsResponse.push({
          item_id: item.item_id,
          sku: item.sku,
          item_name: item.item_name,
          current_stock: currentStock,
          reorder_point: item.reorder_point,
          safety_stock: item.safety_stock,
          recommended_order_qty,
          status,
          urgency
        });
      }
    }

    if (alertsCreated > 0 && manager) {
      await sendReorderAlertNotification(null, manager.email);
    }

    return ok(res, {
      items_needing_reorder: itemsNeedingReorder,
      critical_items: criticalItems,
      alerts_created: alertsCreated,
      items: itemsResponse
    }, 'Reorder check completed');
  } catch (error) {
    console.error('checkReorderPoints error:', error);
    return fail(res, 'Failed to check reorder points', 500);
  }
};

const getReorderAlerts = async (req, res) => {
  try {
    const { severity, is_read, assigned_to, warehouse_id } = req.query;
    const whereClause = {
      alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] }
    };
    if (severity) whereClause.severity = severity;
    if (is_read !== undefined) whereClause.is_read = is_read === 'true';
    if (assigned_to) whereClause.assigned_to = parseInt(assigned_to, 10);
    if (warehouse_id) whereClause.warehouse_id = parseInt(warehouse_id, 10);

    const alerts = await Alert.findAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['item_id', 'sku', 'item_name', 'category_id', 'reorder_point', 'safety_stock'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['category_name'],
              required: false
            }
          ]
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name'],
          required: false
        }
      ],
      order: [
        [literal(`CASE severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`), 'ASC'],
        ['created_at', 'DESC']
      ]
    });

    const { stockMap } = await getCurrentStockMaps();
    const unread_count = await Alert.count({ where: { ...whereClause, is_read: false } });
    const critical_count = await Alert.count({ where: { ...whereClause, severity: 'Critical' } });

    const alertPayload = alerts.map(a => {
      const createdAt = new Date(a.createdAt);
      const days_pending = Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const currentStock = stockMap[a.item_id] || 0;
      const recommended_order_qty = calculateReorderQuantity(
        currentStock,
        a.item ? a.item.reorder_point : 0,
        a.item ? a.item.safety_stock : 0
      );

      return {
        alert_id: a.alert_id,
        alert_type: a.alert_type,
        severity: a.severity,
        is_read: a.is_read,
        created_at: a.createdAt,
        item: a.item ? {
          item_id: a.item.item_id,
          sku: a.item.sku,
          item_name: a.item.item_name,
          category_id: a.item.category_id,
          category_name: a.item.category ? a.item.category.category_name : null,
          reorder_point: a.item.reorder_point,
          safety_stock: a.item.safety_stock,
          current_stock: currentStock
        } : null,
        warehouse: a.warehouse ? {
          warehouse_id: a.warehouse.warehouse_id,
          warehouse_name: a.warehouse.warehouse_name
        } : null,
        recommended_order_qty,
        days_pending
      };
    });

    return ok(res, {
      unread_count,
      critical_count,
      alerts: alertPayload
    }, 'Reorder alerts retrieved successfully');
  } catch (error) {
    console.error('getReorderAlerts error:', error);
    return fail(res, 'Failed to fetch reorder alerts', 500);
  }
};

const markAlertAsRead = async (req, res) => {
  try {
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      return fail(res, 'Access denied. Manager or Admin role required.', 403);
    }

    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    if (!alert) {
      return fail(res, 'Alert not found', 404);
    }

    await alert.update({ is_read: true });
    return ok(res, alert, 'Alert marked as read');
  } catch (error) {
    console.error('markAlertAsRead error:', error);
    return fail(res, 'Failed to update alert', 500);
  }
};

const createPurchaseRequisition = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { pr_date, remarks, items = [], alert_id = null } = req.body;
    if (!items.length) {
      await transaction.rollback();
      return fail(res, 'items array must contain at least one item', 400);
    }

    const pr_number = await generatePRNumber(transaction);
    const requesterId = req.user.user_id;
    const { stockMap } = await getCurrentStockMaps(transaction);

    const pr = await PurchaseRequisition.create({
      pr_number,
      pr_date,
      requested_by: requesterId,
      status: 'Pending',
      remarks: remarks || null
    }, { transaction });

    for (const item of items) {
      const { item_id, requested_qty, justification } = item;
      if (!requested_qty || requested_qty <= 0) {
        await transaction.rollback();
        return fail(res, 'requested_qty must be a positive integer', 400);
      }

      const itemModel = await Item.findByPk(item_id, { transaction });
      if (!itemModel) {
        await transaction.rollback();
        return fail(res, `Item ${item_id} not found`, 404);
      }

      const currentStock = stockMap[item_id] || 0;
      const recommendedQty = calculateReorderQuantity(
        currentStock,
        itemModel.reorder_point,
        itemModel.safety_stock
      );

      if (requested_qty > recommendedQty && !justification) {
        await transaction.rollback();
        return fail(res, `justification required when requesting more than recommended for item ${item_id}`, 400);
      }

      await PRItem.create({
        pr_id: pr.pr_id,
        item_id,
        requested_qty,
        justification: justification || 'Stock below reorder point'
      }, { transaction });
    }

    if (alert_id) {
      const alert = await Alert.findByPk(alert_id, { transaction });
      if (alert) {
        await alert.update({ is_read: true }, { transaction });
      }
    }

    const created = await PurchaseRequisition.findByPk(pr.pr_id, {
      include: [
        { model: PRItem, as: 'prItems', include: [{ model: Item, as: 'item' }] },
        { model: User, as: 'requester', attributes: ['user_id', 'full_name', 'email'] }
      ],
      transaction
    });

    await transaction.commit();
    return ok(res, created, 'Purchase Requisition created successfully', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('createPurchaseRequisition error:', error);
    return fail(res, error.message || 'Failed to create purchase requisition', 500);
  }
};

const getAllPurchaseRequisitions = async (req, res) => {
  try {
    const {
      status,
      requested_by,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (requested_by) whereClause.requested_by = parseInt(requested_by, 10);
    if (start_date || end_date) {
      whereClause.pr_date = {};
      if (start_date) whereClause.pr_date[Op.gte] = start_date;
      if (end_date) whereClause.pr_date[Op.lte] = end_date;
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { rows, count } = await PurchaseRequisition.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'requester', attributes: ['user_id', 'full_name'] },
        { model: User, as: 'approver', attributes: ['user_id', 'full_name'], required: false },
        { model: PRItem, as: 'prItems', include: [{ model: Item, as: 'item', attributes: ['unit_price'] }] }
      ],
      order: [['pr_date', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    const mapped = rows.map(pr => {
      const itemsCount = pr.prItems ? pr.prItems.length : 0;
      const totalEstimated = pr.prItems.reduce((sum, i) => sum + (Number(i.item?.unit_price || 0) * Number(i.requested_qty || 0)), 0);
      const daysPending = pr.status === 'Pending'
        ? Math.ceil((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        pr_id: pr.pr_id,
        pr_number: pr.pr_number,
        pr_date: pr.pr_date,
        status: pr.status,
        requester: pr.requester,
        approver: pr.approver,
        items_count: itemsCount,
        total_estimated_value: totalEstimated,
        days_pending: daysPending
      };
    });

    return ok(res, {
      purchase_requisitions: mapped,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)) || 1
      }
    }, 'Purchase Requisitions retrieved successfully');
  } catch (error) {
    console.error('getAllPurchaseRequisitions error:', error);
    return fail(res, 'Failed to fetch purchase requisitions', 500);
  }
};

const getPurchaseRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const pr = await PurchaseRequisition.findByPk(id, {
      include: [
        { model: User, as: 'requester', attributes: ['user_id', 'full_name', 'email'] },
        { model: User, as: 'approver', attributes: ['user_id', 'full_name'], required: false },
        {
          model: PRItem,
          as: 'prItems',
          include: [{ model: Item, as: 'item', attributes: ['item_id', 'item_name', 'sku', 'unit_price', 'reorder_point', 'safety_stock'] }]
        }
      ]
    });

    if (!pr) {
      return fail(res, 'Purchase Requisition not found', 404);
    }

    const { stockMap } = await getCurrentStockMaps();
    const items = pr.prItems.map(prItem => {
      const lineTotal = Number(prItem.item.unit_price || 0) * Number(prItem.requested_qty || 0);
      return {
        pr_item_id: prItem.pr_item_id,
        item: prItem.item,
        requested_qty: prItem.requested_qty,
        justification: prItem.justification,
        current_stock: stockMap[prItem.item_id] || 0,
        line_total: lineTotal
      };
    });

    const totalEstimated = items.reduce((sum, i) => sum + i.line_total, 0);

    return ok(res, {
      pr_id: pr.pr_id,
      pr_number: pr.pr_number,
      pr_date: pr.pr_date,
      status: pr.status,
      remarks: pr.remarks,
      requester: pr.requester,
      approver: pr.approver,
      items,
      total_estimated_value: totalEstimated,
      approved_date: pr.approved_date
    }, 'Purchase Requisition retrieved successfully');
  } catch (error) {
    console.error('getPurchaseRequisitionById error:', error);
    return fail(res, 'Failed to fetch purchase requisition', 500);
  }
};

const approvePurchaseRequisition = async (req, res) => {
  try {
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      return fail(res, 'Access denied. Manager or Admin role required.', 403);
    }

    const { id } = req.params;
    const { approval_remarks } = req.body;

    const pr = await PurchaseRequisition.findByPk(id, {
      include: [{ model: User, as: 'requester', attributes: ['email', 'full_name'] }]
    });
    if (!pr) {
      return fail(res, 'Purchase Requisition not found', 404);
    }
    if (pr.status !== 'Pending') {
      return fail(res, 'Only pending PRs can be approved', 400);
    }

    await pr.update({
      status: 'Approved',
      approved_by: req.user.user_id,
      approved_date: new Date(),
      remarks: approval_remarks || pr.remarks
    });

    if (pr.requester?.email) {
      await sendPRApprovalNotification(pr.pr_id, pr.requester.email);
    }

    return ok(res, pr, 'Purchase Requisition approved');
  } catch (error) {
    console.error('approvePurchaseRequisition error:', error);
    return fail(res, 'Failed to approve purchase requisition', 500);
  }
};

const rejectPurchaseRequisition = async (req, res) => {
  try {
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      return fail(res, 'Access denied. Manager or Admin role required.', 403);
    }

    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.length < 10) {
      return fail(res, 'rejection_reason is required (min 10 chars)', 400);
    }

    const pr = await PurchaseRequisition.findByPk(id, {
      include: [{ model: User, as: 'requester', attributes: ['email', 'full_name'] }]
    });
    if (!pr) {
      return fail(res, 'Purchase Requisition not found', 404);
    }
    if (pr.status !== 'Pending') {
      return fail(res, 'Only pending PRs can be rejected', 400);
    }

    await pr.update({
      status: 'Rejected',
      approved_by: req.user.user_id,
      approved_date: new Date(),
      remarks: rejection_reason
    });

    if (pr.requester?.email) {
      await sendPRRejectionNotification(pr.pr_id, pr.requester.email, rejection_reason);
    }

    return ok(res, pr, 'Purchase Requisition rejected');
  } catch (error) {
    console.error('rejectPurchaseRequisition error:', error);
    return fail(res, 'Failed to reject purchase requisition', 500);
  }
};

const createPurchaseOrderFromPR = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      await transaction.rollback();
      return fail(res, 'Access denied. Manager or Admin role required.', 403);
    }

    const { prId } = req.params;
    const { supplier_id, expected_delivery_date } = req.body;

    const pr = await PurchaseRequisition.findByPk(prId, {
      include: [{ model: PRItem, as: 'prItems', include: [{ model: Item, as: 'item' }] }],
      transaction
    });
    if (!pr) {
      await transaction.rollback();
      return fail(res, 'Purchase Requisition not found', 404);
    }
    if (pr.status !== 'Approved') {
      await transaction.rollback();
      return fail(res, 'PR must be approved before creating PO', 400);
    }

    const existingPO = await PurchaseOrder.findOne({ where: { pr_id: prId }, transaction });
    if (existingPO) {
      await transaction.rollback();
      return fail(res, 'PO already exists for this PR', 400);
    }

    const supplier = await Supplier.findByPk(supplier_id, { transaction });
    if (!supplier || !supplier.is_active) {
      await transaction.rollback();
      return fail(res, 'Supplier not found or inactive', 400);
    }

    const expectedDate = new Date(expected_delivery_date);
    if (isNaN(expectedDate.getTime()) || expectedDate <= new Date()) {
      await transaction.rollback();
      return fail(res, 'expected_delivery_date must be a future date', 400);
    }

    const po_number = await generatePONumber(transaction);
    const po = await PurchaseOrder.create({
      po_number,
      po_date: new Date(),
      supplier_id,
      pr_id: pr.pr_id,
      status: 'Issued',
      expected_delivery_date,
      total_amount: 0,
      created_by: req.user.user_id
    }, { transaction });

    let totalAmount = 0;
    for (const prItem of pr.prItems) {
      const pricing = await getSupplierPricing(supplier_id, prItem.item_id);
      const unitPrice = pricing !== null ? pricing : Number(prItem.item.unit_price || 0);
      if (pricing === null && !prItem.item.unit_price) {
        await transaction.rollback();
        return fail(res, `No pricing available for item ${prItem.item_id}`, 400);
      }

      const poItem = await POItem.create({
        po_id: po.po_id,
        item_id: prItem.item_id,
        ordered_qty: prItem.requested_qty,
        unit_price: unitPrice,
        total_price: Number(unitPrice) * Number(prItem.requested_qty || 0)
      }, { transaction });

      totalAmount += Number(poItem.total_price || 0);
    }

    await po.update({ total_amount: totalAmount }, { transaction });
    await transaction.commit();

    const created = await PurchaseOrder.findByPk(po.po_id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: POItem, as: 'poItems', include: [{ model: Item, as: 'item' }] }
      ]
    });

    if (supplier.email) {
      await sendPOCreatedNotification(po.po_id, supplier.email);
    }

    return ok(res, created, 'Purchase Order created from PR', 201);
  } catch (error) {
    await transaction.rollback();
    console.error('createPurchaseOrderFromPR error:', error);
    return fail(res, error.message || 'Failed to create purchase order', 500);
  }
};

const getPurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findByPk(id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseRequisition, as: 'purchaseRequisition' },
        { model: POItem, as: 'poItems', include: [{ model: Item, as: 'item' }] },
        { model: GRN, as: 'grns', include: [{ model: GRNItem, as: 'grnItems' }] }
      ]
    });

    if (!po) {
      return fail(res, 'Purchase Order not found', 404);
    }

    const receivedMap = {};
    for (const grn of po.grns || []) {
      for (const gi of grn.grnItems || []) {
        receivedMap[gi.item_id] = (receivedMap[gi.item_id] || 0) + Number(gi.accepted_qty || gi.received_qty || 0);
      }
    }

    const items = po.poItems.map(pi => {
      const receivedQty = receivedMap[pi.item_id] || 0;
      const pendingQty = Math.max(0, Number(pi.ordered_qty || 0) - receivedQty);
      return {
        po_item_id: pi.po_item_id,
        item: pi.item,
        ordered_qty: pi.ordered_qty,
        received_qty: receivedQty,
        pending_qty: pendingQty,
        unit_price: pi.unit_price,
        total_price: pi.total_price
      };
    });

    const { completionPct, status: derivedStatus } = await checkPOCompletion(po.po_id);
    const status = po.status === 'Completed' ? 'Completed' : derivedStatus;
    if (status === 'Completed' && po.status !== 'Completed') {
      await po.update({ status });
    }
    const daysSinceCreation = Math.ceil((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilDelivery = po.expected_delivery_date
      ? Math.ceil((new Date(po.expected_delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return ok(res, {
      po_id: po.po_id,
      po_number: po.po_number,
      status,
      supplier: po.supplier,
      purchase_requisition: po.purchaseRequisition,
      items,
      total_amount: po.total_amount,
      completion_percentage: completionPct,
      grns: po.grns,
      days_since_created: daysSinceCreation,
      days_until_expected_delivery: daysUntilDelivery
    }, 'Purchase Order status retrieved');
  } catch (error) {
    console.error('getPurchaseOrderStatus error:', error);
    return fail(res, 'Failed to fetch purchase order status', 500);
  }
};

const getReorderDashboard = async (req, res) => {
  try {
    const { stockMap } = await getCurrentStockMaps();
    const items = await Item.findAll({ where: { is_active: true } });

    let good = 0; let low = 0; let critical = 0; let out = 0;
    for (const item of items) {
      const stock = stockMap[item.item_id] || 0;
      if (stock === 0) out += 1;
      else if (stock < item.safety_stock) critical += 1;
      else if (stock < item.reorder_point) low += 1;
      else good += 1;
    }

    const totalItems = items.length || 1;
    const alertsUnread = await Alert.count({ where: { is_read: false, alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } } });
    const alertsCritical = await Alert.count({ where: { severity: 'Critical', alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } } });
    const itemsBelowSafety = critical;

    const pendingPRs = await PurchaseRequisition.count({ where: { status: 'Pending' } });
    const approvedAwaitingPO = await PurchaseRequisition.count({
      where: { status: 'Approved', '$purchaseOrders.po_id$': null },
      include: [{ model: PurchaseOrder, as: 'purchaseOrders', attributes: [], required: false }],
      distinct: true
    });
    const rejectedPRs = await PurchaseRequisition.count({ where: { status: 'Rejected' } });

    const activePOs = await PurchaseOrder.count({ where: { status: { [Op.in]: ['Issued', 'In-Transit'] } } });
    const pendingReceipt = await PurchaseOrder.count({ where: { status: { [Op.in]: ['Issued', 'In-Transit'] } } });
    const today = new Date().toISOString().split('T')[0];
    const overdueDeliveries = await PurchaseOrder.count({
      where: {
        expected_delivery_date: { [Op.lt]: today },
        status: { [Op.ne]: 'Completed' }
      }
    });

    const recentAlerts = await Alert.findAll({
      where: { alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } },
      order: [['created_at', 'DESC']],
      limit: 5
    });
    const recentPRs = await PurchaseRequisition.findAll({ order: [['created_at', 'DESC']], limit: 5 });
    const recentPOs = await PurchaseOrder.findAll({ order: [['created_at', 'DESC']], limit: 5 });

    return ok(res, {
      alerts: {
        total_unread: alertsUnread,
        critical_count: alertsCritical,
        items_below_safety_stock: itemsBelowSafety
      },
      purchase_requisitions: {
        pending_count: pendingPRs,
        approved_awaiting_po: approvedAwaitingPO,
        rejected_count: rejectedPRs
      },
      purchase_orders: {
        active_pos: activePOs,
        pending_receipt: pendingReceipt,
        overdue_deliveries: overdueDeliveries
      },
      stock_health: {
        good_stock_pct: Math.round((good / totalItems) * 100),
        low_stock_pct: Math.round((low / totalItems) * 100),
        critical_stock_pct: Math.round((critical / totalItems) * 100),
        out_of_stock_pct: Math.round((out / totalItems) * 100)
      },
      recent_alerts: recentAlerts,
      recent_prs: recentPRs,
      recent_pos: recentPOs
    }, 'Reorder dashboard data retrieved');
  } catch (error) {
    console.error('getReorderDashboard error:', error);
    return fail(res, 'Failed to fetch reorder dashboard', 500);
  }
};

module.exports = {
  checkReorderPoints,
  getReorderAlerts,
  markAlertAsRead,
  createPurchaseRequisition,
  getAllPurchaseRequisitions,
  getPurchaseRequisitionById,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  createPurchaseOrderFromPR,
  getPurchaseOrderStatus,
  getReorderDashboard,
  // helpers for potential reuse/testing
  calculateReorderQuantity,
  generatePRNumber,
  generatePONumber,
  getSupplierPricing,
  checkPOCompletion
};

