const { Op, fn, col, literal, Sequelize } = require('sequelize');
const {
  sequelize,
  Item,
  Category,
  StockLedger,
  Warehouse,
  Batch,
  GRN,
  GRNItem,
  Supplier,
  SupplierItem,
  SupplierRating,
  PurchaseOrder
} = require('../models');
const { getCurrentStock, getAllItemsStock } = require('../utils/stockUtils');

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });
const fail = (res, message, status = 400, data = null) =>
  res.status(status).json({ success: false, message, data });

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

const classifyABCCategory = (cumulativePercentage) => {
  if (cumulativePercentage <= 80) return 'A';
  if (cumulativePercentage <= 95) return 'B';
  return 'C';
};

const calculateInventoryValue = (stockQty, unitPrice) => Number((Number(stockQty || 0) * Number(unitPrice || 0)).toFixed(2));

const getItemConsumption = async (item_id, start_date, end_date, warehouse_id = null) => {
  const where = {
    item_id,
    transaction_type: 'Issue'
  };
  if (start_date || end_date) where.transaction_date = {};
  if (start_date) where.transaction_date[Op.gte] = start_date;
  if (end_date) where.transaction_date[Op.lte] = end_date;
  if (warehouse_id) where.warehouse_id = warehouse_id;

  const totalIssued = await StockLedger.sum('quantity', { where });
  return Math.abs(Number(totalIssued || 0));
};

const calculateAverageStock = async (item_id, start_date, end_date, warehouse_id = null) => {
  // Opening: latest ledger before start_date
  const opening = await StockLedger.findOne({
    where: {
      item_id,
      ...(warehouse_id ? { warehouse_id } : {}),
      transaction_date: { [Op.lt]: start_date }
    },
    order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
  });
  const closing = await StockLedger.findOne({
    where: {
      item_id,
      ...(warehouse_id ? { warehouse_id } : {}),
      transaction_date: { [Op.lte]: end_date }
    },
    order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
  });
  const openingQty = opening ? Number(opening.balance_qty || 0) : 0;
  const closingQty = closing ? Number(closing.balance_qty || 0) : openingQty;
  return (openingQty + closingQty) / 2;
};

const calculateOnTimeDeliveryRate = async (supplier_id, start_date = null, end_date = null) => {
  const where = { supplier_id };
  if (start_date || end_date) where.po_date = {};
  if (start_date) where.po_date[Op.gte] = start_date;
  if (end_date) where.po_date[Op.lte] = end_date;

  const pos = await PurchaseOrder.findAll({
    where,
    attributes: ['po_id', 'expected_delivery_date', 'actual_delivery_date']
  });
  if (!pos.length) return null;
  const onTime = pos.filter(po => po.actual_delivery_date && po.expected_delivery_date && new Date(po.actual_delivery_date) <= new Date(po.expected_delivery_date)).length;
  return Number(((onTime / pos.length) * 100).toFixed(2));
};

// ---------------------------------------------------------------------------
// Analytics controllers
// ---------------------------------------------------------------------------

