// ========================================
// STOCK RECONCILIATION REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let reconciliationTable;
let allReconciliationData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFilters();
    initializeReconciliationTable();
    loadReconciliationData();
    loadAdjustmentHistory();
});

// Load Filter Options
async function loadFilters() {
    try {
        // Load stock count dates
        const countsResponse = await fetchWithAuth(`${API_URL}/stock/counts`);
        if (countsResponse.ok) {
            const counts = await countsResponse.json();
            const countSelect = document.getElementById('filterCountDate');
            if (countSelect) {
                counts.forEach(count => {
                    countSelect.innerHTML += `
                        <option value="${count.count_id}">
                            ${formatDate(count.count_date)} - ${count.warehouse_name}
                        </option>
                    `;
                });
            }
        }
        
        // Load warehouses
        const warehousesResponse = await fetchWithAuth(`${API_URL}/warehouses`);
        if (warehousesResponse.ok) {
            const warehouses = await warehousesResponse.json();
            const warehouseSelect = document.getElementById('filterWarehouse');
            if (warehouseSelect) {
                warehouses.forEach(wh => {
                    warehouseSelect.innerHTML += `<option value="${wh.warehouse_id}">${wh.warehouse_name}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Initialize DataTable
function initializeReconciliationTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.dataTable === 'undefined') {
        console.error('jQuery or DataTables not loaded');
        return;
    }
    
    reconciliationTable = $('#reconciliationTable').DataTable({
        columns: [
            { data: 'item_name' },
            { data: 'sku' },
            { data: 'warehouse_name' },
            { 
                data: 'system_qty',
                render: function(data) {
                    return `<strong>${data || 0}</strong>`;
                }
            },
            { 
                data: 'physical_qty',
                render: function(data) {
                    return `<strong>${data || 0}</strong>`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    const variance = (data.physical_qty || 0) - (data.system_qty || 0);
                    const color = variance > 0 ? 'text-success' : variance < 0 ? 'text-danger' : 'text-muted';
                    const sign = variance > 0 ? '+' : '';
                    return `<span class="${color} fw-bold">${sign}${variance}</span>`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    if ((data.system_qty || 0) === 0) return 'N/A';
                    const variance = (data.physical_qty || 0) - (data.system_qty || 0);
                    const variancePercent = ((variance / data.system_qty) * 100).toFixed(2);
                    const color = Math.abs(variancePercent) > 5 ? 'text-danger' : 'text-warning';
                    return `<span class="${color}">${variancePercent}%</span>`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    const variance = (data.physical_qty || 0) - (data.system_qty || 0);
                    const valueImpact = variance * (data.unit_price || 0);
                    return formatCurrency(valueImpact);
                }
            },
            { 
                data: null,
                render: function(data) {
                    return getVarianceStatusBadge(data);
                }
            },
            { 
                data: null,
                orderable: false,
                render: function(data) {
                    const variance = (data.physical_qty || 0) - (data.system_qty || 0);
                    if (variance === 0) {
                        return '<span class="text-muted">No action needed</span>';
                    }
                    return `
                        <button class="btn btn-sm btn-primary" onclick="openAdjustmentModal(${data.item_id || 0}, '${(data.item_name || '').replace(/'/g, "\\'")}', ${data.system_qty || 0}, ${data.physical_qty || 0}, ${variance})">
                            <i class="fas fa-sliders-h"></i> Adjust
                        </button>
                    `;
                }
            }
        ],
        order: [[5, 'desc']],
        pageLength: 25,
        language: {
            emptyTable: "No reconciliation data available"
        }
    });
}

// Load Reconciliation Data
async function loadReconciliationData() {
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/reports/reconciliation`);
        
        let data;
        if (!response.ok) {
            data = {
                items: [],
                summary: {
                    matched_items: 0,
                    surplus_items: 0,
                    shortage_items: 0,
                    surplus_value: 0,
                    shortage_value: 0
                }
            };
        } else {
            data = await response.json();
        }
        
        allReconciliationData = data.items || [];
        
        // Update summary cards
        updateSummaryCards(data.summary || {});
        
        // Populate table
        if (reconciliationTable) {
            reconciliationTable.clear();
            reconciliationTable.rows.add(allReconciliationData);
            reconciliationTable.draw();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading reconciliation data:', error);
        showNotification('Failed to load reconciliation data', 'error');
        hideLoader();
    }
}

// Update Summary Cards
function updateSummaryCards(summary) {
    const matchedEl = document.getElementById('matchedItems');
    const surplusEl = document.getElementById('surplusItems');
    const shortageEl = document.getElementById('shortageItems');
    const surplusValueEl = document.getElementById('surplusValue');
    const shortageValueEl = document.getElementById('shortageValue');
    const accuracyRateEl = document.getElementById('accuracyRate');
    
    if (matchedEl) matchedEl.textContent = summary.matched_items || 0;
    if (surplusEl) surplusEl.textContent = summary.surplus_items || 0;
    if (shortageEl) shortageEl.textContent = summary.shortage_items || 0;
    
    const surplusValue = summary.surplus_value || 0;
    const shortageValue = summary.shortage_value || 0;
    
    if (surplusValueEl) surplusValueEl.textContent = '+' + formatCurrency(surplusValue);
    if (shortageValueEl) shortageValueEl.textContent = '-' + formatCurrency(Math.abs(shortageValue));
    
    // Calculate accuracy rate
    const totalItems = (summary.matched_items || 0) + (summary.surplus_items || 0) + (summary.shortage_items || 0);
    const accuracyRate = totalItems > 0 ? ((summary.matched_items / totalItems) * 100).toFixed(1) : 0;
    if (accuracyRateEl) accuracyRateEl.textContent = accuracyRate + '%';
}

// Get Variance Status Badge
function getVarianceStatusBadge(item) {
    const variance = (item.physical_qty || 0) - (item.system_qty || 0);
    
    if (variance === 0) {
        return '<span class="badge bg-success">Matched</span>';
    } else if (variance > 0) {
        return '<span class="badge bg-info">Surplus</span>';
    } else {
        return '<span class="badge bg-danger">Shortage</span>';
    }
}

// Apply Filters
function applyFilters() {
    const countId = document.getElementById('filterCountDate')?.value;
    const warehouseId = document.getElementById('filterWarehouse')?.value;
    const varianceType = document.getElementById('filterVariance')?.value;
    
    let filteredData = [...allReconciliationData];
    
    // Filter by warehouse
    if (warehouseId) {
        filteredData = filteredData.filter(item => item.warehouse_id == warehouseId);
    }
    
    // Filter by variance type
    if (varianceType) {
        filteredData = filteredData.filter(item => {
            const variance = (item.physical_qty || 0) - (item.system_qty || 0);
            
            if (varianceType === 'matched') {
                return variance === 0;
            } else if (varianceType === 'surplus') {
                return variance > 0;
            } else if (varianceType === 'shortage') {
                return variance < 0;
            }
            return true;
        });
    }
    
    // Update table
    if (reconciliationTable) {
        reconciliationTable.clear();
        reconciliationTable.rows.add(filteredData);
        reconciliationTable.draw();
    }
}

// Open Adjustment Modal
function openAdjustmentModal(itemId, itemName, systemQty, physicalQty, variance) {
    const adjustItemIdEl = document.getElementById('adjustItemId');
    const adjustItemNameEl = document.getElementById('adjustItemName');
    const adjustSystemQtyEl = document.getElementById('adjustSystemQty');
    const adjustPhysicalQtyEl = document.getElementById('adjustPhysicalQty');
    const adjustVarianceEl = document.getElementById('adjustVariance');
    
    if (adjustItemIdEl) adjustItemIdEl.value = itemId;
    if (adjustItemNameEl) adjustItemNameEl.textContent = itemName;
    if (adjustSystemQtyEl) adjustSystemQtyEl.textContent = systemQty;
    if (adjustPhysicalQtyEl) adjustPhysicalQtyEl.textContent = physicalQty;
    
    const varianceColor = variance > 0 ? 'text-success' : 'text-danger';
    const varianceSign = variance > 0 ? '+' : '';
    if (adjustVarianceEl) {
        adjustVarianceEl.innerHTML = `<span class="${varianceColor} fw-bold">${varianceSign}${variance}</span>`;
    }
    
    // Reset form
    const adjustReasonEl = document.getElementById('adjustReason');
    const adjustNotesEl = document.getElementById('adjustNotes');
    if (adjustReasonEl) adjustReasonEl.value = '';
    if (adjustNotesEl) adjustNotesEl.value = '';
    
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('adjustmentModal'));
        modal.show();
    }
}

// Submit Adjustment
async function submitAdjustment() {
    const adjustItemIdEl = document.getElementById('adjustItemId');
    const adjustReasonEl = document.getElementById('adjustReason');
    const adjustNotesEl = document.getElementById('adjustNotes');
    const adjustSystemQtyEl = document.getElementById('adjustSystemQty');
    const adjustPhysicalQtyEl = document.getElementById('adjustPhysicalQty');
    
    const itemId = adjustItemIdEl?.value;
    const reason = adjustReasonEl?.value;
    const notes = adjustNotesEl?.value;
    
    if (!reason) {
        showNotification('Please select a reason for variance', 'warning');
        return;
    }
    
    const systemQty = parseInt(adjustSystemQtyEl?.textContent || 0);
    const physicalQty = parseInt(adjustPhysicalQtyEl?.textContent || 0);
    
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/stock/adjust`, {
            method: 'POST',
            body: JSON.stringify({
                item_id: itemId,
                adjustment_qty: physicalQty - systemQty,
                reason: reason,
                notes: notes,
                reference_type: 'Stock Count',
                reference_id: document.getElementById('filterCountDate')?.value || null
            })
        });
        
        if (!response.ok) throw new Error('Failed to create adjustment');
        
        // Close modal
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('adjustmentModal'));
            if (modal) modal.hide();
        }
        
        hideLoader();
        showNotification('Stock adjustment created successfully', 'success');
        
        // Reload data
        loadReconciliationData();
        loadAdjustmentHistory();
    } catch (error) {
        console.error('Error creating adjustment:', error);
        showNotification('Failed to create adjustment', 'error');
        hideLoader();
    }
}

// Load Adjustment History
async function loadAdjustmentHistory() {
    try {
        const response = await fetchWithAuth(`${API_URL}/stock/adjustments?limit=10`);
        
        let adjustments = [];
        if (response.ok) {
            adjustments = await response.json();
        }
        
        const tbody = document.getElementById('adjustmentHistory');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (adjustments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent adjustments</td></tr>';
            return;
        }
        
        adjustments.forEach(adj => {
            const sign = (adj.adjustment_qty || 0) > 0 ? '+' : '';
            const color = (adj.adjustment_qty || 0) > 0 ? 'text-success' : 'text-danger';
            
            const row = `
                <tr>
                    <td>${formatDate(adj.created_at)}</td>
                    <td>${adj.item_name || ''}</td>
                    <td><span class="${color} fw-bold">${sign}${adj.adjustment_qty || 0}</span></td>
                    <td>${adj.reason || ''}</td>
                    <td>${adj.created_by_name || ''}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading adjustment history:', error);
    }
}

