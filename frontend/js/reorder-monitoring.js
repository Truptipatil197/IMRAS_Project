/**
 * Reorder Monitoring Dashboard JavaScript
 */

let schedulerStatusInterval;
let executionHistoryChart;
let statusDistributionChart;
let currentUser;
let currentPage = 1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load common dashboard functions
    if (typeof loadUserInfo === 'function') {
        await loadUserInfo();
    } else {
        await loadUserInfoLocal();
    }
    
    await initializeDashboard();
    setupEventListeners();
    startAutoRefresh();
    
    // Setup sidebar toggle
    if (typeof setupSidebar === 'function') {
        setupSidebar();
    }
});

/**
 * Load user info locally if not available from dashboard.js
 */
async function loadUserInfoLocal() {
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userStr) {
        currentUser = JSON.parse(userStr);
        if (document.getElementById('userName')) {
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.username || 'User';
        }
        if (document.getElementById('userRole')) {
            document.getElementById('userRole').textContent = currentUser.role || '';
        }
    }
}

/**
 * Initialize dashboard - load all data
 */
async function initializeDashboard() {
    try {
        await Promise.all([
            loadSchedulerStatus(),
            loadMetrics(),
            loadDashboardData(),
            loadExecutionLogs(),
            loadReorderQueue()
        ]);
        
        // Show appropriate controls based on role
        if (currentUser && currentUser.role === 'Admin') {
            document.getElementById('schedulerControls').style.display = 'block';
        } else if (currentUser && currentUser.role === 'Manager') {
            document.getElementById('managerControls').style.display = 'block';
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

/**
 * Load scheduler status
 */
async function loadSchedulerStatus() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/status`);
        const data = await response.json();
        
        if (data.success) {
            updateSchedulerStatusUI(data.data);
        }
    } catch (error) {
        console.error('Error loading scheduler status:', error);
    }
}

/**
 * Update scheduler status UI
 */
function updateSchedulerStatusUI(data) {
    const { scheduler, recentExecutions, pendingQueue, metrics } = data;
    
    // Update status badge
    const badge = document.getElementById('schedulerStatusBadge');
    badge.innerHTML = '';
    
    if (scheduler.currentlyExecuting) {
        badge.className = 'scheduler-status-badge executing';
        badge.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Executing';
    } else if (scheduler.running) {
        badge.className = 'scheduler-status-badge running';
        badge.innerHTML = '<i class="fas fa-check-circle me-2"></i>Running';
    } else {
        badge.className = 'scheduler-status-badge stopped';
        badge.innerHTML = '<i class="fas fa-times-circle me-2"></i>Stopped';
    }
    
    // Update status details
    document.getElementById('schedulerStatus').innerHTML = scheduler.running 
        ? '<span class="text-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="text-danger"><i class="fas fa-times-circle"></i> Inactive</span>';
    
    document.getElementById('lastRun').textContent = scheduler.lastRun 
        ? formatDateTime(scheduler.lastRun)
        : 'Never';
    document.getElementById('nextRun').textContent = scheduler.nextRun 
        ? formatDateTime(scheduler.nextRun)
        : '-';
    document.getElementById('schedulePattern').textContent = scheduler.schedule || '-';
    
    // Update button states
    if (currentUser && currentUser.role === 'Admin') {
        document.getElementById('startSchedulerBtn').disabled = scheduler.running;
        document.getElementById('stopSchedulerBtn').disabled = !scheduler.running;
        document.getElementById('runNowBtn').disabled = scheduler.currentlyExecuting;
    }
}

/**
 * Load metrics
 */
async function loadMetrics() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/metrics?days=7`);
        const data = await response.json();
        
        if (data.success) {
            updateMetricsUI(data.data);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

/**
 * Update metrics UI
 */
function updateMetricsUI(metrics) {
    document.getElementById('totalExecutions').textContent = metrics.totalExecutions || 0;
    document.getElementById('successRate').textContent = `${metrics.successRate}% Success Rate`;
    document.getElementById('totalPRsGenerated').textContent = metrics.totalPRsGenerated || 0;
    document.getElementById('avgExecutionTime').textContent = metrics.avgExecutionTimeMs
        ? `${metrics.avgExecutionTimeMs}ms`
        : '0ms';
}

/**
 * Load dashboard data (critical items, recent PRs)
 */
async function loadDashboardData() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/automation/dashboard`);
        const data = await response.json();
        
        if (data.success) {
            updateDashboardUI(data.data);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Update dashboard UI with critical items and recent PRs
 */
function updateDashboardUI(data) {
    const { summary, criticalItems, recentPRs } = data;
    
    // Update summary metrics
    document.getElementById('criticalItems').textContent = summary.criticalItemsCount || 0;
    document.getElementById('warningItems').textContent = `${summary.warningItemsCount || 0} Warning Level`;
    document.getElementById('pendingPRs').textContent = `${summary.pendingPRsCount || 0} Pending Approval`;
    document.getElementById('pendingQueue').textContent = `${summary.pendingQueueCount || 0} in Queue`;
    
    // Update critical items count
    document.getElementById('criticalItemsCount').textContent = summary.criticalItemsCount || 0;
    
    // Update critical items table
    const criticalTableBody = document.getElementById('criticalItemsTableBody');
    if (!criticalItems || criticalItems.length === 0) {
        criticalTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h5>No Critical Items</h5>
                        <p>All items are above safety stock levels</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        criticalTableBody.innerHTML = criticalItems.map(alert => {
            const item = alert.item || {};
            const data = alert.data || {};
            return `
                <tr>
                    <td><strong>${item.item_name || 'Unknown'}</strong></td>
                    <td><code>${item.sku || '-'}</code></td>
                    <td><span class="badge bg-danger">${data.currentStock || 0}</span></td>
                    <td>${data.reorderPoint || 0}</td>
                    <td>
                        ${data.estimatedStockoutDate
                            ? `<span class="text-danger">${calculateDaysUntil(data.estimatedStockoutDate)} days</span>`
                            : '-'
                        }
                    </td>
                    <td>
                        <span class="status-badge ${(alert.severity || 'medium').toLowerCase()}">${(alert.severity || 'Medium').toUpperCase()}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-action" onclick="viewItemDetails(${item.item_id || 0})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update recent PRs table
    const recentPRsTableBody = document.getElementById('recentPRsTableBody');
    if (!recentPRs || recentPRs.length === 0) {
        recentPRsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h5>No Recent PRs</h5>
                        <p>No automatically generated purchase requisitions</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        recentPRsTableBody.innerHTML = recentPRs.map(pr => {
            const firstItem = pr.prItems && pr.prItems[0];
            const item = firstItem ? firstItem.item : {};
            return `
                <tr>
                    <td><strong>${pr.pr_number || '-'}</strong></td>
                    <td>${item.item_name || '-'} <small class="text-muted">(${item.sku || '-'})</small></td>
                    <td>${firstItem ? firstItem.requested_qty : '-'} ${item.unit_of_measure || 'pcs'}</td>
                    <td>-</td>
                    <td><span class="priority-badge medium">Medium</span></td>
                    <td>
                        <span class="status-badge ${(pr.status || 'pending').toLowerCase()}">${(pr.status || 'Pending').toUpperCase()}</span>
                    </td>
                    <td>${formatDateTime(pr.created_at || pr.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-info btn-action" onclick="viewPRDetails('${pr.pr_number || ''}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

/**
 * Load execution logs
 */
async function loadExecutionLogs(page = 1, status = '') {
    try {
        let url = `${CONFIG.API_BASE_URL}/api/reorder/scheduler/logs?page=${page}&limit=10`;
        if (status) url += `&status=${status}`;
        
        const response = await fetchWithAuth(url);
        const data = await response.json();
        
        if (data.success) {
            updateExecutionLogsUI(data.data, data.pagination);
        }
    } catch (error) {
        console.error('Error loading execution logs:', error);
    }
}

/**
 * Update execution logs UI
 */
function updateExecutionLogsUI(logs, pagination) {
    const tableBody = document.getElementById('executionLogsTableBody');
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <h5>No Execution History</h5>
                        <p>No scheduler executions found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = logs.map(log => `
        <tr>
            <td>${formatDateTime(log.started_at || log.startedAt)}</td>
            <td>
                <span class="status-badge ${log.status || 'running'}">${(log.status || 'running').toUpperCase()}</span>
            </td>
            <td>${log.items_processed || log.itemsProcessed || 0}</td>
            <td>${log.items_eligible || log.itemsEligible || 0}</td>
            <td>${log.prs_generated || log.prsGenerated || 0}</td>
            <td>${log.alerts_created || log.alertsCreated || 0}</td>
            <td>${log.execution_time_ms || log.executionTimeMs ? `${log.execution_time_ms || log.executionTimeMs}ms` : '-'}</td>
            <td>
                ${log.triggered_by === 'manual' && log.triggeredByUser
                    ? `<i class="fas fa-user"></i> ${log.triggeredByUser.username || 'User'}`
                    : '<i class="fas fa-robot"></i> Scheduler'
                }
            </td>
            <td>
                <button class="btn btn-sm btn-info btn-action" onclick="viewLogDetails(${log.log_id || log.logId || 0})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update pagination
    updatePagination('executionLogsPagination', pagination, (page) => {
        currentPage = page;
        const status = document.getElementById('logStatusFilter').value;
        loadExecutionLogs(page, status);
    });
    
    // Create charts if data available
    if (logs.length > 0) {
        createExecutionHistoryChart(logs);
        createStatusDistributionChart(logs);
    }
}

/**
 * Load reorder queue
 */
async function loadReorderQueue() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/automation/queue?status=pending&limit=50`);
        const data = await response.json();
        
        if (data.success) {
            updateReorderQueueUI(data.data);
        }
    } catch (error) {
        console.error('Error loading reorder queue:', error);
    }
}

/**
 * Update reorder queue UI
 */
function updateReorderQueueUI(queue) {
    const queueCount = document.getElementById('queueCount');
    queueCount.textContent = queue.length;
    
    const tableBody = document.getElementById('reorderQueueTableBody');
    if (!queue || queue.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h5>Queue Empty</h5>
                        <p>No items pending reorder processing</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = queue.map(entry => {
        const item = entry.item || {};
        const warehouse = entry.warehouse || {};
        const pr = entry.purchaseRequisition || {};
        return `
            <tr>
                <td>${item.item_name || 'Unknown'}</td>
                <td><code>${item.sku || '-'}</code></td>
                <td>${warehouse.warehouse_name || 'All'}</td>
                <td>${entry.current_stock || entry.currentStock || 0}</td>
                <td><strong>${entry.suggested_quantity || entry.suggestedQuantity || 0}</strong> ${item.unit_of_measure || 'pcs'}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="priority-score-bar me-2">
                            <div class="priority-score-fill ${getPriorityClass(entry.priority_score || entry.priorityScore || 50)}"
                                 style="width: ${entry.priority_score || entry.priorityScore || 50}%"></div>
                        </div>
                        <span class="small">${entry.priority_score || entry.priorityScore || 50}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${entry.status || 'pending'}">${(entry.status || 'pending').toUpperCase()}</span>
                </td>
                <td>
                    ${pr.pr_number || pr.prNumber
                        ? `<a href="#" onclick="viewPRDetails('${pr.pr_number || pr.prNumber}')">${pr.pr_number || pr.prNumber}</a>`
                        : '-'
                    }
                </td>
                <td>${formatDateTime(entry.created_at || entry.createdAt)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Create execution history chart
 */
function createExecutionHistoryChart(logs) {
    const ctx = document.getElementById('executionHistoryChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (executionHistoryChart) {
        executionHistoryChart.destroy();
    }
    
    // Prepare data
    const sortedLogs = [...logs].sort((a, b) => {
        const dateA = new Date(a.started_at || a.startedAt);
        const dateB = new Date(b.started_at || b.startedAt);
        return dateA - dateB;
    });
    
    const labels = sortedLogs.map(log => formatDate(log.started_at || log.startedAt));
    const itemsProcessed = sortedLogs.map(log => log.items_processed || log.itemsProcessed || 0);
    const prsGenerated = sortedLogs.map(log => log.prs_generated || log.prsGenerated || 0);
    
    executionHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Items Processed',
                    data: itemsProcessed,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'PRs Generated',
                    data: prsGenerated,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Create status distribution chart
 */
function createStatusDistributionChart(logs) {
    const ctx = document.getElementById('statusDistributionChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (statusDistributionChart) {
        statusDistributionChart.destroy();
    }
    
    // Count status
    const statusCounts = logs.reduce((acc, log) => {
        const status = log.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const colors = labels.map(status => {
        switch (status) {
            case 'success': return '#28a745';
            case 'failed': return '#dc3545';
            case 'running': return '#ffc107';
            default: return '#6c757d';
        }
    });
    
    statusDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l.toUpperCase()),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        initializeDashboard();
    });
    
    // Scheduler controls (Admin only)
    document.getElementById('startSchedulerBtn')?.addEventListener('click', startScheduler);
    document.getElementById('stopSchedulerBtn')?.addEventListener('click', stopScheduler);
    document.getElementById('runNowBtn')?.addEventListener('click', runSchedulerNow);
    document.getElementById('runNowBtnManager')?.addEventListener('click', runSchedulerNow);
    document.getElementById('configSchedulerBtn')?.addEventListener('click', showConfigModal);
    document.getElementById('saveConfigBtn')?.addEventListener('click', saveSchedulerConfig);
    
    // Log status filter
    document.getElementById('logStatusFilter')?.addEventListener('change', (e) => {
        loadExecutionLogs(1, e.target.value);
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (typeof handleLogout === 'function') {
            handleLogout();
        } else {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
            window.location.href = '../index.html';
        }
    });
}

/**
 * Start scheduler
 */
async function startScheduler() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/start`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Scheduler Started',
                text: 'The reorder scheduler has been started successfully',
                timer: 2000
            });
            await loadSchedulerStatus();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to start scheduler'
        });
    }
}

/**
 * Stop scheduler
 */
async function stopScheduler() {
    const result = await Swal.fire({
        title: 'Stop Scheduler?',
        text: 'Are you sure you want to stop the automated reorder scheduler?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, stop it'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/stop`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Scheduler Stopped',
                text: 'The reorder scheduler has been stopped',
                timer: 2000
            });
            await loadSchedulerStatus();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to stop scheduler'
        });
    }
}

