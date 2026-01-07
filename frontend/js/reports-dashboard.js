// ========================================
// REPORTS & ANALYTICS DASHBOARD
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let abcChart, agingChart, turnoverChart, supplierChart;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDateRange();
    loadDashboardData();
});

// Initialize Date Range Picker
function initializeDateRange() {
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#dateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [
                new Date(new Date().setMonth(new Date().getMonth() - 1)),
                new Date()
            ],
            onChange: function(selectedDates, dateStr, instance) {
                if (selectedDates.length === 2) {
                    loadDashboardData();
                }
            }
        });
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        showLoader();
        
        console.log('Loading dashboard data...');
        
        // Fetch all analytics data with individual error handling
        const [abcResult, agingResult, turnoverResult, fastMoversResult, slowMoversResult, supplierResult] = await Promise.allSettled([
            fetchABCAnalysis(),
            fetchStockAging(),
            fetchTurnoverTrends(),
            fetchFastMovers(),
            fetchSlowMovers(),
            fetchSupplierPerformance()
        ]);
        
        // Handle ABC Analysis
        if (abcResult.status === 'fulfilled' && abcResult.value.success) {
            renderABCChart(abcResult.value);
        } else {
            console.error('ABC Analysis failed:', abcResult.reason || abcResult.value);
            showEmptyStateForChart('abcChart', 'ABC Analysis data unavailable');
        }
        
        // Handle Stock Aging
        if (agingResult.status === 'fulfilled' && agingResult.value.success) {
            renderAgingChart(agingResult.value);
        } else {
            console.error('Stock Aging failed:', agingResult.reason || agingResult.value);
            showEmptyStateForChart('agingChart', 'Stock aging data unavailable');
        }
        
        // Handle Turnover
        if (turnoverResult.status === 'fulfilled' && turnoverResult.value.success) {
            renderTurnoverChart(turnoverResult.value);
        } else {
            console.error('Turnover failed:', turnoverResult.reason || turnoverResult.value);
            showEmptyStateForChart('turnoverChart', 'Turnover data unavailable');
        }
        
        // Handle Fast Movers
        if (fastMoversResult.status === 'fulfilled' && fastMoversResult.value.success) {
            populateFastMovers(fastMoversResult.value.items || fastMoversResult.value.data?.items || []);
        } else {
            console.error('Fast Movers failed:', fastMoversResult.reason || fastMoversResult.value);
            const fastMoversTable = document.getElementById('fastMoversTable');
            if (fastMoversTable) {
                fastMoversTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No data available</td></tr>';
            }
        }
        
        // Handle Slow Movers
        if (slowMoversResult.status === 'fulfilled' && slowMoversResult.value.success) {
            populateSlowMovers(slowMoversResult.value.items || slowMoversResult.value.data?.items || []);
        } else {
            console.error('Slow Movers failed:', slowMoversResult.reason || slowMoversResult.value);
            const slowMoversTable = document.getElementById('slowMoversTable');
            if (slowMoversTable) {
                slowMoversTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No data available</td></tr>';
            }
        }
        
        // Handle Supplier Performance
        if (supplierResult.status === 'fulfilled' && supplierResult.value.success) {
            renderSupplierChart(supplierResult.value.suppliers || supplierResult.value.data?.suppliers || []);
        } else {
            console.error('Supplier Performance failed:', supplierResult.reason || supplierResult.value);
            showEmptyStateForChart('supplierChart', 'Supplier data unavailable');
        }
        
        hideLoader();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (window.Notify) {
            window.Notify.error('Failed to load dashboard data. Please refresh the page.');
        } else {
            alert('Failed to load dashboard data');
        }
        hideLoader();
    }
}

// Helper to show empty state for charts
function showEmptyStateForChart(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    // Check if empty state already exists
    if (container.querySelector('.chart-empty-state')) return;
    
    canvas.style.display = 'none';
    
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'chart-empty-state text-center text-muted p-4';
    emptyDiv.innerHTML = `
        <i class="fas fa-chart-pie fa-3x mb-3" style="opacity: 0.3;"></i>
        <p>${message}</p>
    `;
    
    container.appendChild(emptyDiv);
}

// ========================================
// ABC ANALYSIS CHART
// ========================================

