/**
 * Manager Dashboard Specific Functionality
 */

let stockHealthChart = null;
let abcChart = null;

// ============================================
// LOAD MANAGER DASHBOARD
// ============================================
async function loadManagerDashboard() {
    try {
        await Promise.all([
            loadManagerStats(),
            loadStockHealthChart(),
            loadReorderAlertsTable(),
            loadExpiryAlerts(),
            loadABCChart(),
            loadTurnoverMetrics()
        ]);
    } catch (error) {
        console.error('Error loading manager dashboard:', error);
    }
}

// ============================================
// LOAD MANAGER STATS
// ============================================
async function loadManagerStats() {
    const container = document.getElementById('managerStatsCards');
    if (!container) return;
    
    showLoading('managerStatsCards');
    
    try {
        // Fetch stats - use reorder dashboard for comprehensive data
        const [itemsRes, dashboardRes] = await Promise.all([
            fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items?limit=1`).catch(() => null),
            fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/dashboard`).catch(() => null)
        ]);
        
        let itemsInStock = 0;
        let lowStockItems = 0;
        let criticalStock = 0;
        let pendingPRs = 0;
        let pendingPOs = 0;
        
        if (itemsRes && itemsRes.ok) {
            const response = await itemsRes.json();
            const payload = response && response.data ? response.data : response || {};
            itemsInStock = payload.total || payload.count || 0;
        }
        
        if (dashboardRes && dashboardRes.ok) {
            const response = await dashboardRes.json();
            const payload = response && response.data ? response.data : response || {};
            
            // Extract low stock counts from reorder dashboard
            if (payload.alerts) {
                lowStockItems = payload.alerts.items_below_safety_stock || 0;
                criticalStock = payload.alerts.critical_count || 0;
            }
            
            // Extract pending counts from dashboard
            if (payload.purchase_requisitions) {
                pendingPRs = payload.purchase_requisitions.pending_count || 0;
            }
            if (payload.purchase_orders) {
                pendingPOs = payload.purchase_orders.active_pos || 0;
            }
        }
        
        const stats = [
            {
                label: 'Items in Stock',
                value: itemsInStock,
                icon: 'fa-boxes',
                color: 'blue',
                subtitle: 'Total items with stock > 0'
            },
            {
                label: 'Low Stock Items',
                value: lowStockItems,
                icon: 'fa-exclamation-triangle',
                color: 'orange',
                subtitle: 'Items below reorder point',
                badge: lowStockItems > 0 ? lowStockItems : null
            },
            {
                label: 'Critical Stock',
                value: criticalStock,
                icon: 'fa-ban',
                color: 'red',
                subtitle: 'Items at 0 or near 0'
            },
            {
                label: 'Pending PRs',
                value: pendingPRs,
                icon: 'fa-file-alt',
                color: 'purple',
                subtitle: 'PRs awaiting approval',
                action: 'Review Now'
            },
            {
                label: 'Pending POs',
                value: pendingPOs,
                icon: 'fa-shopping-cart',
                color: 'green',
                subtitle: 'POs not yet received'
            }
        ];
        
        renderManagerStatsCards(stats);
    } catch (error) {
        console.error('Error loading manager stats:', error);
        showError('managerStatsCards', 'Failed to load statistics');
    }
}

