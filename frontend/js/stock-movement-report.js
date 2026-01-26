// ========================================
// STOCK MOVEMENT REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let movementTable;
let movementTrendChart;
let allMovements = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDateRange();
    loadFilters();
    initializeMovementTable();
    loadMovementData();
});

// Initialize Date Range Picker
function initializeDateRange() {
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#dateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [
                new Date(new Date().setDate(new Date().getDate() - 30)),
                new Date()
            ],
            maxDate: new Date()
        });
    }
}

// Load Filter Options
async function loadFilters() {
    try {
        // Load items
        const itemsResponse = await fetchWithAuth(`${API_URL}/items`);
        if (itemsResponse.ok) {
            const items = await itemsResponse.json();
            const itemSelect = document.getElementById('filterItem');
            if (itemSelect) {
                items.forEach(item => {
                    itemSelect.innerHTML += `<option value="${item.item_id}">${item.item_name}</option>`;
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
function initializeMovementTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.dataTable === 'undefined') {
        console.error('jQuery or DataTables not loaded');
        return;
    }
    
    movementTable = $('#movementTable').DataTable({
        columns: [
            { 
                data: 'transaction_date',
                render: function(data) {
                    return formatDateTime(data);
                }
            },
            { data: 'item_name' },
            { 
                data: 'transaction_type',
                render: function(data) {
                    return getTransactionTypeBadge(data);
                }
            },
            { 
                data: 'from_location',
                render: function(data) {
                    return data || '-';
                }
            },
            { 
                data: 'to_location',
                render: function(data) {
                    return data || '-';
                }
            },
            { 
                data: null,
                render: function(data) {
                    const sign = ['GRN', 'Adjustment_In', 'Transfer_In'].includes(data.transaction_type) ? '+' : '-';
                    const color = sign === '+' ? 'text-success' : 'text-danger';
                    return `<span class="${color} fw-bold">${sign}${data.quantity || 0}</span>`;
                }
            },
            { 
                data: 'balance_qty',
                render: function(data) {
                    return `<strong>${data || 0}</strong>`;
                }
            },
            { 
                data: null,
                render: function(data) {
                    return `${data.reference_type || 'N/A'}: ${data.reference_id || '-'}`;
                }
            },
            { data: 'created_by_name' }
        ],
        order: [[0, 'desc']],
        pageLength: 25,
        language: {
            emptyTable: "No stock movements found"
        }
    });
}

// Load Movement Data
async function loadMovementData() {
    try {
        showLoader();
        
        const dateRange = document.getElementById('dateRange')?.value;
        let startDate, endDate;
        
        if (dateRange) {
            const dates = dateRange.split(' to ');
            startDate = dates[0];
            endDate = dates[1] || dates[0];
        } else {
            endDate = new Date().toISOString().split('T')[0];
            startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
        }
        
        const response = await fetchWithAuth(
            `${API_URL}/reports/stock-movement?start_date=${startDate}&end_date=${endDate}`
        );
        
        let data;
        if (!response.ok) {
            data = {
                movements: [],
                summary: {
                    grn_count: 0,
                    grn_qty: 0,
                    transfer_count: 0,
                    transfer_qty: 0,
                    issue_count: 0,
                    issue_qty: 0,
                    adjustment_count: 0,
                    adjustment_qty: 0
                },
                trend_data: {
                    labels: [],
                    grn: [],
                    transfers: [],
                    issues: [],
                    adjustments: []
                }
            };
        } else {
            data = await response.json();
        }
        
        allMovements = data.movements || [];
        
        // Update summary statistics
        updateMovementSummary(data.summary || {});
        
        // Render trend chart
        renderMovementTrendChart(data.trend_data || {});
        
        // Populate table
        if (movementTable) {
            movementTable.clear();
            movementTable.rows.add(allMovements);
            movementTable.draw();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading movement data:', error);
        showNotification('Failed to load movement data', 'error');
        hideLoader();
    }
}

// Update Movement Summary
function updateMovementSummary(summary) {
    const grnCountEl = document.getElementById('grnCount');
    const grnQtyEl = document.getElementById('grnQty');
    const transferCountEl = document.getElementById('transferCount');
    const transferQtyEl = document.getElementById('transferQty');
    const issueCountEl = document.getElementById('issueCount');
    const issueQtyEl = document.getElementById('issueQty');
    const adjustmentCountEl = document.getElementById('adjustmentCount');
    const adjustmentQtyEl = document.getElementById('adjustmentQty');
    
    if (grnCountEl) grnCountEl.textContent = summary.grn_count || 0;
    if (grnQtyEl) grnQtyEl.textContent = `${summary.grn_qty || 0} units`;
    if (transferCountEl) transferCountEl.textContent = summary.transfer_count || 0;
    if (transferQtyEl) transferQtyEl.textContent = `${summary.transfer_qty || 0} units`;
    if (issueCountEl) issueCountEl.textContent = summary.issue_count || 0;
    if (issueQtyEl) issueQtyEl.textContent = `${summary.issue_qty || 0} units`;
    if (adjustmentCountEl) adjustmentCountEl.textContent = summary.adjustment_count || 0;
    if (adjustmentQtyEl) adjustmentQtyEl.textContent = `${summary.adjustment_qty || 0} units`;
}

// Render Movement Trend Chart
function renderMovementTrendChart(trendData) {
    const ctx = document.getElementById('movementTrendChart');
    if (!ctx) return;
    
    if (movementTrendChart) {
        movementTrendChart.destroy();
    }
    
    movementTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: trendData.labels || [],
            datasets: [
                {
                    label: 'GRN',
                    data: trendData.grn || [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Transfers',
                    data: trendData.transfers || [],
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Issues',
                    data: trendData.issues || [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Adjustments',
                    data: trendData.adjustments || [],
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

// Get Transaction Type Badge
function getTransactionTypeBadge(type) {
    const badges = {
        'GRN': '<span class="badge bg-success">GRN</span>',
        'Transfer': '<span class="badge bg-info">Transfer</span>',
        'Transfer_In': '<span class="badge bg-info">Transfer In</span>',
        'Transfer_Out': '<span class="badge bg-warning">Transfer Out</span>',
        'Issue': '<span class="badge bg-warning">Issue</span>',
        'Adjustment': '<span class="badge bg-secondary">Adjustment</span>',
        'Adjustment_In': '<span class="badge bg-success">Adjustment +</span>',
        'Adjustment_Out': '<span class="badge bg-danger">Adjustment -</span>'
    };
    
    return badges[type] || `<span class="badge bg-secondary">${type || 'N/A'}</span>`;
}

// Apply Filters
function applyFilters() {
    loadMovementData();
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const tableData = movementTable ? movementTable.rows().data().toArray() : allMovements;
        
        const excelData = [
            ['Stock Movement Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Date & Time', 'Item', 'Type', 'From', 'To', 'Quantity', 'Balance', 'Reference', 'User']
        ];
        
        tableData.forEach(movement => {
            excelData.push([
                formatDateTime(movement.transaction_date),
                movement.item_name || '',
                movement.transaction_type || '',
                movement.from_location || '-',
                movement.to_location || '-',
                movement.quantity || 0,
                movement.balance_qty || 0,
                `${movement.reference_type || 'N/A'}: ${movement.reference_id || '-'}`,
                movement.created_by_name || ''
            ]);
        });
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock Movement");
            XLSX.writeFile(wb, `Stock_Movement_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        doc.text('Stock Movement Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = movementTable ? movementTable.rows().data().toArray() : allMovements;
        const rows = tableData.map(movement => [
            formatDateTime(movement.transaction_date).substring(0, 16),
            (movement.item_name || '').substring(0, 20),
            movement.transaction_type || '',
            (movement.from_location || '-').substring(0, 12),
            (movement.to_location || '-').substring(0, 12),
            movement.quantity || 0,
            movement.balance_qty || 0
        ]);
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 35,
                head: [['Date', 'Item', 'Type', 'From', 'To', 'Qty', 'Balance']],
                body: rows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [23, 162, 184] }
            });
        }
        
        doc.save(`Stock_Movement_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoader();
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Failed to export PDF', 'error');
        hideLoader();
    }
}

// Utility Functions
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