// 1. ABC Analysis
const getABCAnalysis = async (req, res) => {
  try {
    const { warehouse_id, category_id } = req.query;

    const stockMap = await getAllItemsStock(warehouse_id ? parseInt(warehouse_id, 10) : null);
    const itemIds = Object.keys(stockMap);

    const itemsData = itemIds.length
      ? await Item.findAll({
        where: { item_id: { [Op.in]: itemIds } },
        include: [{ model: Category, as: 'category', attributes: ['category_name'] }]
      })
      : [];

    const items = [];
    let totalValue = 0;
    for (const item of itemsData) {
      if (category_id && item.category_id !== parseInt(category_id, 10)) continue;
      const stockQty = stockMap[item.item_id] || 0;
      const unitPrice = Number(item.unit_price || 0);
      const stockValue = calculateInventoryValue(stockQty, unitPrice);
      totalValue += stockValue;
      items.push({
        item_id: item.item_id,
        sku: item.sku,
        item_name: item.item_name,
        category_name: item.category?.category_name || null,
        current_stock: stockQty,
        unit_price: unitPrice,
        stock_value: stockValue
      });
    }

    items.sort((a, b) => b.stock_value - a.stock_value);
    let cumulative = 0;
    const classified = items.map(it => {
      const pct = totalValue ? (it.stock_value / totalValue) * 100 : 0;
      cumulative += pct;
      const abc = classifyABCCategory(cumulative);
      return {
        ...it,
        percentage_of_total_value: Number(pct.toFixed(2)),
        cumulative_value_percentage: Number(cumulative.toFixed(2)),
        abc_category: abc,
        recommendation:
          abc === 'A'
            ? 'Strict control, frequent cycle counting, forecast closely'
            : abc === 'B'
              ? 'Moderate control with periodic review'
              : 'Simple control with bulk review'
      };
    });

    const summary = { A: { count: 0, value: 0 }, B: { count: 0, value: 0 }, C: { count: 0, value: 0 } };
    classified.forEach(c => {
      summary[c.abc_category].count += 1;
      summary[c.abc_category].value += c.stock_value;
    });
    const totalItems = classified.length || 1;
    const respSummary = {
      category_a: {
        item_count: summary.A.count,
        percentage_of_items: Number(((summary.A.count / totalItems) * 100).toFixed(2)),
        total_value: Number(summary.A.value.toFixed(2)),
        percentage_of_value: totalValue ? Number(((summary.A.value / totalValue) * 100).toFixed(2)) : 0,
        description: 'High-value items requiring tight control'
      },
      category_b: {
        item_count: summary.B.count,
        percentage_of_items: Number(((summary.B.count / totalItems) * 100).toFixed(2)),
        total_value: Number(summary.B.value.toFixed(2)),
        percentage_of_value: totalValue ? Number(((summary.B.value / totalValue) * 100).toFixed(2)) : 0,
        description: 'Moderate-value items requiring normal control'
      },
      category_c: {
        item_count: summary.C.count,
        percentage_of_items: Number(((summary.C.count / totalItems) * 100).toFixed(2)),
        total_value: Number(summary.C.value.toFixed(2)),
        percentage_of_value: totalValue ? Number(((summary.C.value / totalValue) * 100).toFixed(2)) : 0,
        description: 'Low-value items requiring simple control'
      }
    };

    return ok(res, {
      analysis_date: new Date().toISOString().split('T')[0],
      total_items_analyzed: classified.length,
      total_inventory_value: Number(totalValue.toFixed(2)),
      summary: respSummary,
      items: classified,
      visual_data: {
        category_distribution: [
          { category: 'A', item_count: summary.A.count, value: summary.A.value },
          { category: 'B', item_count: summary.B.count, value: summary.B.value },
          { category: 'C', item_count: summary.C.count, value: summary.C.value }
        ]
      }
    }, 'ABC analysis completed');
  } catch (error) {
    console.error('getABCAnalysis error:', error);
    return fail(res, error.message || 'Failed to run ABC analysis', 500);
  }
};

