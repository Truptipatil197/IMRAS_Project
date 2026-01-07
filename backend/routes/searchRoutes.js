const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { Item, Supplier, PurchaseRequisition, PurchaseOrder, GRN, Category } = require('../models');
const { Op } = require('sequelize');

/**
 * Global search endpoint
 * GET /api/search?q=searchterm
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, results: [] });
    }
    
    const searchTerm = `%${q}%`;
    const results = [];
    
    // Search items
    try {
      const items = await Item.findAll({
        where: {
          [Op.or]: [
            { sku: { [Op.like]: searchTerm } },
            { item_name: { [Op.like]: searchTerm } },
            { description: { [Op.like]: searchTerm } }
          ],
          is_active: true
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['category_name'],
          required: false
        }],
        limit: 10,
        attributes: ['item_id', 'sku', 'item_name', 'description', 'unit_price']
      });
      
      items.forEach(item => {
        results.push({
          type: 'Items',
          title: item.item_name,
          subtitle: `SKU: ${item.sku}${item.category ? ` | ${item.category.category_name}` : ''}`,
          url: `pages/inventory.html?item_id=${item.item_id}`,
          icon: 'fa-box'
        });
      });
    } catch (error) {
      console.error('Error searching items:', error);
    }
    
    // Search suppliers
    try {
      const suppliers = await Supplier.findAll({
        where: {
          [Op.or]: [
            { supplier_name: { [Op.like]: searchTerm } },
            { contact_person: { [Op.like]: searchTerm } },
            { email: { [Op.like]: searchTerm } }
          ],
          is_active: true
        },
        limit: 10,
        attributes: ['supplier_id', 'supplier_name', 'contact_person', 'email']
      });
      
      suppliers.forEach(supplier => {
        results.push({
          type: 'Suppliers',
          title: supplier.supplier_name,
          subtitle: supplier.contact_person || supplier.email || '',
          url: `pages/suppliers.html?supplier_id=${supplier.supplier_id}`,
          icon: 'fa-truck'
        });
      });
    } catch (error) {
      console.error('Error searching suppliers:', error);
    }
    
    // Search Purchase Requisitions
    try {
      const prs = await PurchaseRequisition.findAll({
        where: {
          pr_number: { [Op.like]: searchTerm }
        },
        limit: 10,
        attributes: ['pr_id', 'pr_number', 'pr_date', 'status'],
        order: [['pr_date', 'DESC']]
      });
      
      prs.forEach(pr => {
        results.push({
          type: 'Purchase Requisitions',
          title: pr.pr_number,
          subtitle: `Date: ${pr.pr_date} | Status: ${pr.status}`,
          url: `pages/purchase-requisitions.html?pr_id=${pr.pr_id}`,
          icon: 'fa-file-alt'
        });
      });
    } catch (error) {
      console.error('Error searching PRs:', error);
    }
    
    // Search Purchase Orders
    try {
      const pos = await PurchaseOrder.findAll({
        where: {
          po_number: { [Op.like]: searchTerm }
        },
        limit: 10,
        attributes: ['po_id', 'po_number', 'po_date', 'status'],
        order: [['po_date', 'DESC']]
      });
      
      pos.forEach(po => {
        results.push({
          type: 'Purchase Orders',
          title: po.po_number,
          subtitle: `Date: ${po.po_date} | Status: ${po.status}`,
          url: `pages/purchase-orders.html?po_id=${po.po_id}`,
          icon: 'fa-shopping-cart'
        });
      });
    } catch (error) {
      console.error('Error searching POs:', error);
    }
    
    // Search GRNs
    try {
      const grns = await GRN.findAll({
        where: {
          grn_number: { [Op.like]: searchTerm }
        },
        limit: 10,
        attributes: ['grn_id', 'grn_number', 'grn_date', 'status'],
        order: [['grn_date', 'DESC']]
      });
      
      grns.forEach(grn => {
        results.push({
          type: 'GRNs',
          title: grn.grn_number,
          subtitle: `Date: ${grn.grn_date} | Status: ${grn.status}`,
          url: `pages/grn-details.html?grn_id=${grn.grn_id}`,
          icon: 'fa-clipboard-check'
        });
      });
    } catch (error) {
      console.error('Error searching GRNs:', error);
    }
    
    // Group results by type for better display
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {});
    
    return res.status(200).json({
      success: true,
      results: results,
      grouped: groupedResults,
      count: results.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

module.exports = router;
