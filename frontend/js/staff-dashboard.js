/**
 * Staff Dashboard Specific Functionality
 */

let searchTimeout = null;

// ============================================
// LOAD STAFF DASHBOARD
// ============================================
async function loadStaffDashboard() {
    try {
        await Promise.all([
            loadStaffStats(),
            loadPendingGRNs(),
            loadRecentMovements(),
            loadStockCountTasks()
        ]);

        // Setup quick search
        setupQuickSearch();
    } catch (error) {
        console.error('Error loading staff dashboard:', error);
    }
}

// ============================================
// LOAD STAFF STATS
// ============================================
async function loadStaffStats() {
    const container = document.getElementById('staffStatsCards');
    if (!container) return;

    showLoading('staffStatsCards');

    try {
        // Fetch stats - use dedicated staff dashboard endpoint for accuracy
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/staff/dashboard`);

        let pendingGRNs = 0;
        let todayMovements = 0;
        let stockCountTasks = 0;

        if (response && response.ok) {
            const result = await response.json();
            const stats = result.stats || {};
            pendingGRNs = stats.pending_grns || 0;
            todayMovements = stats.today_movements || 0;
            stockCountTasks = stats.stock_count_tasks || 0;
        }

        const stats = [
            {
                label: 'Pending GRNs',
                value: pendingGRNs,
                icon: 'fa-clipboard-check',
                color: 'blue',
                subtitle: 'GRNs to process today',
                action: 'Process Now'
            },
            {
                label: "Today's Movements",
                value: todayMovements,
                icon: 'fa-exchange-alt',
                color: 'green',
                subtitle: 'Stock transactions today'
            },
            {
                label: 'Stock Count Tasks',
                value: stockCountTasks,
                icon: 'fa-tasks',
                color: 'orange',
                subtitle: 'Pending counts'
            }
        ];

        renderStaffStatsCards(stats);
    } catch (error) {
        console.error('Error loading staff stats:', error);
        showError('staffStatsCards', 'Failed to load statistics');
    }
}

// ============================================
// RENDER STAFF STATS CARDS
// ============================================
function renderStaffStatsCards(stats) {
    const container = document.getElementById('staffStatsCards');
    if (!container) return;

    container.innerHTML = stats.map(stat => `
        <div class="col-lg-4 col-md-6">
            <div class="stats-card ${stat.color}">
                <div class="icon">
                    <i class="fas ${stat.icon}"></i>
                </div>
                <div class="value">${formatNumber(stat.value)}</div>
                <div class="label">${stat.label}</div>
                ${stat.subtitle ? `<div class="subtitle">${stat.subtitle}</div>` : ''}
                ${stat.action ? `<button class="btn btn-sm btn-primary mt-2" onclick="processGRNs()">${stat.action}</button>` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// LOAD PENDING GRNs
// ============================================
async function loadPendingGRNs() {
    const tbody = document.getElementById('grnTableBody');
    if (!tbody) return;

    showLoading('grnTableBody');

    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/pending-pos`);

        let grns = [];
        if (response.ok) {
            const json = await response.json();
            // Backend wraps: { success, message, data }
            const payload = json && json.data ? json.data : json || {};
            grns = Array.isArray(payload) ? payload : (Array.isArray(payload.grns) ? payload.grns : []);
        }

        if (grns.length === 0) {
            showEmptyState('grnTableBody', 'No pending GRNs at this time.', 'fa-check-circle');
            return;
        }

        tbody.innerHTML = grns.map(grn => {
            const expectedDate = grn.expected_delivery_date || grn.expected_date;
            const isOverdue = expectedDate && new Date(expectedDate) < new Date();
            const itemsCount = grn.items ? (Array.isArray(grn.items) ? grn.items.length : 1) : 0;

            return `
                <tr class="${isOverdue ? 'table-danger' : ''}">
                    <td>${grn.grn_number || 'N/A'}</td>
                    <td>${grn.po_number || grn.po_id || 'N/A'}</td>
                    <td>${grn.supplier?.supplier_name || grn.supplier_name || 'N/A'}</td>
                    <td>${expectedDate ? formatDate(expectedDate) : 'N/A'}</td>
                    <td>${itemsCount}</td>
                    <td>
                        <span class="badge bg-${isOverdue ? 'danger' : 'warning'}">
                            ${isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="processGRN(${grn.po_id || grn.id})">
                            Process
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading pending GRNs:', error);
        showError('grnTableBody', 'Failed to load pending GRNs');
    }
}

// ============================================
// LOAD RECENT MOVEMENTS
// ============================================
async function loadRecentMovements() {
    const container = document.getElementById('recentMovements');
    if (!container) return;

    showLoading('recentMovements');

    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/ledger?limit=20`);

        let movements = [];
        if (response.ok) {
            const json = await response.json();
            // Backend wraps: { success, message, data: { transactions: [...], pagination: {...} } }
            const payload = json && json.data ? json.data : json || {};
            movements = Array.isArray(payload.transactions) ? payload.transactions : [];
        }

        if (movements.length === 0) {
            showEmptyState('recentMovements', 'No recent stock movements.', 'fa-exchange-alt');
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Quantity</th>
                            <th>Location</th>
                            <th>By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movements.map(movement => {
            const type = movement.transaction_type || 'Unknown';
            const typeColors = {
                'GRN': 'success',
                'Transfer': 'info',
                'Issue': 'warning',
                'Adjust': 'secondary'
            };
            const typeColor = typeColors[type] || 'secondary';
            const quantity = parseFloat(movement.quantity || 0);
            const isPositive = quantity > 0;
            const sign = isPositive ? '+' : (quantity < 0 ? '-' : '');
            const qtyClass = isPositive ? 'stock-up-tick' : 'stock-down-tick';

            console.log(`[DEBUG] Rendering movement:`, {
                item: movement.item?.item_name,
                raw_qty: movement.quantity,
                parsed_qty: quantity,
                type_raw: typeof movement.quantity,
                sign: sign,
                applied_class: qtyClass
            });

            // Extract nested item_name from item object
            const itemName = movement.item?.item_name || 'Unknown';

            // Extract location from location object or warehouse as fallback
            const location = movement.location?.location_code || movement.warehouse?.warehouse_name || 'N/A';

            // Extract user name from created_by object
            const createdBy = movement.created_by?.full_name || movement.created_by?.username || 'System';

            const timeStr = movement.createdAt ? new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) :
                (movement.transaction_date ? new Date(movement.transaction_date).toLocaleDateString() : '-');
            const seqId = movement.ledger_id ? `#${movement.ledger_id}` : '';

            return `
                                <tr>
                                    <td>
                                        <div class="fw-bold">${timeStr}</div>
                                        <div class="text-muted small" style="font-size: 0.7rem;">${seqId}</div>
                                    </td>
                                    <td>${itemName}</td>
                                    <td><span class="badge bg-${typeColor}">${type}</span></td>
                                    <td class="${qtyClass}">
                                        ${sign}${Math.abs(quantity)}
                                    </td>
                                    <td><small>${location}</small></td>
                                    <td><small>${createdBy}</small></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading recent movements:', error);
        showError('recentMovements', 'Failed to load recent movements');
    }
}

// ============================================
// LOAD STOCK COUNT TASKS
// ============================================
async function loadStockCountTasks() {
    const container = document.getElementById('stockCountTasks');
    if (!container) return;

    showLoading('stockCountTasks');

    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/count-tasks?limit=10`);

        let tasks = [];
        if (response.ok) {
            const json = await response.json();
            // Backend wraps: { success, message, data: { tasks: [...], pagination: {...} } }
            const payload = json && json.data ? json.data : json || {};
            tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
        }

        if (tasks.length === 0) {
            showEmptyState('stockCountTasks', 'No stock count tasks assigned.', 'fa-check-circle');
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Current Balance</th>
                            <th>Last Counted</th>
                            <th>Priority</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.map(task => {
            const priority = task.priority || 'normal';
            const priorityColors = {
                'high': 'danger',
                'normal': 'info'
            };
            const priorityColor = priorityColors[priority] || 'secondary';
            const lastCountDate = task.last_count_date
                ? formatRelativeTime(task.last_count_date)
                : 'Never';

            return `
                                <tr>
                                    <td>${task.item_name || 'Unknown'}</td>
                                    <td><small>${task.sku || 'N/A'}</small></td>
                                    <td><strong>${task.current_balance || 0}</strong></td>
                                    <td><small>${lastCountDate}</small></td>
                                    <td><span class="badge bg-${priorityColor}">${priority.toUpperCase()}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary" onclick="startStockCount(${task.item_id})">
                                            Count
                                        </button>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stock count tasks:', error);
        showError('stockCountTasks', 'Failed to load stock count tasks');
    }
}

// ============================================
// SETUP QUICK SEARCH
// ============================================
function setupQuickSearch() {
    const searchInput = document.getElementById('quickSearch');
    const resultsDiv = document.getElementById('searchResults');

    if (!searchInput || !resultsDiv) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            resultsDiv.classList.remove('show');
            resultsDiv.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetchWithAuth(
                    `${CONFIG.API_BASE_URL}/api/inventory/items?search=${encodeURIComponent(query)}&limit=5`
                );

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();
                // Backend wraps: { success, message, data: [...] }
                let items = [];
                if (data && data.data) {
                    const payload = data.data;
                    items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [];
                } else if (Array.isArray(data)) {
                    items = data;
                }

                renderSearchResults(items, resultsDiv);
            } catch (error) {
                console.error('Search error:', error);
                resultsDiv.classList.remove('show');
            }
        }, 300);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.classList.remove('show');
        }
    });
}

// ============================================
// RENDER SEARCH RESULTS
// ============================================
function renderSearchResults(items, container) {
    // Ensure items is always an array
    if (!Array.isArray(items)) {
        items = [];
    }

    if (items.length === 0) {
        container.innerHTML = '<div class="search-result-item"><p class="text-muted mb-0">No items found</p></div>';
        container.classList.add('show');
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="search-result-item" onclick="selectSearchItem(${item.item_id || item.id})">
            <div class="fw-bold">${item.item_name || item.name || 'Unknown'}</div>
            <div class="small text-muted">SKU: ${item.sku || 'N/A'}</div>
            <div class="small">
                Stock: <span class="badge bg-info">${item.current_stock || 0}</span>
            </div>
        </div>
    `).join('');

    container.classList.add('show');
}

// ============================================
// SELECT SEARCH ITEM
// ============================================
function selectSearchItem(itemId) {
    console.log('Selected item:', itemId);
    // Navigate to item details or perform action
    // window.location.href = `inventory.html?item_id=${itemId}`;
    document.getElementById('searchResults').classList.remove('show');
    document.getElementById('quickSearch').value = '';
}

// ============================================
// PROCESS GRN
// ============================================
function processGRN(poId) {
    console.log('Process GRN for PO:', poId);

    // Navigate directly to GRN entry form with the PO ID
    if (poId) {
        window.location.href = `grn-form.html?po_id=${poId}`;
    } else {
        window.location.href = 'grn.html';
    }
}

// ============================================
// PROCESS GRNs
// ============================================
function processGRNs() {
    window.location.href = 'grn.html';
}

// ============================================
// CREATE NEW GRN
// ============================================
function createNewGRN() {
    window.location.href = 'grn.html?action=create';
}

// ============================================
// START STOCK COUNT
// ============================================
function startStockCount(countId) {
    if (countId) {
        window.location.href = `stock-reconciliation-report.html?task_id=${countId}`;
    } else {
        window.location.href = 'stock-reconciliation-report.html';
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadStaffDashboard();
    }, 100);
});

// Make functions globally available
window.processGRN = processGRN;
window.processGRNs = processGRNs;
window.createNewGRN = createNewGRN;
window.startStockCount = startStockCount;