// 2. Stock Aging Report
const getStockAgingReport = async (req, res) => {
  try {
    const { warehouse_id, min_age_days = 0, category_id } = req.query;
    const today = new Date();
    const batches = await Batch.findAll({
      include: [
        {
          model: GRNItem,
          as: 'grnItem',
          include: [{ model: GRN, as: 'grn', include: [{ model: Warehouse, as: 'warehouse' }] }]
        },
        {
          model: Item,
          as: 'item',
          include: [{ model: Category, as: 'category', attributes: ['category_id', 'category_name'] }]
        }
      ],
      where: warehouse_id ? { '$grnItem.grn.warehouse_id$': parseInt(warehouse_id, 10) } : undefined
    });

    const brackets = {
      '0_30': { item_count: 0, qty: 0, value: 0 },
      '31_60': { item_count: 0, qty: 0, value: 0 },
      '61_90': { item_count: 0, qty: 0, value: 0 },
      '91_180': { item_count: 0, qty: 0, value: 0 },
      '180_plus': { item_count: 0, qty: 0, value: 0 }
    };
    let totalValue = 0;
    const slowMoving = [];

    for (const b of batches) {
      if (category_id && b.item?.category_id !== parseInt(category_id, 10)) continue;
      const grnDate = b.grnItem?.grn?.grn_date ? new Date(b.grnItem.grn.grn_date) : null;
      if (!grnDate) continue;
      const days = Math.floor((today - grnDate) / (1000 * 60 * 60 * 24));
      if (days < min_age_days) continue;
      const bracket =
        days <= 30 ? '0_30' :
          days <= 60 ? '31_60' :
            days <= 90 ? '61_90' :
              days <= 180 ? '91_180' : '180_plus';
      const value = calculateInventoryValue(b.available_qty, b.item?.unit_price);
      brackets[bracket].item_count += 1;
      brackets[bracket].qty += Number(b.available_qty || 0);
      brackets[bracket].value += value;
      totalValue += value;

      if (bracket === '91_180' || bracket === '180_plus') {
        slowMoving.push({
          item_id: b.item_id,
          item_name: b.item?.item_name,
          batch_number: b.batch_number,
          grn_date: b.grnItem?.grn?.grn_date,
          days_in_stock: days,
          age_bracket: bracket === '180_plus' ? '180+ days' : '91-180 days',
          current_stock: b.available_qty,
          unit_price: b.item?.unit_price,
          stock_value: value,
          recommendation: bracket === '180_plus'
            ? 'Dead stock - Consider liquidation, donation, or write-off'
            : 'Slow-moving - Consider promotional pricing'
        });
      }
    }

    const summary = {
      total_stock_value: Number(totalValue.toFixed(2)),
      aging_brackets: {
        '0_30_days': {
          item_count: brackets['0_30'].item_count,
          quantity: brackets['0_30'].qty,
          value: Number(brackets['0_30'].value.toFixed(2)),
          percentage: totalValue ? Number(((brackets['0_30'].value / totalValue) * 100).toFixed(2)) : 0
        },
        '31_60_days': {
          item_count: brackets['31_60'].item_count,
          quantity: brackets['31_60'].qty,
          value: Number(brackets['31_60'].value.toFixed(2)),
          percentage: totalValue ? Number(((brackets['31_60'].value / totalValue) * 100).toFixed(2)) : 0
        },
        '61_90_days': {
          item_count: brackets['61_90'].item_count,
          quantity: brackets['61_90'].qty,
          value: Number(brackets['61_90'].value.toFixed(2)),
          percentage: totalValue ? Number(((brackets['61_90'].value / totalValue) * 100).toFixed(2)) : 0
        },
        '91_180_days': {
          item_count: brackets['91_180'].item_count,
          quantity: brackets['91_180'].qty,
          value: Number(brackets['91_180'].value.toFixed(2)),
          percentage: totalValue ? Number(((brackets['91_180'].value / totalValue) * 100).toFixed(2)) : 0
        },
        '180_plus_days': {
          item_count: brackets['180_plus'].item_count,
          quantity: brackets['180_plus'].qty,
          value: Number(brackets['180_plus'].value.toFixed(2)),
          percentage: totalValue ? Number(((brackets['180_plus'].value / totalValue) * 100).toFixed(2)) : 0
        }
      }
    };

    return ok(res, {
      report_date: new Date().toISOString().split('T')[0],
      summary,
      slow_moving_items: slowMoving,
      fast_moving_items: [] // Can be enriched using turnover data
    }, 'Stock aging report generated');
  } catch (error) {
    console.error('getStockAgingReport error:', error);
    return fail(res, error.message || 'Failed to generate stock aging report', 500);
  }
};