// Start New Stock Count
function startStockCount() {
    // Navigate to stock count page
    showNotification('Stock count feature coming soon', 'info');
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const tableData = reconciliationTable ? reconciliationTable.rows().data().toArray() : allReconciliationData;
        
        const excelData = [
            ['Stock Reconciliation Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Item Name', 'SKU', 'Warehouse', 'System Qty', 'Physical Qty', 'Variance', 'Variance %', 'Value Impact', 'Status']
        ];
        
        tableData.forEach(item => {
            const variance = (item.physical_qty || 0) - (item.system_qty || 0);
            const variancePercent = (item.system_qty || 0) > 0 ? ((variance / item.system_qty) * 100).toFixed(2) : 'N/A';
            const valueImpact = variance * (item.unit_price || 0);
            const status = variance === 0 ? 'Matched' : variance > 0 ? 'Surplus' : 'Shortage';
            
            excelData.push([
                item.item_name || '',
                item.sku || '',
                item.warehouse_name || '',
                item.system_qty || 0,
                item.physical_qty || 0,
                variance,
                variancePercent + '%',
                valueImpact,
                status
            ]);
        });
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reconciliation");
            XLSX.writeFile(wb, `Stock_Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        doc.text('Stock Reconciliation Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = reconciliationTable ? reconciliationTable.rows().data().toArray() : allReconciliationData;
        const rows = tableData.map(item => {
            const variance = (item.physical_qty || 0) - (item.system_qty || 0);
            const variancePercent = (item.system_qty || 0) > 0 ? ((variance / item.system_qty) * 100).toFixed(1) : 'N/A';
            
            return [
                (item.item_name || '').substring(0, 20),
                item.sku || '',
                (item.warehouse_name || '').substring(0, 12),
                item.system_qty || 0,
                item.physical_qty || 0,
                variance,
                variancePercent + '%'
            ];
        });
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 35,
                head: [['Item', 'SKU', 'Warehouse', 'System', 'Physical', 'Variance', 'Var %']],
                body: rows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [156, 39, 176] }
            });
        }
        
        doc.save(`Stock_Reconciliation_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoader();
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Failed to export PDF', 'error');
        hideLoader();
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

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

