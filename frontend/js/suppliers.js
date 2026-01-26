const SUPPLIER_API = `${CONFIG.API_BASE_URL}/api/suppliers`;

let currentSuppliersPage = 1;
let totalSuppliersPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    loadSuppliers();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadSuppliers(currentSuppliersPage));

    const addBtn = document.getElementById('addSupplierBtn');
    if (addBtn) addBtn.addEventListener('click', () => openSupplierModal('create'));

    const prevBtn = document.getElementById('suppliersPrevPage');
    const nextBtn = document.getElementById('suppliersNextPage');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentSuppliersPage > 1) loadSuppliers(currentSuppliersPage - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentSuppliersPage < totalSuppliersPages) loadSuppliers(currentSuppliersPage + 1);
    });
});

async function loadSuppliers(page = 1) {
    try {
        showLoading('suppliersTableBody');

        const params = new URLSearchParams({
            page: String(page),
            limit: '20'
        });

        const res = await fetchWithAuth(`${SUPPLIER_API}?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load suppliers');

        const json = await res.json();
        const payload = json && json.data ? json.data : json || {};
        const suppliers = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.suppliers)
                ? payload.suppliers
                : [];

        currentSuppliersPage = payload.pagination?.page || page;
        totalSuppliersPages = payload.pagination?.totalPages || 1;
        updateSuppliersPagination();

        renderSuppliers(suppliers);
    } catch (err) {
        console.error(err);
        showError('suppliersTableBody', 'Unable to load suppliers');
    }
}

function updateSuppliersPagination() {
    const info = document.getElementById('suppliersPageInfo');
    const prevBtn = document.getElementById('suppliersPrevPage');
    const nextBtn = document.getElementById('suppliersNextPage');

    if (info) {
        info.textContent = `Page ${currentSuppliersPage} of ${totalSuppliersPages}`;
    }
    if (prevBtn) {
        prevBtn.disabled = currentSuppliersPage <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentSuppliersPage >= totalSuppliersPages;
    }
}

function renderSuppliers(suppliers) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    if (!suppliers || suppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No suppliers found</td></tr>`;
        return;
    }

    const user = typeof getStoredUser === 'function' ? getStoredUser() : null;
    const isAdmin = user && user.role === 'Admin';

    tbody.innerHTML = suppliers.map(s => {
        const rating = s.performance_rating ?? s.average_rating ?? s.rating ?? '-';
        const status = s.is_active === false ? 'Inactive' : 'Active';
        const badge = status === 'Active' ? 'success' : 'secondary';
        const phone = s.contact_phone || s.phone || 'N/A';
        const email = s.contact_email || s.email || 'N/A';
        const city = s.city || '-';

        const actionsHtml = isAdmin
            ? `
                <button class="btn btn-sm btn-outline-primary me-1" 
                        onclick="openSupplierModal('edit', ${s.supplier_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-${status === 'Active' ? 'warning' : 'success'}"
                        onclick="toggleSupplierStatus(${s.supplier_id}, ${s.is_active !== false})">
                    <i class="fas fa-${status === 'Active' ? 'ban' : 'check'}"></i>
                </button>
            `
            : '<span class="text-muted small">View only</span>';

        return `
            <tr>
                <td>${s.supplier_name || 'N/A'}</td>
                <td>${email}</td>
                <td>${phone}</td>
                <td>${city}</td>
                <td>${rating}</td>
                <td><span class="badge bg-${badge}">${status}</span></td>
                <td class="text-end">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }).join('');
}

function openSupplierModal(mode, supplierId = null) {
    const modalEl = document.getElementById('supplierModal');
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    const title = document.getElementById('supplierModalTitle');
    const form = document.getElementById('supplierForm');

    form.reset();
    form.dataset.mode = mode;
    form.dataset.id = supplierId ? String(supplierId) : '';

    if (title) {
        title.textContent = mode === 'create' ? 'Add Supplier' : 'Edit Supplier';
    }

    if (mode === 'edit' && supplierId) {
        loadSupplierIntoForm(supplierId);
    }

    modal.show();
}

async function loadSupplierIntoForm(id) {
    try {
        const res = await fetchWithAuth(`${SUPPLIER_API}/${id}`);
        if (!res.ok) throw new Error('Failed to fetch supplier');

        const json = await res.json();
        const data = json && json.data ? json.data : json || {};

        document.getElementById('supplierName').value = data.supplier_name || '';
        document.getElementById('supplierEmail').value = data.contact_details?.email || data.email || '';
        document.getElementById('supplierPhone').value = data.contact_details?.phone || data.phone || '';
        document.getElementById('supplierCity').value = data.address_details?.city || data.city || '';
        document.getElementById('supplierPaymentTerms').value = data.business_details?.payment_terms_days ?? data.payment_terms_days ?? '';
        document.getElementById('supplierLeadTime').value = data.business_details?.avg_lead_time_days ?? data.avg_lead_time_days ?? '';
        document.getElementById('supplierIsActive').checked = data.is_active !== false;
    } catch (err) {
        console.error('Error loading supplier into form', err);
        alert('Failed to load supplier details');
    }
}

async function submitSupplierForm(event) {
    event.preventDefault();

    const form = document.getElementById('supplierForm');
    const mode = form.dataset.mode;
    const id = form.dataset.id;

    const payload = {
        supplier_name: document.getElementById('supplierName').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        city: document.getElementById('supplierCity').value.trim() || null,
        payment_terms_days: parseInt(document.getElementById('supplierPaymentTerms').value, 10) || 0,
        avg_lead_time_days: parseInt(document.getElementById('supplierLeadTime').value, 10) || null,
        is_active: document.getElementById('supplierIsActive').checked
    };

    const submitBtn = document.getElementById('supplierSubmitBtn');
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    try {
        const url = mode === 'edit'
            ? `${SUPPLIER_API}/${id}`
            : SUPPLIER_API;

        const method = mode === 'edit' ? 'PUT' : 'POST';

        const res = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(payload)
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.success === false) {
            const msg = json.message || 'Failed to save supplier';
            throw new Error(msg);
        }

        bootstrap.Modal.getInstance(document.getElementById('supplierModal'))?.hide();
        await loadSuppliers(currentSuppliersPage);
    } catch (err) {
        console.error('Supplier save error', err);
        alert(err.message || 'Failed to save supplier');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function toggleSupplierStatus(id, currentlyActive) {
    if (!id) return;

    const confirmText = currentlyActive
        ? 'Deactivate this supplier? They will no longer be available for new purchase orders.'
        : 'Re-activate this supplier?';

    if (!confirm(confirmText)) return;

    try {
        if (currentlyActive) {
            // Backend delete is implemented as deactivate
            const res = await fetchWithAuth(`${SUPPLIER_API}/${id}`, { method: 'DELETE' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.success === false) {
                throw new Error(json.message || 'Failed to deactivate supplier');
            }
        } else {
            // Reactivate via update
            const res = await fetchWithAuth(`${SUPPLIER_API}/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: true })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.success === false) {
                throw new Error(json.message || 'Failed to activate supplier');
            }
        }

        await loadSuppliers(currentSuppliersPage);
    } catch (err) {
        console.error('Toggle supplier status error', err);
        alert(err.message || 'Failed to update supplier status');
    }
}

// Expose form handler
if (typeof window !== 'undefined') {
    window.submitSupplierForm = submitSupplierForm;
    window.openSupplierModal = openSupplierModal;
    window.toggleSupplierStatus = toggleSupplierStatus;
}