// 3. Stock Turnover Analysis
const getStockTurnoverAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, warehouse_id, category_id } = req.query;

    const endDateObj = end_date ? new Date(end_date) : new Date();
    const startDateObj = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 6));

    const start_date_str = startDateObj.toISOString().split('T')[0];
    const end_date_str = endDateObj.toISOString().split('T')[0];
    const days = Math.max(1, Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)));

    const items = await Item.findAll({
      where: category_id ? { category_id: parseInt(category_id, 10) } : undefined,
      include: [{ model: Category, as: 'category', attributes: ['category_name'] }]
    });

    const itemResults = [];
    let totalCogs = 0;
    let totalAvgInventoryValue = 0;

    for (const it of items) {
      const avgStockQty = await calculateAverageStock(it.item_id, start_date_str, end_date_str, warehouse_id ? parseInt(warehouse_id, 10) : null);
      const issuesQty = await getItemConsumption(it.item_id, start_date_str, end_date_str, warehouse_id ? parseInt(warehouse_id, 10) : null);
      const cogs = calculateInventoryValue(issuesQty, it.unit_price);
      const avgInvValue = calculateInventoryValue(avgStockQty, it.unit_price);
      const turnover = avgInvValue > 0 ? cogs / avgInvValue : 0;
      const annualized = turnover * (365 / days);
      const daysOfSupply = turnover > 0 ? Number((365 / turnover).toFixed(1)) : null;

      totalCogs += cogs;
      totalAvgInventoryValue += avgInvValue;

      itemResults.push({
        item_id: it.item_id,
        item_name: it.item_name,
        avg_stock: Number(avgStockQty.toFixed(2)),
        issues_during_period: issuesQty,
        unit_price: it.unit_price,
        cogs: Number(cogs.toFixed(2)),
        avg_inventory_value: Number(avgInvValue.toFixed(2)),
        turnover_ratio: Number(turnover.toFixed(2)),
        annualized_turnover_ratio: Number(annualized.toFixed(2)),
        days_of_supply: daysOfSupply,
        status: turnover > 3 ? 'Excellent' : turnover > 1 ? 'Good' : 'Poor'
      });
    }

    // Generate monthly trend data
    const labels = [];
    const values = [];
    const tempDate = new Date(startDateObj);
    while (tempDate <= endDateObj) {
      const label = tempDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      labels.push(label);

      // Calculate turnover for this specific month (simplified for now)
      const monthStart = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).toISOString().split('T')[0];

      let monthCogs = 0;
      let monthAvgInv = 0;
      for (const it of items) {
        const mIssues = await getItemConsumption(it.item_id, monthStart, monthEnd, warehouse_id);
        const mAvg = await calculateAverageStock(it.item_id, monthStart, monthEnd, warehouse_id);
        monthCogs += calculateInventoryValue(mIssues, it.unit_price);
        monthAvgInv += calculateInventoryValue(mAvg, it.unit_price);
      }
      values.push(monthAvgInv > 0 ? Number((monthCogs / monthAvgInv).toFixed(2)) : 0);

      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    const overallTurnover = totalAvgInventoryValue > 0 ? totalCogs / totalAvgInventoryValue : 0;
    const response = {
      period: { start_date: start_date_str, end_date: end_date_str, days },
      overall_metrics: {
        total_cogs: Number(totalCogs.toFixed(2)),
        average_inventory_value: Number(totalAvgInventoryValue.toFixed(2)),
        overall_turnover_ratio: Number(overallTurnover.toFixed(2)),
        annualized_turnover_ratio: Number((overallTurnover * (365 / days)).toFixed(2))
      },
      labels,
      values,
      items: itemResults
    };

    return ok(res, response, 'Stock turnover analysis completed');
  } catch (error) {
    console.error('getStockTurnoverAnalysis error:', error);
    return fail(res, error.message || 'Failed to analyze stock turnover', 500);
  }
};

