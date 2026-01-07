// ========================================
// STOCK SUMMARY REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let stockSummaryTable;
let allStockData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setReportDate();
    loadFilters();
    initializeStockSummaryTable();
    loadStockSummaryData();
});

// Set current date
function setReportDate() {
    const today = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const dateEl = document.getElementById('reportDate');
    if (dateEl) dateEl.textContent = today;
}

// Load Filter Options
async function loadFilters() {
    try {
        // Load categories
        const categoriesResponse = await fetchWithAuth(`${API_URL}/categories`);
        if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const categorySelect = document.getElementById('filterCategory');
            if (categorySelect) {
                categories.forEach(cat => {
                    categorySelect.innerHTML += `<option value="${cat.category_id}">${cat.category_name}</option>`;
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
function initializeStockSummaryTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.dataTable === 'undefined') {
        console.error('jQuery or DataTables not loaded');
        return;
    }
    
    stockSummaryTable = $('#stockSummaryTable').DataTable({
        columns: [
            { data: 'sku' },
            { data: 'item_name' },
            { data: 'category_name' },
            { data: 'warehouse_name' },
            { 
                data: 'current_stock',
                render: function(data) {
                    return `<strong>${data || 0}</strong>`;
                }
            },
            { 
                data: 'reorder_point',
                render: function(data) {
                    return data || 'N/A';
                }
            },
            { 
                data: 'unit_price',
                render: function(data) {
                    return formatCurrency(data || 0);
                }
            },
            { 
                data: null,
                render: function(data) {
                    const value = (data.current_stock || 0) * (data.unit_price || 0);
                    return formatCurrency(value);
                }
            },
            { 
                data: null,
                render: function(data) {
                    return getStockStatusBadge(data);
                }
            }
        ],
        order: [[1, 'asc']],
        pageLength: 25,
        language: {
            emptyTable: "No stock data available"
        },
        footerCallback: function(row, data, start, end, display) {
            let totalValue = 0;
            data.forEach(item => {
                totalValue += (item.current_stock || 0) * (item.unit_price || 0);
            });
            const totalEl = document.getElementById('totalStockValue');
            if (totalEl) totalEl.textContent = formatCurrency(totalValue);
        }
    });
}

// Load Stock Summary Data
async function loadStockSummaryData() {
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/reports/stock-summary`);
        
        let data;
        if (!response.ok) {
            // Mock data for testing
            data = {
                items: [],
                summary: {
                    total_items: 0,
                    total_value: 0,
                    low_stock_items: 0,
                    out_of_stock: 0
                }
            };
        } else {
            data = await response.json();
        }
        
        allStockData = data.items || [];
        
        // Update summary cards
        updateSummaryCards(data.summary || {});
        
        // Populate table
        if (stockSummaryTable) {
            stockSummaryTable.clear();
            stockSummaryTable.rows.add(allStockData);
            stockSummaryTable.draw();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading stock summary:', error);
        showNotification('Failed to load stock summary data', 'error');
        hideLoader();
    }
}

// Update Summary Cards
function updateSummaryCards(summary) {
    const totalItemsEl = document.getElementById('totalItems');
    const totalValueEl = document.getElementById('totalValue');
    const lowStockEl = document.getElementById('lowStockItems');
    const outOfStockEl = document.getElementById('outOfStock');
    
    if (totalItemsEl) totalItemsEl.textContent = summary.total_items || 0;
    if (totalValueEl) totalValueEl.textContent = formatCurrency(summary.total_value || 0);
    if (lowStockEl) lowStockEl.textContent = summary.low_stock_items || 0;
    if (outOfStockEl) outOfStockEl.textContent = summary.out_of_stock || 0;
}

// Get Stock Status Badge
function getStockStatusBadge(item) {
    const currentStock = item.current_stock || 0;
    const reorderPoint = item.reorder_point || 0;
    
    if (currentStock === 0) {
        return '<span class="status-badge out-of-stock">Out of Stock</span>';
    } else if (currentStock < reorderPoint) {
        return '<span class="status-badge low-stock">Low Stock</span>';
    } else {
        return '<span class="status-badge good-stock">Good Stock</span>';
    }
}

// Apply Filters
function applyFilters() {
    const categoryId = document.getElementById('filterCategory')?.value;
    const warehouseId = document.getElementById('filterWarehouse')?.value;
    const status = document.getElementById('filterStatus')?.value;
    
    let filteredData = [...allStockData];
    
    // Filter by category
    if (categoryId) {
        filteredData = filteredData.filter(item => item.category_id == categoryId);
    }
    
    // Filter by warehouse
    if (warehouseId) {
        filteredData = filteredData.filter(item => item.warehouse_id == warehouseId);
    }
    
    // Filter by status
    if (status) {
        filteredData = filteredData.filter(item => {
            const currentStock = item.current_stock || 0;
            const reorderPoint = item.reorder_point || 0;
            
            if (status === 'good') {
                return currentStock >= reorderPoint && currentStock > 0;
            } else if (status === 'low') {
                return currentStock < reorderPoint && currentStock > 0;
            } else if (status === 'out') {
                return currentStock === 0;
            }
            return true;
        });
    }
    
    // Update table
    if (stockSummaryTable) {
        stockSummaryTable.clear();
        stockSummaryTable.rows.add(filteredData);
        stockSummaryTable.draw();
    }
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const tableData = stockSummaryTable ? stockSummaryTable.rows().data().toArray() : allStockData;
        
        const excelData = [
            ['Stock Summary Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['SKU', 'Item Name', 'Category', 'Warehouse', 'Current Stock', 'Reorder Point', 'Unit Price', 'Stock Value', 'Status']
        ];
        
        tableData.forEach(item => {
            const status = item.current_stock === 0 ? 'Out of Stock' : 
                          (item.current_stock || 0) < (item.reorder_point || 0) ? 'Low Stock' : 'Good Stock';
            
            excelData.push([
                item.sku || '',
                item.item_name || '',
                item.category_name || '',
                item.warehouse_name || '',
                item.current_stock || 0,
                item.reorder_point || 'N/A',
                item.unit_price || 0,
                (item.current_stock || 0) * (item.unit_price || 0),
                status
            ]);
        });
        
        // Calculate total
        const totalValue = tableData.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_price || 0)), 0);
        excelData.push([]);
        excelData.push(['', '', '', '', '', '', 'Total Value:', totalValue]);
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock Summary");
            XLSX.writeFile(wb, `Stock_Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        
        // Title
        doc.setFontSize(18);
        doc.text('Stock Summary Report', 14, 20);
        
        // Date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        // Table
        const tableData = stockSummaryTable ? stockSummaryTable.rows().data().toArray() : allStockData;
        const rows = tableData.map(item => [
            item.sku || '',
            (item.item_name || '').substring(0, 20),
            (item.category_name || '').substring(0, 15),
            (item.warehouse_name || '').substring(0, 15),
            item.current_stock || 0,
            item.reorder_point || 'N/A',
            formatCurrency(item.unit_price || 0),
            formatCurrency((item.current_stock || 0) * (item.unit_price || 0)),
            item.current_stock === 0 ? 'Out' : (item.current_stock || 0) < (item.reorder_point || 0) ? 'Low' : 'Good'
        ]);
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 35,
                head: [['SKU', 'Item Name', 'Category', 'Warehouse', 'Stock', 'Reorder Pt', 'Unit Price', 'Value', 'Status']],
                body: rows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [74, 144, 226] }
            });
        }
        
        doc.save(`Stock_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
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