async function fetchABCAnalysis() {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/abc-analysis`);
        if (!response.ok) {
            console.error('ABC Analysis API error:', response.status, response.statusText);
            return { success: false, error: 'API call failed' };
        }
        const json = await response.json();
        // Backend wraps response in { success: true, data: {...} }
        const data = json.data || json;
        return { success: true, ...data };
    } catch (error) {
        console.error('ABC Analysis fetch error:', error);
        return { success: false, error: error.message };
    }
}

function renderABCChart(data) {
    const ctx = document.getElementById('abcChart');
    if (!ctx) {
        console.error('ABC chart canvas not found');
        return;
    }
    
    // Validate data
    if (!data || !data.success || !data.summary) {
        console.error('Invalid ABC data:', data);
        showEmptyStateForChart('abcChart', 'ABC Analysis data unavailable');
        return;
    }
    
    const summary = data.summary;
    
    // Destroy existing chart
    if (abcChart) {
        abcChart.destroy();
    }
    
    const categoryA = summary.category_a || {};
    const categoryB = summary.category_b || {};
    const categoryC = summary.category_c || {};
    
    abcChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: [
                `Category A (${categoryA.item_count || 0} items)`,
                `Category B (${categoryB.item_count || 0} items)`,
                `Category C (${categoryC.item_count || 0} items)`
            ],
            datasets: [{
                data: [
                    categoryA.item_count || 0,
                    categoryB.item_count || 0,
                    categoryC.item_count || 0
                ],
                backgroundColor: [
                    '#4A90E2',
                    '#FFC107',
                    '#6C757D'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} items (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Update counts
    if (document.getElementById('categoryACount')) {
        document.getElementById('categoryACount').textContent = categoryA.item_count || 0;
        document.getElementById('categoryBCount').textContent = categoryB.item_count || 0;
        document.getElementById('categoryCCount').textContent = categoryC.item_count || 0;
    }
}

// ========================================
// STOCK AGING CHART
// ========================================

async function fetchStockAging() {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/stock-aging`);
        if (!response.ok) {
            console.error('Stock Aging API error:', response.status, response.statusText);
            return { success: false, error: 'API call failed' };
        }
        const json = await response.json();
        const data = json.data || json;
        return { success: true, ...data };
    } catch (error) {
        console.error('Stock Aging fetch error:', error);
        return { success: false, error: error.message };
    }
}

