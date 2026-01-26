let alertsTable;
let historyTable;
let selectedItems = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.warn("REORDER AUTOMATION JS LOADED - VERSION 3.0");
    // Check authentication
    const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER));
    if (!user || !['Admin', 'Manager'].includes(user.role)) {
        window.location.href = '../index.html';
        return;
    }

    initializeDataTables();
    await loadDashboardData();

    // Show rule condition field based on selection
    document.getElementById('ruleCondition').addEventListener('change', (e) => {
        const customDiv = document.getElementById('customThresholdDiv');
        customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
});

function initializeDataTables() {
    alertsTable = $('#alertsTable').DataTable({
        responsive: true,
        pageLength: 25,
        order: [[1, 'asc'], [4, 'asc']],
        columnDefs: [
            { orderable: false, targets: [0, 9] }
        ]
    });

    historyTable = $('#historyTable').DataTable({
        responsive: true,
        pageLength: 10,
        order: [[1, 'desc']]
    });
}

async function loadDashboardData() {
    try {
        // Load statistics
        await loadStatistics();

        // Load active alerts
        await loadAlerts();

        // Load automation rules
        await loadRules();

        // Load execution history
        await loadHistory();

        // Load schedule
        await loadSchedule();

        // Load system status
        await loadSystemStatus();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        Notify.error('Failed to load automation dashboard');
    }
}

async function loadStatistics() {
    try {
        const response = await API.get('/api/reorder/statistics');

        if (response.success) {
            document.getElementById('criticalItems').textContent = response.stats.critical || 0;
            document.getElementById('urgentItems').textContent = response.stats.urgent || 0;
            document.getElementById('autoPRsCreated').textContent = response.stats.auto_prs_created || 0;
            document.getElementById('totalSavings').textContent = `₹${(response.stats.estimated_savings || 0).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadAlerts() {
    try {
        const response = await API.get('/api/reorder/alerts');

        if (!response || (!response.success && !response.data?.success)) {
            console.error('API Error Details:', response);
            throw new Error('Failed to load alerts');
        }

        console.log('DEBUG ALERTS RESPONSE (V3):', response);
        const alertsData = response.alerts || (response.data && response.data.alerts) || [];

        alertsTable.clear();

        alertsData.forEach(alert => {
            let priority = 'low';
            let priorityLabel = 'Low';
            let priorityClass = 'priority-low';

            if (alert.current_stock === 0) {
                priority = 'critical';
                priorityLabel = 'Critical';
                priorityClass = 'priority-critical';
            } else if (alert.current_stock < alert.reorder_point * 0.5) {
                priority = 'high';
                priorityLabel = 'High';
                priorityClass = 'priority-high';
            } else if (alert.current_stock < alert.reorder_point) {
                priority = 'medium';
                priorityLabel = 'Medium';
                priorityClass = 'priority-medium';
            }

            // Calculate suggested quantity
            const suggestedQty = Math.max(
                (alert.reorder_point + alert.safety_stock) - alert.current_stock,
                alert.min_order_qty || 1
            );

            const estimatedCost = suggestedQty * (alert.supplier_unit_price || 0);

            const actions = `
                <button class="btn btn-sm btn-primary" onclick="createSinglePR(${alert.item_id})" title="Create PR">
                    <i class="fas fa-file-alt"></i>
                </button>
                <button class="btn btn-sm btn-info" onclick="viewItemDetails(${alert.item_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;

            alertsTable.row.add([
                `<input type="checkbox" class="item-checkbox" value="${alert.item_id}" onchange="updateSelection()">`,
                `<span class="badge ${priorityClass}">${priorityLabel}</span>`,
                alert.sku,
                alert.item_name,
                `<span class="badge bg-${alert.current_stock === 0 ? 'danger' : 'warning'}">${alert.current_stock}</span>`,
                alert.reorder_point,
                `<strong>${suggestedQty}</strong>`,
                alert.preferred_supplier || 'N/A',
                `₹${estimatedCost.toLocaleString()}`,
                actions
            ]);
        });

        alertsTable.draw();

    } catch (error) {
        console.error('Error loading alerts:', error);
        Notify.error('Failed to load reorder alerts');
    }
}