// ============================================
// RENDER MANAGER STATS CARDS
// ============================================
function renderManagerStatsCards(stats) {
    const container = document.getElementById('managerStatsCards');
    if (!container) return;
    
    container.innerHTML = stats.map(stat => `
        <div class="col-lg-2 col-md-4 col-sm-6">
            <div class="stats-card ${stat.color}">
                <div class="icon">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="value">
                    ${formatNumber(stat.value)}
                    ${stat.badge ? `<span class="badge bg-danger ms-2" style="font-size: 0.7rem;">${stat.badge}</span>` : ''}
                </div>
                <div class="label">${stat.label}</div>
                ${stat.subtitle ? `<div class="subtitle">${stat.subtitle}</div>` : ''}
                ${stat.action ? `<button class="btn btn-sm btn-primary mt-2" onclick="navigateTo('#')">${stat.action}</button>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// LOAD STOCK HEALTH CHART
// ============================================
async function loadStockHealthChart() {
    try {
        // Use stock summary endpoint to reflect real-time stock status
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/summary`);
        let good = 0, low = 0, critical = 0;
        
        if (response.ok) {
            const json = await response.json();
            const payload = json && json.data ? json.data : json || {};
            console.log('Stock summary response:', payload); // Debug

            const summary = payload.summary || {};
            const items = Array.isArray(payload.items) ? payload.items : [];

            // Prefer backend summary counts if provided
            good = summary.good_stock || 0;
            low = summary.low_stock || 0;
            critical = summary.critical_stock || 0;

            // Fallback: derive from item statuses
            if ((good + low + critical) === 0 && items.length > 0) {
                items.forEach(item => {
                    const status = item.overall_status || '';
                    if (status === 'Critical Stock') critical += 1;
                    else if (status === 'Low Stock') low += 1;
                    else if (status === 'Out of Stock') critical += 1;
                    else good += 1;
                });
            }
        } else {
            console.warn('Stock summary request failed', response.status);
        }
        
        const ctx = document.getElementById('stockHealthChart');
        if (!ctx) return;
        
        if (stockHealthChart) {
            stockHealthChart.destroy();
        }
        
        stockHealthChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Good Stock', 'Low Stock', 'Critical'],
                datasets: [{
                    data: [good, low, critical],
                    backgroundColor: ['#28A745', '#FFC107', '#DC3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
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
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading stock health chart:', error);
    }
}

// ============================================
// LOAD ABC ANALYSIS CHART
// ============================================
async function loadABCChart() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/analytics/abc-analysis`);
        
        let categoryA = { item_count: 0, percentage_of_value: 0 };
        let categoryB = { item_count: 0, percentage_of_value: 0 };
        let categoryC = { item_count: 0, percentage_of_value: 0 };
        
        if (response.ok) {
            const json = await response.json();
            // Backend wraps: { success, message, data }
            const payload = json && json.data ? json.data : json || {};
            // Backend returns summary.category_a, summary.category_b, summary.category_c
            categoryA = payload.summary?.category_a || { item_count: 0, percentage_of_value: 0 };
            categoryB = payload.summary?.category_b || { item_count: 0, percentage_of_value: 0 };
            categoryC = payload.summary?.category_c || { item_count: 0, percentage_of_value: 0 };
        } else {
            // Mock data
            categoryA = { item_count: 40, percentage_of_value: 80 };
            categoryB = { item_count: 60, percentage_of_value: 15 };
            categoryC = { item_count: 100, percentage_of_value: 5 };
        }
        
        const ctx = document.getElementById('abcChart');
        if (!ctx) return;
        
        if (abcChart) {
            abcChart.destroy();
        }
        
        abcChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Category A', 'Category B', 'Category C'],
                datasets: [{
                    label: 'Item Count',
                    data: [categoryA.item_count, categoryB.item_count, categoryC.item_count],
                    backgroundColor: ['#4A90E2', '#FFC107', '#6C757D'],
                    borderColor: ['#3A7BC8', '#E0A800', '#5A6268'],
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                const values = [categoryA.percentage_of_value, categoryB.percentage_of_value, categoryC.percentage_of_value];
                                return `Value: ${values[index]}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading ABC chart:', error);
    }
}

// ============================================
// LOAD REORDER ALERTS TABLE
// ============================================
async function loadReorderAlertsTable() {
    const tbody = document.getElementById('reorderTableBody');
    if (!tbody) return;
    
    showLoading('reorderTableBody');
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/alerts?limit=20`);
        
        let alerts = [];
        if (response.ok) {
            const json = await response.json();
            // Backend wraps: { success, message, data: { unread_count, critical_count, alerts } }
            const payload = json && json.data ? json.data : json || {};
            alerts = Array.isArray(payload) ? payload : (Array.isArray(payload.alerts) ? payload.alerts : []);
        }
        
        if (alerts.length === 0) {
            showEmptyState('reorderTableBody', 'No reorder alerts at this time.', 'fa-check-circle');
            return;
        }
        
        tbody.innerHTML = alerts.map(alert => {
            const item = alert.item || {};
            const stock = item.current_stock || alert.current_stock || 0;
            const reorderPoint = item.reorder_point || alert.reorder_point || 0;
            let status = 'good';
            let statusText = 'Good';
            let statusClass = 'success';
            
            if (stock === 0) {
                status = 'critical';
                statusText = 'Critical';
                statusClass = 'danger';
            } else if (stock <= reorderPoint) {
                status = 'low';
                statusText = 'Low';
                statusClass = 'warning';
            }
            
            return `
                <tr>
                    <td>${item.sku || alert.sku || 'N/A'}</td>
                    <td>${item.item_name || alert.item_name || alert.name || 'Unknown'}</td>
                    <td><span class="badge bg-${statusClass}">${stock}</span></td>
                    <td>${reorderPoint}</td>
                    <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="createPR(${alert.item_id || alert.id})">
                            Create PR
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading reorder alerts:', error);
        showError('reorderTableBody', 'Failed to load reorder alerts');
    }
}

// ============================================
// LOAD EXPIRY ALERTS
// ============================================
async function loadExpiryAlerts() {
    try {
        // Try to fetch expiry data from API
        let expiry30 = [];
        let expiry7 = [];
        let expired = [];
        
        try {
            const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/batches/expiry-alerts`);
            if (response.ok) {
                const json = await response.json();
                // Backend wraps: { success, message, data }
                const payload = json && json.data ? json.data : json || {};
                
                // Backend returns: { alerts: [...], summary: { expired_items, expiring_7days, expiring_30days } }
                const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
                
                alerts.forEach(alert => {
                    // Each alert has batch.expiry_date
                    if (!alert.batch || !alert.batch.expiry_date) return;
                    
                    const batch = alert.batch;
                    const alertData = {
                        item_name: alert.item?.item_name || batch.item_name || 'Unknown Item',
                        batch_number: batch.batch_number || 'N/A',
                        expiry_date: batch.expiry_date,
                        available_qty: batch.available_qty || 0,
                        warehouse_name: alert.warehouse?.warehouse_name || 'Unknown',
                        sku: alert.item?.sku || 'N/A'
                    };
                    
                    // Categorize by expiry date
                    const expiryDate = new Date(batch.expiry_date);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    expiryDate.setHours(0, 0, 0, 0);
                    
                    if (expiryDate < now) {
                        expired.push(alertData);
                    } else {
                        const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                        if (daysToExpiry <= 7) {
                            expiry7.push(alertData);
                        } else if (daysToExpiry <= 30) {
                            expiry30.push(alertData);
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Expiry alerts endpoint not available');
        }
        
        // Update badges
        document.getElementById('expiry30Badge').textContent = expiry30.length;
        document.getElementById('expiry7Badge').textContent = expiry7.length;
        document.getElementById('expiredBadge').textContent = expired.length;
        
        // Render lists
        renderExpiryList('expiry30List', expiry30, 'warning');
        renderExpiryList('expiry7List', expiry7, 'danger');
        renderExpiryList('expiredList', expired, 'dark');
    } catch (error) {
        console.error('Error loading expiry alerts:', error);
    }
}

// ============================================
// RENDER EXPIRY LIST
// ============================================
function renderExpiryList(elementId, items, badgeClass) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">No items found</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="expiry-item">
            <div>
                <div class="fw-bold">${item.item_name || 'Unknown Item'}</div>
                <div class="small text-muted">Batch: ${item.batch_number || 'N/A'}</div>
                <div class="small">Expiry: ${formatDate(item.expiry_date)}</div>
                <div class="small">Qty: ${item.quantity || 0}</div>
            </div>
            <button class="btn btn-sm btn-outline-${badgeClass}">
                ${badgeClass === 'dark' ? 'Dispose' : 'Transfer'}
            </button>
        </div>
    `).join('');
}

// ============================================
// LOAD TURNOVER METRICS
// ============================================
async function loadTurnoverMetrics() {
    const container = document.getElementById('turnoverMetrics');
    if (!container) return;
    
    try {
        // Try to fetch turnover data
        let avgTurnover = 0;
        let fastMovers = 0;
        let slowMovers = 0;
        let deadStock = 0;
        
        try {
            const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/analytics/turnover?start_date=${new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`);
            if (response.ok) {
                const json = await response.json();
                // Backend wraps: { success, message, data }
                const payload = json && json.data ? json.data : json || {};
                // Backend returns overall_metrics with overall_turnover_ratio and items array
                avgTurnover = payload.overall_metrics?.overall_turnover_ratio || 0;
                
                // Classify items based on turnover ratio
                if (Array.isArray(payload.items)) {
                    payload.items.forEach(item => {
                        const ratio = item.turnover_ratio || 0;
                        if (ratio > 6) {
                            fastMovers++;
                        } else if (ratio < 2 && ratio > 0) {
                            slowMovers++;
                        } else if (ratio === 0) {
                            deadStock++;
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Turnover metrics endpoint not available');
            // Mock data
            avgTurnover = 4.5;
            fastMovers = 45;
            slowMovers = 23;
            deadStock = 8;
        }
        
        container.innerHTML = `
            <div class="mb-4">
                <h4 class="text-primary">${avgTurnover.toFixed(1)}x</h4>
                <p class="text-muted mb-0">Average Turnover Ratio</p>
            </div>
            <div class="mb-3">
                <div class="d-flex justify-content-between mb-2">
                    <span>Fast Movers (&gt;6x)</span>
                    <strong class="text-success">${fastMovers}</strong>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Slow Movers (&lt;2x)</span>
                    <strong class="text-warning">${slowMovers}</strong>
                </div>
                <div class="d-flex justify-content-between">
                    <span>Dead Stock (0 movement)</span>
                    <strong class="text-danger">${deadStock}</strong>
                </div>
            </div>
            <div class="mt-4 text-center">
                <a href="reports-dashboard.html#turnover" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-chart-line me-2"></i>View Details
                </a>
            </div>
            <div class="mt-2">
                <small class="text-muted">Last 6 months</small>
            </div>
        `;
    } catch (error) {
        console.error('Error loading turnover metrics:', error);
        showError('turnoverMetrics', 'Failed to load turnover metrics');
    }
}

// ============================================
// EXPORT REORDER TABLE
// ============================================
function exportReorderTable() {
    exportReorderAlerts();
}

// ============================================
// CREATE PR
// ============================================
function createPR(itemId) {
    if (itemId) {
        window.location.href = `reorder-alert-report.html?action=create&item_id=${itemId}`;
    } else {
        window.location.href = 'reorder-alert-report.html?action=create';
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadManagerDashboard();
    }, 100);
});

// Make functions globally available
window.exportReorderTable = exportReorderTable;
window.exportReorderAlerts = exportReorderAlerts;
window.createPR = createPR;