/**
 * Run scheduler now
 */
async function runSchedulerNow() {
    const result = await Swal.fire({
        title: 'Run Reorder Check Now?',
        text: 'This will trigger an immediate reorder check. Continue?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#007bff',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, run now'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/run-now`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Check Triggered',
                text: 'Reorder check is running in the background. Results will appear shortly.',
                timer: 3000
            });
            
            // Reload after delay
            setTimeout(() => {
                initializeDashboard();
            }, 5000);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to trigger reorder check'
        });
    }
}

/**
 * Show configuration modal
 */
function showConfigModal() {
    const modal = new bootstrap.Modal(document.getElementById('schedulerConfigModal'));
    // TODO: Load current config
    modal.show();
}

/**
 * Save scheduler configuration
 */
async function saveSchedulerConfig() {
    const schedule = document.getElementById('scheduleInput').value;
    const batchSize = document.getElementById('batchSizeInput').value;
    const enabled = document.getElementById('enabledInput').checked;
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/scheduler/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ schedule, batchSize: parseInt(batchSize), enabled })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Configuration Updated',
                text: 'Scheduler configuration has been saved',
                timer: 2000
            });
            bootstrap.Modal.getInstance(document.getElementById('schedulerConfigModal')).hide();
            await loadSchedulerStatus();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to update configuration'
        });
    }
}

