const WAREHOUSE_API = `${CONFIG.API_BASE_URL}/api/inventory/warehouses`;

document.addEventListener('DOMContentLoaded', () => {
    loadWarehouses();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadWarehouses);

    const addBtn = document.getElementById('addWarehouseBtn');
    if (addBtn) addBtn.addEventListener('click', () => openWarehouseModal('create'));
});

async function loadWarehouses() {
    try {
        showLoading('warehouseTableBody');
        const res = await fetchWithAuth(WAREHOUSE_API);
        if (!res.ok) throw new Error('Failed to load warehouses');

        const json = await res.json();
        // Backend: ok(res, dataArray, message)
        const payload = json && json.data ? json.data : json || [];
        const warehouses = Array.isArray(payload) ? payload : [];
        renderWarehouses(warehouses);
    } catch (err) {
        console.error(err);
        showError('warehouseTableBody', 'Unable to load warehouses');
    }
}

function renderWarehouses(warehouses) {
    const tbody = document.getElementById('warehouseTableBody');
    if (!tbody) return;

    if (!warehouses || warehouses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No warehouses found</td></tr>`;
        return;
    }

    const user = typeof getStoredUser === 'function' ? getStoredUser() : null;
    const isAdmin = user && user.role === 'Admin';

    tbody.innerHTML = warehouses.map(w => {
        const status = w.is_active === false ? 'Inactive' : 'Active';
        const badge = status === 'Active' ? 'success' : 'secondary';
        const location = w.location || w.address || '-';
        const code = w.warehouse_code || w.code || 'N/A';
        const locationsCount = w.location_count ?? w.locations_count ?? 0;
        const stockValue = typeof w.total_stock_value === 'number'
            ? formatCurrency(w.total_stock_value)
            : '-';

        const actionsHtml = isAdmin
            ? `
                <button class="btn btn-sm btn-outline-primary me-1"
                        onclick="openWarehouseModal('edit', ${w.warehouse_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-${status === 'Active' ? 'warning' : 'success'}"
                        onclick="toggleWarehouseActive(${w.warehouse_id}, ${w.is_active !== false})">
                    <i class="fas fa-${status === 'Active' ? 'ban' : 'check'}"></i>
                </button>
            `
            : '<span class="text-muted small">View only</span>';

        return `
            <tr>
                <td>${w.warehouse_name || 'N/A'}</td>
                <td>${code}</td>
                <td>${location}</td>
                <td>${locationsCount}</td>
                <td>${stockValue}</td>
                <td class="text-end">
                    <span class="badge bg-${badge} me-2">${status}</span>
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }).join('');
}

function openWarehouseModal(mode, warehouseId = null) {
    const modalEl = document.getElementById('warehouseModal');
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    const title = document.getElementById('warehouseModalTitle');
    const form = document.getElementById('warehouseForm');

    form.reset();
    form.dataset.mode = mode;
    form.dataset.id = warehouseId ? String(warehouseId) : '';

    if (title) {
        title.textContent = mode === 'create' ? 'Add Warehouse' : 'Edit Warehouse';
    }

    if (mode === 'edit' && warehouseId) {
        loadWarehouseIntoForm(warehouseId);
    }

    modal.show();
}

async function loadWarehouseIntoForm(id) {
    try {
        const res = await fetchWithAuth(`${WAREHOUSE_API}/${id}`);
        if (!res.ok) throw new Error('Failed to fetch warehouse');

        const json = await res.json();
        const data = json && json.data ? json.data : json || {};

        document.getElementById('warehouseName').value = data.warehouse_name || '';
        document.getElementById('warehouseCode').value = data.warehouse_code || data.code || '';
        document.getElementById('warehouseLocation').value = data.location || data.address || '';
        document.getElementById('warehousePhone').value = data.phone || '';
        document.getElementById('warehouseIsActive').checked = data.is_active !== false;
    } catch (err) {
        console.error('Error loading warehouse into form', err);
        alert('Failed to load warehouse details');
    }
}

async function submitWarehouseForm(event) {
    event.preventDefault();

    const form = document.getElementById('warehouseForm');
    const mode = form.dataset.mode;
    const id = form.dataset.id;

    const payload = {
        warehouse_name: document.getElementById('warehouseName').value.trim(),
        warehouse_code: document.getElementById('warehouseCode').value.trim() || undefined,
        location: document.getElementById('warehouseLocation').value.trim() || null,
        phone: document.getElementById('warehousePhone').value.trim() || null,
        is_active: document.getElementById('warehouseIsActive').checked
    };

    const submitBtn = document.getElementById('warehouseSubmitBtn');
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    try {
        const url = mode === 'edit'
            ? `${WAREHOUSE_API}/${id}`
            : WAREHOUSE_API;
        const method = mode === 'edit' ? 'PUT' : 'POST';

        const res = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(payload)
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
            throw new Error(json.message || 'Failed to save warehouse');
        }

        bootstrap.Modal.getInstance(document.getElementById('warehouseModal'))?.hide();
        await loadWarehouses();
    } catch (err) {
        console.error('Warehouse save error', err);
        alert(err.message || 'Failed to save warehouse');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function toggleWarehouseActive(id, currentlyActive) {
    if (!id) return;

    const confirmText = currentlyActive
        ? 'Deactivate this warehouse? It will not be available for new operations.'
        : 'Activate this warehouse?';

    if (!confirm(confirmText)) return;

    try {
        const res = await fetchWithAuth(`${WAREHOUSE_API}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: !currentlyActive })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
            throw new Error(json.message || 'Failed to update warehouse');
        }

        await loadWarehouses();
    } catch (err) {
        console.error('Toggle warehouse status error', err);
        alert(err.message || 'Failed to update warehouse status');
    }
}

if (typeof window !== 'undefined') {
    window.openWarehouseModal = openWarehouseModal;
    window.submitWarehouseForm = submitWarehouseForm;
    window.toggleWarehouseActive = toggleWarehouseActive;
}

