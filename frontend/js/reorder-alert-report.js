// ========================================
// REORDER ALERT REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let reorderAlertTable;
let allAlerts = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeReorderAlertTable();
    loadReorderAlerts();
    
    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.alert-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
});

// Initialize DataTable
function initializeReorderAlertTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.dataTable === 'undefined') {
        console.error('jQuery or DataTables not loaded');
        return;
    }
    
    reorderAlertTable = $('#reorderAlertTable').DataTable({
        columns: [
            { 
                data: null,
                orderable: false,
                render: function(data, type, row) {
                    return `<input type="checkbox" class="alert-checkbox" data-item-id="${row.item_id || ''}">`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    return getPriorityBadge(data);
                }
            },
            { data: 'sku' },
            { data: 'item_name' },
            { 
                data: 'current_stock',
                render: function(data, type, row) {
                    const color = data === 0 ? 'text-danger' : data < (row.reorder_point || 0) ? 'text-warning' : '';
                    return `<strong class="${color}">${data || 0}</strong>`;
                }
            },
            { data: 'reorder_point' },
            { data: 'safety_stock' },
            { 
                data: null,
                render: function(data) {
                    return `<strong class="text-primary">${calculateRecommendedQty(data)}</strong>`;
                }
            },
            { 
                data: 'lead_time_days',
                render: function(data) {
                    return `${data || 0} days`;
                }
            },
            { data: 'preferred_supplier' },
            { 
                data: null,
                render: function(data) {
                    const estimatedCost = calculateRecommendedQty(data) * (data.supplier_unit_price || 0);
                    return formatCurrency(estimatedCost);
                }
            },
            { 
                data: null,
                orderable: false,
                render: function(data) {
                    return `
                        <button class="btn btn-sm btn-primary" onclick="createPR(${data.item_id || 0})">
                            <i class="fas fa-plus"></i> Create PR
                        </button>
                    `;
                }
            }
        ],
        order: [[1, 'asc'], [4, 'asc']],
        pageLength: 25,
        language: {
            emptyTable: "No items require reordering"
        }
    });
}

// Load Reorder Alerts
async function loadReorderAlerts() {
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/reorder/alerts`);
        
        let data;
        if (!response.ok) {
            data = { alerts: [] };
        } else {
            data = await response.json();
        }
        
        allAlerts = data.alerts || [];
        
        // Update summary counts
        updateAlertSummary(allAlerts);
        
        // Populate table
        if (reorderAlertTable) {
            reorderAlertTable.clear();
            reorderAlertTable.rows.add(allAlerts);
            reorderAlertTable.draw();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading reorder alerts:', error);
        showNotification('Failed to load reorder alerts', 'error');
        hideLoader();
    }
}

// Update Alert Summary
function updateAlertSummary(alerts) {
    let critical = 0, urgent = 0, warning = 0;
    
    alerts.forEach(alert => {
        if (alert.current_stock === 0) {
            critical++;
        } else if ((alert.current_stock || 0) < (alert.reorder_point || 0)) {
            urgent++;
        } else if (alert.current_stock === alert.reorder_point) {
            warning++;
        }
    });
    
    const criticalEl = document.getElementById('criticalCount');
    const urgentEl = document.getElementById('urgentCount');
    const warningEl = document.getElementById('warningCount');
    
    if (criticalEl) criticalEl.textContent = critical;
    if (urgentEl) urgentEl.textContent = urgent;
    if (warningEl) warningEl.textContent = warning;
}

// Get Priority Badge
function getPriorityBadge(item) {
    if (item.current_stock === 0) {
        return '<span class="priority-badge critical">CRITICAL</span>';
    } else if ((item.current_stock || 0) < (item.reorder_point || 0)) {
        return '<span class="priority-badge urgent">URGENT</span>';
    } else if (item.current_stock === item.reorder_point) {
        return '<span class="priority-badge warning">WARNING</span>';
    }
    return '<span class="priority-badge">NORMAL</span>';
}

// Calculate Recommended Order Quantity
function calculateRecommendedQty(item) {
    const reorderPoint = item.reorder_point || 0;
    const safetyStock = item.safety_stock || 0;
    const currentStock = item.current_stock || 0;
    
    // Formula: (Reorder Point + Safety Stock) - Current Stock
    const recommended = (reorderPoint + safetyStock) - currentStock;
    
    // Ensure minimum order quantity if specified
    const minOrderQty = item.min_order_qty || 0;
    
    return Math.max(recommended, minOrderQty, 0);
}

// Create Single Purchase Requisition
async function createPR(itemId) {
    const item = allAlerts.find(a => a.item_id === itemId);
    if (!item) return;
    
    const recommendedQty = calculateRecommendedQty(item);
    
    const confirmed = confirm(
        `Create Purchase Requisition?\n\n` +
        `Item: ${item.item_name}\n` +
        `Recommended Quantity: ${recommendedQty}\n` +
        `Estimated Cost: ${formatCurrency(recommendedQty * (item.supplier_unit_price || 0))}`
    );
    
    if (!confirmed) return;
    
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/pr`, {
            method: 'POST',
            body: JSON.stringify({
                items: [{
                    item_id: itemId,
                    requested_qty: recommendedQty,
                    justification: 'Stock below reorder point'
                }]
            })
        });
        
        if (!response.ok) throw new Error('Failed to create PR');
        
        const result = await response.json();
        
        hideLoader();
        showNotification(`Purchase Requisition ${result.pr_number || 'created'} successfully`, 'success');
        
        // Refresh alerts
        loadReorderAlerts();
    } catch (error) {
        console.error('Error creating PR:', error);
        showNotification('Failed to create Purchase Requisition', 'error');
        hideLoader();
    }
}