/**
 * View log details
 */
async function viewLogDetails(logId) {
    // TODO: Implement log details modal
    console.log('View log details:', logId);
}

/**
 * View item details
 */
function viewItemDetails(itemId) {
    window.location.href = `item-details.html?id=${itemId}`;
}

/**
 * View PR details
 */
function viewPRDetails(prNumber) {
    // Navigate to PR details page if it exists
    console.log('View PR:', prNumber);
    // window.location.href = `pr-details.html?pr=${prNumber}`;
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    // Refresh every 30 seconds
    schedulerStatusInterval = setInterval(() => {
        loadSchedulerStatus();
        loadMetrics();
    }, 30000);
}

/**
 * Utility Functions
 */
function getPriorityClass(score) {
    if (score >= 90) return 'critical';
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

function calculateDaysUntil(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
    });
}

// Use fetchWithAuth from dashboard.js if available, otherwise define it
if (typeof fetchWithAuth === 'undefined') {
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        return fetch(url, options);
    }
}

function updatePagination(containerId, pagination, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container || !pagination) return;
    
    const { page, pages } = pagination;
    let html = '';
    
    // Previous
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
    </li>`;
    
    // Pages
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
            html += `<li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        } else if (i === page - 3 || i === page + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next
    html += `<li class="page-item ${page === pages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${page + 1}">Next</a>
    </li>`;
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = parseInt(e.target.dataset.page);
            if (targetPage && targetPage !== page) {
                onPageClick(targetPage);
            }
        });
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (schedulerStatusInterval) {
        clearInterval(schedulerStatusInterval);
    }
    if (executionHistoryChart) {
        executionHistoryChart.destroy();
    }
    if (statusDistributionChart) {
        statusDistributionChart.destroy();
    }
});
