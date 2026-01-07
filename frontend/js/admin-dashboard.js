/**
 * Admin Dashboard Specific Functionality
 */

// ============================================
// LOAD ADMIN DASHBOARD DATA
// ============================================
async function loadAdminDashboard() {
    try {
        await Promise.all([
            loadStats(),
            loadLowStockAlerts(),
            loadRecentActivities()
        ]);
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

// ============================================
// LOAD STATS CARDS
// ============================================
async function loadStats() {
    showLoading('statsCards');
    
    try {
        // Fetch stats from API
        const [itemsRes, warehousesRes, suppliersRes] = await Promise.all([
            fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items?limit=1`).catch(() => null),
            fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/warehouses`).catch(() => null),
            fetchWithAuth(`${CONFIG.API_BASE_URL}/api/suppliers`).catch(() => null)
        ]);
        
        let totalItems = 0;
        let totalWarehouses = 0;
        let totalSuppliers = 0;
        let totalUsers = 1; // default to current authenticated user
        
        // Parse items response
        if (itemsRes && itemsRes.ok) {
            const response = await itemsRes.json();
            // Backend wraps response: { success, message, data }
            const payload = response && response.data ? response.data : response || {};
            totalItems = payload.total || payload.count || 0;
        }
        
        // Parse warehouses response (returns array wrapped in data)
        if (warehousesRes && warehousesRes.ok) {
            const response = await warehousesRes.json();
            const payload = response && response.data ? response.data : response || {};
            if (Array.isArray(payload)) {
                totalWarehouses = payload.length;
            } else {
                totalWarehouses = payload.total || payload.length || 0;
            }
        }
        
        // Parse suppliers response (returns paginated object with suppliers array)
        if (suppliersRes && suppliersRes.ok) {
            const response = await suppliersRes.json();
            const payload = response && response.data ? response.data : response || {};
            if (Array.isArray(payload)) {
                totalSuppliers = payload.length;
            } else if (Array.isArray(payload.suppliers)) {
                totalSuppliers = payload.suppliers.length;
            } else if (payload.pagination && typeof payload.pagination.total === 'number') {
                totalSuppliers = payload.pagination.total;
            } else {
                totalSuppliers = payload.total || 0;
            }
        }
        
        const stats = [
            { 
                label: 'Total Items', 
                value: totalItems, 
                icon: 'fa-box', 
                color: 'blue', 
                subtitle: 'Active inventory items',
                link: 'inventory.html' 
            },
            { 
                label: 'Warehouses', 
                value: totalWarehouses, 
                icon: 'fa-warehouse', 
                color: 'green',
                subtitle: 'Storage locations'
            },
            { 
                label: 'Suppliers', 
                value: totalSuppliers, 
                icon: 'fa-truck', 
                color: 'orange',
                subtitle: 'Active suppliers'
            },
            { 
                label: 'Users', 
                value: totalUsers, 
                icon: 'fa-users', 
                color: 'purple',
                subtitle: 'System users'
            }
        ];
        
        renderStatsCards(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('statsCards', 'Failed to load statistics');
    }
}

// ============================================
// RENDER STATS CARDS
// ============================================
function renderStatsCards(stats) {
    const container = document.getElementById('statsCards');
    if (!container) return;
    
    container.innerHTML = stats.map(stat => `
        <div class="col-lg-3 col-md-6">
            <div class="stats-card ${stat.color}" ${stat.link ? `onclick="navigateTo('${stat.link}')"` : ''}>
                <div class="icon">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="value">${formatNumber(stat.value)}</div>
                <div class="label">${stat.label}</div>
                ${stat.subtitle ? `<div class="subtitle">${stat.subtitle}</div>` : ''}
                ${stat.link ? `<a href="${stat.link}" class="link">View All →</a>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// LOAD LOW STOCK ALERTS
// ============================================
async function loadLowStockAlerts() {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;
    
    showLoading('lowStockAlerts');
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/alerts?limit=10`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch alerts');
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug: log full response

        // Backend wraps response: { success, message, data: { unread_count, critical_count, alerts: [...] } }
        const payload = (data && data.data) || data || {};
        console.log('Payload:', payload); // Debug: log payload

        // Extract alerts array from payload (backend returns {alerts:[{item:{...}, warehouse:{...}}]})
        let alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
        console.log('Alerts before validation:', alerts, 'Type:', typeof alerts); // Debug

        // Normalize alert shape for UI rendering
        alerts = alerts.map(alert => {
            const item = alert.item || {};
            const warehouse = alert.warehouse || {};
            return {
                alert_id: alert.alert_id,
                item_id: item.item_id || alert.item_id,
                item_name: item.item_name || alert.item_name,
                sku: item.sku || alert.sku,
                current_stock: item.current_stock || alert.current_stock || 0,
                reorder_point: item.reorder_point || alert.reorder_point || 0,
                warehouse_name: warehouse.warehouse_name
            };
        });

        // Update badge count
        const badge = document.getElementById('lowStockCount');
        if (badge) {
            badge.textContent = alerts.length || 0;
        }

        if (!alerts || alerts.length === 0) {
            showEmptyState('lowStockAlerts', 'No low stock alerts at this time.', 'fa-check-circle');
            return;
        }
        
        container.innerHTML = `
            <div class="low-stock-list">
                ${alerts.map(alert => `
                    <div class="low-stock-item">
                        <div class="item-info">
                            <div class="item-name">${alert.item_name || alert.name || 'Unknown Item'}</div>
                            <div class="item-sku">SKU: ${alert.sku || 'N/A'}</div>
                            <div class="stock-info">
                                <span class="current-stock">Current: ${alert.current_stock || 0} units</span>
                                <span class="text-muted">Reorder Point: ${alert.reorder_point || 0}</span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="createPR(${alert.item_id || alert.id})">
                            Create PR
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="text-center mt-3">
                <a href="#" class="btn btn-sm btn-outline-primary">View All Alerts</a>
            </div>
        `;
    } catch (error) {
        console.error('Error loading low stock alerts:', error);
        showError('lowStockAlerts', 'Failed to load low stock alerts');
    }
}

// ============================================
// LOAD RECENT ACTIVITIES
// ============================================
async function loadRecentActivities() {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    
    showLoading('recentActivities');
    
    try {
        // Use mock data because backend does not expose recent activities endpoint
        let activities = [];
        if (activities.length === 0) {
            activities = [
                {
                    user_name: 'John Doe',
                    description: 'created GRN-2025-001',
                    type: 'grn',
                    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                },
                {
                    user_name: 'Jane Smith',
                    description: 'approved PR-2025-005',
                    type: 'pr',
                    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
                },
                {
                    user_name: 'Admin',
                    description: 'added new item "Laptop Dell"',
                    type: 'item',
                    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                }
            ];
        }
        
        if (activities.length === 0) {
            showEmptyState('recentActivities', 'No recent activities to display.', 'fa-history');
            return;
        }
        
        container.innerHTML = `
            <div class="activity-timeline">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type || 'default'}">
                            <i class="fas ${getActivityIcon(activity.type)}"></i>
                        </div>
                        <div class="activity-content">
                            <strong>${activity.user_name || 'System'}</strong> ${activity.description || activity.action || ''}
                            <br><small>${formatRelativeTime(activity.created_at || activity.timestamp)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading recent activities:', error);
        showError('recentActivities', 'Failed to load recent activities');
    }
}

// ============================================
// GET ACTIVITY ICON
// ============================================
function getActivityIcon(type) {
    const icons = {
        'grn': 'fa-clipboard-check',
        'pr': 'fa-file-alt',
        'po': 'fa-shopping-cart',
        'item': 'fa-box',
        'user': 'fa-user',
        'warehouse': 'fa-warehouse',
        'supplier': 'fa-truck',
        'default': 'fa-circle'
    };
    return icons[type] || icons.default;
}

// ============================================
// CREATE PURCHASE REQUISITION
// ============================================
function createPR(itemId) {
    // Navigate to PR creation page with item pre-selected
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
    // Wait for dashboard.js to initialize
    setTimeout(() => {
        loadAdminDashboard();
    }, 100);
});