// 4. Consumption Trend Analysis
const getConsumptionTrends = async (req, res) => {
  try {
    const { item_id, period = 'monthly', months = 6 } = req.query;
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) return fail(res, 'period must be daily, weekly, or monthly', 400);

    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - (parseInt(months, 10) || 6));

    const where = {
      transaction_type: 'Issue',
      transaction_date: { [Op.between]: [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)] }
    };
    if (item_id) where.item_id = parseInt(item_id, 10);

    // Grouping by period
    let dateFmt = '%Y-%m';
    if (period === 'weekly') dateFmt = '%x-%v';
    if (period === 'daily') dateFmt = '%Y-%m-%d';

    const trends = await StockLedger.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('transaction_date'), dateFmt), 'period'],
        'item_id',
        [fn('SUM', col('quantity')), 'qty']
      ],
      where,
      group: ['period', 'item_id'],
      order: [[literal('period'), 'ASC']]
    });

    const itemsMap = {};
    for (const t of trends) {
      const pid = t.get('period');
      const iid = t.get('item_id');
      const qty = Math.abs(Number(t.get('qty') || 0));
      if (!itemsMap[iid]) itemsMap[iid] = [];
      itemsMap[iid].push({ period: pid, quantity_issued: qty });
    }

    const resultItems = [];
    for (const [iid, data] of Object.entries(itemsMap)) {
      const item = await Item.findByPk(iid);
      const qtys = data.map(d => d.quantity_issued);
      const avg = qtys.length ? qtys.reduce((a, b) => a + b, 0) / qtys.length : 0;
      const min = qtys.length ? Math.min(...qtys) : 0;
      const max = qtys.length ? Math.max(...qtys) : 0;
      const mean = avg;
      const variance = qtys.length ? qtys.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / qtys.length : 0;
      const std = Math.sqrt(variance);
      const trend = qtys.length > 1 && qtys[qtys.length - 1] > qtys[0] ? 'Increasing' : 'Stable';

      resultItems.push({
        item_id: Number(iid),
        item_name: item?.item_name,
        consumption_data: data,
        statistics: {
          avg_consumption: Number(avg.toFixed(2)),
          min_consumption: min,
          max_consumption: max,
          std_deviation: Number(std.toFixed(2)),
          trend,
          growth_rate: null,
          seasonality: null
        },
        forecast: {
          next_period_predicted: Number((avg || 0).toFixed(0)),
          confidence: 'Medium',
          recommended_reorder_qty: Number((avg || 0).toFixed(0))
        }
      });
    }

    return ok(res, {
      analysis_period: `Last ${months} months`,
      period_type: period,
      items: resultItems,
      visual_data: null
    }, 'Consumption trends analyzed');
  } catch (error) {
    console.error('getConsumptionTrends error:', error);
    return fail(res, error.message || 'Failed to analyze consumption trends', 500);
  }
};