function renderAgingChart(data) {
    const ctx = document.getElementById('agingChart');
    if (!ctx) {
        console.error('Aging chart canvas not found');
        return;
    }
    
    // Validate data
    if (!data || !data.success || !data.summary) {
        console.error('Invalid aging data:', data);
        showEmptyStateForChart('agingChart', 'Stock aging data unavailable');
        return;
    }
    
    const summary = data.summary;
    const brackets = summary.aging_brackets || {};
    
    // Destroy existing chart
    if (agingChart) {
        agingChart.destroy();
    }
    
    agingChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['0-30 Days', '31-60 Days', '61-90 Days', '91-180 Days', '180+ Days'],
            datasets: [
                {
                    label: 'Quantity',
                    data: [
                        brackets['0_30_days']?.quantity || 0,
                        brackets['31_60_days']?.quantity || 0,
                        brackets['61_90_days']?.quantity || 0,
                        brackets['91_180_days']?.quantity || 0,
                        brackets['180_plus_days']?.quantity || 0
                    ],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.7)',
                        'rgba(255, 193, 7, 0.7)',
                        'rgba(255, 152, 0, 0.7)',
                        'rgba(220, 53, 69, 0.7)'
                    ],
                    borderColor: [
                        '#28a745',
                        '#ffc107',
                        '#ff9800',
                        '#dc3545'
                    ],
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Quantity: ${context.parsed.y} units`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                }
            }
        }
    });
}

// ========================================
// TURNOVER TRENDS CHART
// ========================================

async function fetchTurnoverTrends() {
    try {
        // Turnover endpoint requires start_date and end_date
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        const response = await fetchWithAuth(`${API_URL}/analytics/turnover?start_date=${startDateStr}&end_date=${endDate}`);
        if (!response.ok) {
            console.error('Turnover Trends API error:', response.status, response.statusText);
            return { success: false, error: 'API call failed' };
        }
        const json = await response.json();
        const data = json.data || json;
        
        // Convert to chart format if needed
        if (data.overall_metrics) {
            // Return simplified format for trend chart
            return { 
                success: true, 
                labels: ['Current Period'],
                values: [data.overall_metrics.overall_turnover_ratio || 0]
            };
        }
        
        return { success: true, ...data };
    } catch (error) {
        console.error('Turnover Trends fetch error:', error);
        return { success: false, error: error.message };
    }
}

function renderTurnoverChart(data) {
    const ctx = document.getElementById('turnoverChart');
    if (!ctx) {
        console.error('Turnover chart canvas not found');
        return;
    }
    
    // Validate data
    if (!data || !data.success) {
        console.error('Invalid turnover data:', data);
        showEmptyStateForChart('turnoverChart', 'Turnover data unavailable');
        return;
    }
    
    // Destroy existing chart
    if (turnoverChart) {
        turnoverChart.destroy();
    }
    
    // Extract chart data
    const labels = data.labels || ['Current Period'];
    const values = data.values || [data.overall_metrics?.overall_turnover_ratio || 0];
    
    turnoverChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Turnover Ratio',
                data: values,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#4A90E2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
                        text: 'Turnover Ratio'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month'
                    }
                }
            }
        }
    });
}

// Update turnover period
const turnoverPeriodSelect = document.getElementById('turnoverPeriod');
if (turnoverPeriodSelect) {
    turnoverPeriodSelect.addEventListener('change', async function() {
        const data = await fetchTurnoverTrends();
        renderTurnoverChart(data);
    });
}

// ========================================
// FAST & SLOW MOVERS
// ========================================

async function fetchFastMovers() {
    try {
        // Note: Fast movers endpoint may not exist, using turnover data instead
        const response = await fetchWithAuth(`${API_URL}/analytics/turnover?start_date=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`);
        if (!response.ok) {
            console.error('Fast Movers API error:', response.status, response.statusText);
            return { success: false, items: [] };
        }
        const json = await response.json();
        const data = json.data || json;
        
        // Extract fast movers from turnover data (items with turnover > 3)
        const fastMovers = (data.items || []).filter(item => item.turnover_ratio > 3).slice(0, 10);
        
        return { success: true, items: fastMovers };
    } catch (error) {
        console.error('Fast Movers fetch error:', error);
        return { success: false, items: [] };
    }
}

async function fetchSlowMovers() {
    try {
        // Note: Slow movers endpoint may not exist, using turnover data instead
        const response = await fetchWithAuth(`${API_URL}/analytics/turnover?start_date=${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`);
        if (!response.ok) {
            console.error('Slow Movers API error:', response.status, response.statusText);
            return { success: false, items: [] };
        }
        const json = await response.json();
        const data = json.data || json;
        
        // Extract slow movers from turnover data (items with turnover < 1 or 0)
        const slowMovers = (data.items || []).filter(item => (item.turnover_ratio || 0) < 1).slice(0, 10);
        
        return { success: true, items: slowMovers };
    } catch (error) {
        console.error('Slow Movers fetch error:', error);
        return { success: false, items: [] };
    }
}

function populateFastMovers(items) {
    const tbody = document.getElementById('fastMoversTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No fast moving items found</td></tr>';
        return;
    }
    
    items.slice(0, 10).forEach((item, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${item.item_name || item.item?.item_name || 'N/A'}</td>
                <td><span class="badge bg-success">${(item.turnover_ratio || item.annualized_turnover_ratio || 0).toFixed(2)}x</span></td>
                <td>${item.issues_during_period || item.quantity_sold || 0}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function populateSlowMovers(items) {
    const tbody = document.getElementById('slowMoversTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No slow moving items found</td></tr>';
        return;
    }
    
    items.slice(0, 10).forEach((item, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${item.item_name || item.item?.item_name || 'N/A'}</td>
                <td><span class="badge bg-warning">${(item.turnover_ratio || item.annualized_turnover_ratio || 0).toFixed(2)}x</span></td>
                <td>${item.days_in_stock || item.days_of_supply || 0}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ========================================
// SUPPLIER PERFORMANCE CHART
// ========================================

async function fetchSupplierPerformance() {
    try {
        const response = await fetchWithAuth(`${API_URL}/analytics/supplier-performance`);
        if (!response.ok) {
            console.error('Supplier Performance API error:', response.status, response.statusText);
            return { success: false, suppliers: [] };
        }
        const json = await response.json();
        const data = json.data || json;
        return { success: true, suppliers: data.suppliers || [] };
    } catch (error) {
        console.error('Supplier Performance fetch error:', error);
        return { success: false, suppliers: [] };
    }
}

function renderSupplierChart(suppliers) {
    const ctx = document.getElementById('supplierChart');
    if (!ctx) {
        console.error('Supplier chart canvas not found');
        return;
    }
    
    // Validate data
    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
        console.error('Invalid supplier data:', suppliers);
        showEmptyStateForChart('supplierChart', 'Supplier performance data unavailable');
        return;
    }
    
    // Destroy existing chart
    if (supplierChart) {
        supplierChart.destroy();
    }
    
    // Take top 5 suppliers
    const topSuppliers = suppliers.slice(0, 5);
    
    supplierChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topSuppliers.map(s => s.supplier_name || 'Unknown'),
            datasets: [
                {
                    label: 'On-Time Delivery %',
                    data: topSuppliers.map(s => s.metrics?.on_time_delivery_rate || s.on_time_percentage || 0),
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: '#28a745',
                    borderWidth: 1
                },
                {
                    label: 'Quality Rate %',
                    data: topSuppliers.map(s => s.metrics?.quality_acceptance_rate || s.quality_rate || 0),
                    backgroundColor: 'rgba(74, 144, 226, 0.7)',
                    borderColor: '#4A90E2',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage'
                    }
                }
            }
        }
    });
}

// ========================================
// DOWNLOAD FUNCTIONS
// ========================================

async function downloadABCReport() {
    try {
        showLoader();
        const data = await fetchABCAnalysis();
        
        // Prepare data for Excel
        const excelData = [
            ['ABC Analysis Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Category', 'Item Count', 'Total Value', 'Percentage'],
            ['Category A (High Value)', data.categoryA?.count || 0, formatCurrency(data.categoryA?.value || 0), '80%'],
            ['Category B (Medium Value)', data.categoryB?.count || 0, formatCurrency(data.categoryB?.value || 0), '15%'],
            ['Category C (Low Value)', data.categoryC?.count || 0, formatCurrency(data.categoryC?.value || 0), '5%']
        ];
        
        exportToExcelFile(excelData, 'ABC_Analysis_Report');
        hideLoader();
    } catch (error) {
        console.error('Error downloading report:', error);
        showNotification('Failed to download report', 'error');
        hideLoader();
    }
}

async function downloadAgingReport() {
    try {
        showLoader();
        const data = await fetchStockAging();
        
        const excelData = [
            ['Stock Aging Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Age Range', 'Quantity', 'Value'],
            ['0-30 Days', data.range_0_30?.quantity || 0, formatCurrency(data.range_0_30?.value || 0)],
            ['31-60 Days', data.range_31_60?.quantity || 0, formatCurrency(data.range_31_60?.value || 0)],
            ['61-90 Days', data.range_61_90?.quantity || 0, formatCurrency(data.range_61_90?.value || 0)],
            ['90+ Days', data.range_90_plus?.quantity || 0, formatCurrency(data.range_90_plus?.value || 0)]
        ];
        
        exportToExcelFile(excelData, 'Stock_Aging_Report');
        hideLoader();
    } catch (error) {
        console.error('Error downloading report:', error);
        showNotification('Failed to download report', 'error');
        hideLoader();
    }
}

async function downloadTurnoverReport() {
    try {
        showLoader();
        const data = await fetchTurnoverTrends();
        
        const excelData = [
            ['Stock Turnover Trends'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Month', 'Turnover Ratio']
        ];
        
        (data.labels || []).forEach((label, index) => {
            excelData.push([label, data.values?.[index] || 0]);
        });
        
        exportToExcelFile(excelData, 'Turnover_Trends_Report');
        hideLoader();
    } catch (error) {
        console.error('Error downloading report:', error);
        showNotification('Failed to download report', 'error');
        hideLoader();
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function exportToExcelFile(data, filename) {
    if (typeof XLSX === 'undefined') {
        showNotification('Excel export library not loaded', 'error');
        return;
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function showLoader() {
    document.body.style.cursor = 'wait';
}

function hideLoader() {
    document.body.style.cursor = 'default';
}

function showNotification(message, type) {
    // Simple alert for now - can be enhanced with toast notifications
    alert(message);
}