// Bulk Create Purchase Requisitions
async function bulkCreatePR() {
    const selectedCheckboxes = document.querySelectorAll('.alert-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select items to create PRs', 'warning');
        return;
    }
    
    const selectedItems = Array.from(selectedCheckboxes).map(cb => {
        const itemId = parseInt(cb.dataset.itemId);
        const item = allAlerts.find(a => a.item_id === itemId);
        return {
            item_id: itemId,
            requested_qty: calculateRecommendedQty(item),
            justification: 'Stock below reorder point'
        };
    });
    
    const confirmed = confirm(
        `Create Purchase Requisition for ${selectedItems.length} items?`
    );
    
    if (!confirmed) return;
    
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/pr`, {
            method: 'POST',
            body: JSON.stringify({
                items: selectedItems
            })
        });
        
        if (!response.ok) throw new Error('Failed to create PR');
        
        const result = await response.json();
        
        hideLoader();
        showNotification(`Purchase Requisition ${result.pr_number || 'created'} successfully`, 'success');
        
        // Refresh alerts
        loadReorderAlerts();
    } catch (error) {
        console.error('Error creating bulk PR:', error);
        showNotification('Failed to create Purchase Requisitions', 'error');
        hideLoader();
    }
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const tableData = reorderAlertTable ? reorderAlertTable.rows().data().toArray() : allAlerts;
        
        const excelData = [
            ['Reorder Alert Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Priority', 'SKU', 'Item Name', 'Current Stock', 'Reorder Point', 'Safety Stock', 'Recommended Qty', 'Lead Time', 'Supplier', 'Est. Cost']
        ];
        
        tableData.forEach(item => {
            const priority = item.current_stock === 0 ? 'CRITICAL' : 
                           (item.current_stock || 0) < (item.reorder_point || 0) ? 'URGENT' : 'WARNING';
            
            excelData.push([
                priority,
                item.sku || '',
                item.item_name || '',
                item.current_stock || 0,
                item.reorder_point || 0,
                item.safety_stock || 0,
                calculateRecommendedQty(item),
                (item.lead_time_days || 0) + ' days',
                item.preferred_supplier || '',
                calculateRecommendedQty(item) * (item.supplier_unit_price || 0)
            ]);
        });
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reorder Alerts");
            XLSX.writeFile(wb, `Reorder_Alert_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        hideLoader();
        showNotification('Report exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Failed to export report', 'error');
        hideLoader();
    }
}

// Export to PDF
function exportToPDF() {
    try {
        showLoader();
        
        if (typeof window.jspdf === 'undefined') {
            showNotification('PDF export library not loaded', 'error');
            hideLoader();
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        doc.setFontSize(18);
        doc.text('Reorder Alert Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = reorderAlertTable ? reorderAlertTable.rows().data().toArray() : allAlerts;
        const rows = tableData.map(item => {
            const priority = item.current_stock === 0 ? 'CRITICAL' : 
                           (item.current_stock || 0) < (item.reorder_point || 0) ? 'URGENT' : 'WARNING';
            
            return [
                priority,
                item.sku || '',
                (item.item_name || '').substring(0, 25),
                item.current_stock || 0,
                item.reorder_point || 0,
                calculateRecommendedQty(item),
                (item.preferred_supplier || '').substring(0, 15)
            ];
        });
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 35,
                head: [['Priority', 'SKU', 'Item Name', 'Stock', 'Reorder Pt', 'Recommended', 'Supplier']],
                body: rows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [255, 193, 7] }
            });
        }
        
        doc.save(`Reorder_Alert_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoader();
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Failed to export PDF', 'error');
        hideLoader();
    }
}

// Utility Functions
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showLoader() {
    document.body.style.cursor = 'wait';
}

function hideLoader() {
    document.body.style.cursor = 'default';
}

function showNotification(message, type) {
    alert(message);
}