// 5. Supplier Performance Metrics
const getSupplierPerformance = async (req, res) => {
  try {
    const { supplier_id, start_date, end_date } = req.query;
    const supplierWhere = supplier_id ? { supplier_id: parseInt(supplier_id, 10) } : {};
    const suppliers = await Supplier.findAll({ where: supplierWhere });
    const results = [];
    for (const s of suppliers) {
      const poWhere = { supplier_id: s.supplier_id };
      if (start_date || end_date) poWhere.po_date = {};
      if (start_date) poWhere.po_date[Op.gte] = start_date;
      if (end_date) poWhere.po_date[Op.lte] = end_date;
      const pos = await PurchaseOrder.findAll({ where: poWhere });
      const total_pos = pos.length;
      const total_po_value = pos.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const completed_pos = pos.filter(p => p.status === 'Completed').length;
      const onTimeRate = await calculateOnTimeDeliveryRate(s.supplier_id, start_date, end_date);
      const grns = await GRN.findAll({
        include: [
          { model: PurchaseOrder, as: 'purchaseOrder', where: { supplier_id: s.supplier_id }, required: true },
          { model: GRNItem, as: 'grnItems' }
        ]
      });
      let received = 0; let accepted = 0;
      grns.forEach(g => {
        g.grnItems?.forEach(gi => {
          received += Number(gi.received_qty || 0);
          accepted += Number(gi.accepted_qty || 0);
        });
      });
      const qualityRate = received ? Number(((accepted / received) * 100).toFixed(2)) : null;

      results.push({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        metrics: {
          total_pos,
          total_po_value: Number(total_po_value.toFixed(2)),
          completed_pos,
          on_time_delivery_rate: onTimeRate,
          quality_acceptance_rate: qualityRate
        },
        overall_rating: Number(s.performance_rating || 0),
        performance_status: onTimeRate && onTimeRate > 85 ? 'Excellent' : 'Average',
        recommendation: onTimeRate && onTimeRate > 85 ? 'Preferred supplier' : 'Review performance'
      });
    }

    return ok(res, {
      analysis_period: start_date && end_date ? `${start_date} to ${end_date}` : 'All time',
      total_suppliers_analyzed: results.length,
      suppliers: results
    }, 'Supplier performance metrics generated');
  } catch (error) {
    console.error('getSupplierPerformance error:', error);
    return fail(res, error.message || 'Failed to fetch supplier performance', 500);
  }
};

// 6. Warehouse Performance Analysis
const getWarehousePerformance = async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll();
    const results = [];
    for (const wh of warehouses) {
      const stockMap = await getAllItemsStock(wh.warehouse_id);
      const itemIds = Object.keys(stockMap);

      const items = await Item.findAll({
        where: { item_id: { [Op.in]: itemIds } },
        attributes: ['item_id', 'unit_price']
      });

      let currentStockUnits = 0;
      let totalStockValue = 0;

      items.forEach(it => {
        const qty = stockMap[it.item_id];
        currentStockUnits += qty;
        totalStockValue += calculateInventoryValue(qty, it.unit_price);
      });

      results.push({
        warehouse_id: wh.warehouse_id,
        warehouse_name: wh.warehouse_name,
        metrics: {
          total_capacity: null,
          current_stock_units: currentStockUnits,
          utilization_percentage: null,
          total_stock_value: Number(totalStockValue.toFixed(2)),
          number_of_items: itemIds.length,
          performance_rating: 'Active'
        }
      });
    }
    return ok(res, { warehouses: results }, 'Warehouse performance analyzed');
  } catch (error) {
    console.error('getWarehousePerformance error:', error);
    return fail(res, error.message || 'Failed to fetch warehouse performance', 500);
  }
};

// 7. Financial Impact Report
const getFinancialImpactReport = async (req, res) => {
  try {
    // Reuse ABC for valuation
    const latest = await StockLedger.findAll({
      attributes: ['item_id', [fn('MAX', col('ledger_id')), 'latest_ledger_id']],
      group: ['item_id'],
      raw: true
    });
    const ledgerIds = latest.map(l => l.latest_ledger_id);
    const ledgers = ledgerIds.length ? await StockLedger.findAll({ where: { ledger_id: { [Op.in]: ledgerIds } }, include: [{ model: Item, as: 'item' }] }) : [];
    let totalValue = 0;
    const byCategory = {};
    for (const l of ledgers) {
      const val = calculateInventoryValue(l.balance_qty, l.item?.unit_price);
      totalValue += val;
      const cat = l.item?.category_id || 'uncat';
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += val;
    }

    const carryingCostRate = 1.5; // %
    const carryingCost = Number(((totalValue * carryingCostRate) / 100).toFixed(2));

    return ok(res, {
      report_period: 'Current',
      inventory_valuation: {
        total_inventory_value: Number(totalValue.toFixed(2)),
        by_category: Object.entries(byCategory).map(([cat, val]) => ({ category: cat, value: Number(val.toFixed(2)) }))
      },
      carrying_costs: {
        estimated_monthly_carrying_cost: carryingCost,
        carrying_cost_rate: carryingCostRate,
        breakdown: null
      },
      losses_and_write_offs: null,
      slow_moving_stock_risk: null,
      optimization_opportunities: null,
      summary: {
        total_inventory_value: Number(totalValue.toFixed(2)),
        total_costs_last_month: null,
        inventory_cost_percentage: null,
        improvement_potential: null
      }
    }, 'Financial impact report generated');
  } catch (error) {
    console.error('getFinancialImpactReport error:', error);
    return fail(res, error.message || 'Failed to generate financial impact report', 500);
  }
};