async function loadRules() {
    try {
        const response = await API.get('/api/reorder/rules');

        if (!response.success) {
            throw new Error('Failed to load rules');
        }

        const container = document.getElementById('rulesContainer');

        if (response.rules.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No automation rules configured. Click "Add Rule" to create one.</p>';
            return;
        }

        container.innerHTML = '';

        response.rules.forEach(rule => {
            const statusClass = rule.is_enabled ? 'status-enabled' : 'status-disabled';
            const statusText = rule.is_enabled ? 'Enabled' : 'Disabled';

            const ruleCard = `
                <div class="rule-card">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="mb-1">${rule.rule_name}</h6>
                            <small class="text-muted">${rule.description || 'No description'}</small>
                        </div>
                        <div class="col-md-3">
                            <span class="${statusClass}">${statusText}</span>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-sm btn-outline-primary" onclick="editRule(${rule.rule_id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteRule(${rule.rule_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-${rule.is_enabled ? 'warning' : 'success'}" onclick="toggleRule(${rule.rule_id}, ${rule.is_enabled})">
                                <i class="fas fa-${rule.is_enabled ? 'pause' : 'play'}"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', ruleCard);
        });
    } catch (error) {
        console.error('Error loading rules:', error);
    }
}

async function loadHistory() {
    try {
        const response = await API.get('/api/reorder/history?limit=50');

        if (!response.success) {
            throw new Error('Failed to load history');
        }

        historyTable.clear();

        response.history.forEach(run => {
            const statusClass = run.status === 'Success' ? 'success' :
                run.status === 'Failed' ? 'danger' : 'warning';

            const actions = `
                <button class="btn btn-sm btn-info" onclick="viewRunDetails(${run.run_id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;

            historyTable.row.add([
                `#${run.run_id}`,
                new Date(run.run_timestamp).toLocaleString(),
                run.items_checked || 0,
                run.alerts_generated || 0,
                run.prs_created || 0,
                `<span class="badge bg-${statusClass}">${run.status}</span>`,
                `${run.duration_seconds || 0}s`,
                actions
            ]);
        });

        historyTable.draw();

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function loadSchedule() {
    try {
        const response = await API.get('/api/reorder/schedule');

        if (response.success && response.schedule) {
            document.getElementById('scheduleFrequency').value = response.schedule.frequency || 'disabled';
            document.getElementById('scheduleTime').value = response.schedule.run_time || '09:00';
            document.getElementById('autoCreatePRs').checked = response.schedule.auto_create_prs || false;
            document.getElementById('emailNotifications').checked = response.schedule.email_notifications || false;
            document.getElementById('excludeWeekends').checked = response.schedule.exclude_weekends || false;

            if (response.schedule.next_run) {
                document.getElementById('nextRun').textContent = new Date(response.schedule.next_run).toLocaleString();
            }
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function loadSystemStatus() {
    try {
        const response = await API.get('/api/reorder/status');

        if (response.success) {
            const statusElement = document.getElementById('systemStatus');
            statusElement.className = response.status.enabled ? 'status-enabled' : 'status-disabled';
            statusElement.textContent = response.status.enabled ? 'Enabled' : 'Disabled';

            if (response.status.last_run) {
                document.getElementById('lastRun').textContent = new Date(response.status.last_run).toLocaleString();
            }
        }
    } catch (error) {
        console.error('Error loading system status:', error);
    }
}

async function runAutomationNow() {
    const result = await Swal.fire({
        title: 'Run Reorder Automation?',
        text: 'This will check all items and create PRs for items below reorder point.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, run now',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Running Automation...',
                text: 'Please wait while we check stock levels',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await API.post('/api/reorder/run');

            Swal.close();

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: response.message || 'Automation Complete',
                    html: `
                        <p><strong>${response.items_checked || 0}</strong> items checked</p>
                        <p><strong>${response.alerts_generated || 0}</strong> alerts generated</p>
                        <p><strong>${response.prs_created || 0}</strong> PRs created</p>
                    `,
                    confirmButtonText: 'OK'
                });

                // Reload data
                await loadDashboardData();
            }
        } catch (error) {
            Swal.close();
            console.error('Error running automation:', error);
            Notify.error('Failed to run automation');
        }
    }
}

async function createSinglePR(itemId) {
    try {
        // Get item details
        const response = await API.get(`/api/inventory/items/${itemId}`);

        if (!response.success) {
            throw new Error('Failed to load item details');
        }

        const data = response.data || response;
        const item = data.item || data;

        // Populate modal
        document.getElementById('prItemId').value = item.item_id;
        document.getElementById('prItemName').value = item.item_name;
        document.getElementById('prSKU').value = item.sku;
        document.getElementById('prCurrentStock').value = item.current_stock || 0;
        document.getElementById('prReorderPoint').value = item.reorder_point;

        // Calculate suggested quantity
        const suggestedQty = Math.max(
            (item.reorder_point + (item.safety_stock || 0)) - (item.current_stock || 0),
            1
        );
        document.getElementById('prQuantity').value = suggestedQty;

        // Load suppliers
        await loadSuppliers(item.item_id);

        // Set required by date (lead time days from now)
        const requiredDate = new Date();
        requiredDate.setDate(requiredDate.getDate() + (item.lead_time_days || 7));
        document.getElementById('prRequiredBy').value = requiredDate.toISOString().split('T')[0];

        // Set justification
        document.getElementById('prJustification').value = `Auto-generated: Item below reorder point (${item.reorder_point}). Current stock: ${item.current_stock || 0}`;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createPRModal'));
        modal.show();

    } catch (error) {
        console.error('Error opening PR modal:', error);
        Notify.error('Failed to load item details');
    }
}

async function loadSuppliers(itemId) {
    try {
        const response = await API.get(`/api/inventory/items/${itemId}/suppliers`);
        const select = document.getElementById('prSupplier');
        if (!select) return;
        select.innerHTML = '<option value="">Select Supplier</option>';

        const suppliers = response.data || response.suppliers || [];
        if (response.success && suppliers.length > 0) {
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.supplier_id;
                option.textContent = `${supplier.supplier_name} - ₹${supplier.unit_price || 0}`;
                if (supplier.is_preferred) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function submitPR() {
    try {
        const data = {
            item_id: document.getElementById('prItemId').value,
            quantity: document.getElementById('prQuantity').value,
            supplier_id: document.getElementById('prSupplier').value,
            required_by: document.getElementById('prRequiredBy').value,
            justification: document.getElementById('prJustification').value
        };

        if (!data.supplier_id) {
            Notify.error('Please select a supplier');
            return;
        }

        if (!data.quantity || data.quantity <= 0) {
            Notify.error('Please enter a valid quantity');
            return;
        }

        const payload = {
            pr_date: new Date().toISOString().split('T')[0],
            remarks: `Manual request from Reorder Alerts`,
            items: [
                {
                    item_id: parseInt(data.item_id),
                    requested_qty: parseInt(data.quantity),
                    justification: data.justification
                }
            ]
        };

        const response = await API.post('/api/reorder/pr', payload);

        if (response.success) {
            Notify.success(`PR ${response.pr_number || 'created'} successfully`);
            bootstrap.Modal.getInstance(document.getElementById('createPRModal')).hide();
            await loadAlerts(); // Refresh alerts
        }
    } catch (error) {
        console.error('Error creating PR:', error);
        Notify.error('Failed to create PR');
    }
}

async function createBulkPR() {
    if (selectedItems.length === 0) {
        Notify.warning('Please select items to create PRs');
        return;
    }

    const result = await Swal.fire({
        title: 'Create Bulk PR?',
        text: `Create PRs for ${selectedItems.length} selected items?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, create',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Creating PRs...',
                text: 'Please wait',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await API.post('/api/reorder/bulk-pr', {
                item_ids: selectedItems
            });

            Swal.close();

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'PRs Created',
                    text: `${response.prs_created || 0} PRs created successfully`,
                    confirmButtonText: 'OK'
                });

                selectedItems = [];
                document.getElementById('selectAll').checked = false;
                await loadAlerts();
            }
        } catch (error) {
            Swal.close();
            console.error('Error creating bulk PRs:', error);
            Notify.error('Failed to create bulk PRs');
        }
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelection();
}

function updateSelection() {
    selectedItems = Array.from(document.querySelectorAll('.item-checkbox:checked'))
        .map(cb => parseInt(cb.value));
}

async function exportAlerts() {
    try {
        const response = await API.get('/api/reorder/alerts');

        if (!response.success || !response.alerts || response.alerts.length === 0) {
            Notify.warning('No alerts to export');
            return;
        }

        const data = [
            ['Reorder Alerts Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['SKU', 'Item Name', 'Current Stock', 'Reorder Point', 'Suggested Qty', 'Supplier', 'Est. Cost']
        ];

        response.alerts.forEach(alert => {
            const suggestedQty = Math.max(
                (alert.reorder_point + (alert.safety_stock || 0)) - alert.current_stock,
                alert.min_order_qty || 1
            );

            data.push([
                alert.sku,
                alert.item_name,
                alert.current_stock,
                alert.reorder_point,
                suggestedQty,
                alert.preferred_supplier || 'N/A',
                suggestedQty * (alert.supplier_unit_price || 0)
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reorder Alerts");
        XLSX.writeFile(wb, `Reorder_Alerts_${new Date().toISOString().split('T')[0]}.xlsx`);

        Notify.success('Export successful');

    } catch (error) {
        console.error('Error exporting alerts:', error);
        Notify.error('Failed to export alerts');
    }
}

async function saveSchedule() {
    try {
        const data = {
            frequency: document.getElementById('scheduleFrequency').value,
            run_time: document.getElementById('scheduleTime').value,
            auto_create_prs: document.getElementById('autoCreatePRs').checked,
            email_notifications: document.getElementById('emailNotifications').checked,
            exclude_weekends: document.getElementById('excludeWeekends').checked
        };

        const response = await API.post('/api/reorder/schedule', data);

        if (response.success) {
            Notify.success('Schedule saved successfully');
            await loadSchedule();
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        Notify.error('Failed to save schedule');
    }
}

function addNewRule() {
    document.getElementById('ruleName').value = '';
    document.getElementById('ruleCondition').value = 'below_reorder';
    document.getElementById('ruleAction').value = 'alert';
    document.getElementById('ruleEnabled').checked = true;
    document.getElementById('customThresholdDiv').style.display = 'none';

    const modal = new bootstrap.Modal(document.getElementById('addRuleModal'));
    modal.show();
}

async function saveRule() {
    try {
        const data = {
            rule_name: document.getElementById('ruleName').value,
            condition: document.getElementById('ruleCondition').value,
            action: document.getElementById('ruleAction').value,
            is_enabled: document.getElementById('ruleEnabled').checked,
            custom_threshold: document.getElementById('customThreshold').value
        };

        if (!data.rule_name) {
            Notify.error('Please enter rule name');
            return;
        }

        const response = await API.post('/api/reorder/rules', data);

        if (response.success) {
            Notify.success('Rule saved successfully');
            bootstrap.Modal.getInstance(document.getElementById('addRuleModal')).hide();
            await loadRules();
        }
    } catch (error) {
        console.error('Error saving rule:', error);
        Notify.error('Failed to save rule');
    }
}

function editRule(ruleId) {
    // TODO: Implement edit rule functionality
    Notify.info('Edit rule functionality coming soon');
}

async function toggleRule(ruleId, currentStatus) {
    try {
        const response = await API.put(`/api/reorder/rules/${ruleId}/toggle`, {
            is_enabled: !currentStatus
        });

        if (response.success) {
            Notify.success(`Rule ${currentStatus ? 'disabled' : 'enabled'} successfully`);
            await loadRules();
        }
    } catch (error) {
        console.error('Error toggling rule:', error);
        Notify.error('Failed to toggle rule');
    }
}

async function deleteRule(ruleId) {
    const result = await Swal.fire({
        title: 'Delete Rule?',
        text: 'This action cannot be undone',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it'
    });

    if (result.isConfirmed) {
        try {
            const response = await API.delete(`/api/reorder/rules/${ruleId}`);

            if (response.success) {
                Notify.success('Rule deleted successfully');
                await loadRules();
            }
        } catch (error) {
            console.error('Error deleting rule:', error);
            Notify.error('Failed to delete rule');
        }
    }
}

async function viewLogs() {
    try {
        const modal = new bootstrap.Modal(document.getElementById('logsModal'));
        modal.show();

        const response = await API.get('/api/reorder/logs?limit=100');

        if (response.success && response.logs) {
            const logContent = document.getElementById('logContent');
            logContent.innerHTML = response.logs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                const levelClass = log.level === 'ERROR' ? 'text-danger' :
                    log.level === 'WARNING' ? 'text-warning' : 'text-info';
                return `<div class="${levelClass}">[${timestamp}] [${log.level}] ${log.message}</div>`;
            }).join('');
        } else {
            document.getElementById('logContent').innerHTML = '<div class="text-muted">No logs available</div>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logContent').innerHTML = '<div class="text-danger">Failed to load logs</div>';
    }
}

function downloadLogs() {
    // TODO: Implement download logs functionality
    Notify.info('Download logs functionality coming soon');
}

function openSettingsModal() {
    window.location.href = 'settings.html#reorder';
}

async function viewItemDetails(itemId) {
    window.location.href = `inventory.html?item_id=${itemId}`;
}

async function viewRunDetails(runId) {
    try {
        const response = await API.get(`/api/reorder/history/${runId}`);

        if (response.success && response.run) {
            await Swal.fire({
                title: `Run #${runId} Details`,
                html: `
                    <div class="text-start">
                        <p><strong>Timestamp:</strong> ${new Date(response.run.run_timestamp).toLocaleString()}</p>
                        <p><strong>Items Checked:</strong> ${response.run.items_checked || 0}</p>
                        <p><strong>Alerts Generated:</strong> ${response.run.alerts_generated || 0}</p>
                        <p><strong>PRs Created:</strong> ${response.run.prs_created || 0}</p>
                        <p><strong>Status:</strong> ${response.run.status}</p>
                        <p><strong>Duration:</strong> ${response.run.duration_seconds || 0}s</p>
                        ${response.run.error_message ? `<p class="text-danger"><strong>Error:</strong> ${response.run.error_message}</p>` : ''}
                    </div>
                `,
                width: 600
            });
        }
    } catch (error) {
        console.error('Error loading run details:', error);
        Notify.error('Failed to load run details');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