// 8. Executive Dashboard
const getExecutiveDashboard = async (req, res) => {
  try {
    // 1. Get Stock Valuation
    const stockMap = await getAllItemsStock();
    const items = await Item.findAll({ attributes: ['item_id', 'unit_price'] });
    let totalValue = 0;
    items.forEach(it => {
      totalValue += (stockMap[it.item_id] || 0) * Number(it.unit_price || 0);
    });

    // 2. Average On-Time Delivery Rate
    const suppliers = await Supplier.findAll({ attributes: ['supplier_id'] });
    let totalOnTimeRate = 0;
    let supplierCountWithData = 0;
    for (const s of suppliers) {
      const rate = await calculateOnTimeDeliveryRate(s.supplier_id);
      if (rate !== null) {
        totalOnTimeRate += rate;
        supplierCountWithData++;
      }
    }
    const avgOnTime = supplierCountWithData ? (totalOnTimeRate / supplierCountWithData) : 0;

    // 3. Current Alerts Summary
    const unreadAlerts = await Alert.count({ where: { is_read: false, alert_type: { [Op.in]: ['Reorder', 'Critical Stock'] } } });
    const criticalAlerts = await Alert.count({ where: { severity: 'Critical', is_read: false } });

    // 4. Monthly Statistics (Issue and Receipt)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const issuesMonth = await StockLedger.sum('quantity', {
      where: { transaction_type: 'Issue', transaction_date: { [Op.gte]: monthStart.toISOString().split('T')[0] } }
    }) || 0;

    const receiptsMonth = await StockLedger.sum('quantity', {
      where: { transaction_type: 'GRN', transaction_date: { [Op.gte]: monthStart.toISOString().split('T')[0] } }
    }) || 0;

    return ok(res, {
      generated_at: new Date().toISOString(),
      kpis: {
        total_inventory_value: Number(totalValue.toFixed(2)),
        on_time_delivery_rate_avg: Number(avgOnTime.toFixed(1)),
        monthly_issue_units: Math.abs(Number(issuesMonth)),
        monthly_receipt_units: Number(receiptsMonth)
      },
      alerts_summary: {
        unread_total: unreadAlerts,
        critical_active: criticalAlerts
      },
      financial_snapshot: {
        estimated_carrying_cost: Number(((totalValue * 1.5) / 100).toFixed(2))
      }
    }, 'Executive dashboard data retrieved successfully');
  } catch (error) {
    console.error('getExecutiveDashboard error:', error);
    return fail(res, error.message || 'Failed to fetch executive dashboard', 500);
  }
};

module.exports = {
  getABCAnalysis,
  getStockAgingReport,
  getStockTurnoverAnalysis,
  getConsumptionTrends,
  getSupplierPerformance,
  getWarehousePerformance,
  getFinancialImpactReport,
  getExecutiveDashboard,
  // helpers
  calculateInventoryValue,
  getItemConsumption,
  calculateAverageStock,
  classifyABCCategory,
  calculateOnTimeDeliveryRate
};

