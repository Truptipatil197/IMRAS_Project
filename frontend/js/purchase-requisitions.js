const PR_API_BASE = `${CONFIG.API_BASE_URL}/api/reorder`;

let currentPRs = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPurchaseRequisitions();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadPurchaseRequisitions);
    }
});

async function loadPurchaseRequisitions() {
    try {
        showLoading('prTableBody');

        const res = await fetchWithAuth(`${PR_API_BASE}/pr`);
        if (!res.ok) throw new Error('Failed to load purchase requisitions');

        const json = await res.json();
        const payload = json && json.data ? json.data : json || {};
        const prs = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.purchase_requisitions)
                ? payload.purchase_requisitions
                : [];

        currentPRs = prs;

        updateSummary(prs);
        renderPRTable(prs);
    } catch (err) {
        console.error(err);
        showError('prTableBody', 'Unable to load purchase requisitions');
    }
}

function updateSummary(prs) {
    const pending = prs.filter(p => (p.status || '').toLowerCase() === 'pending').length;
    const approved = prs.filter(p => (p.status || '').toLowerCase() === 'approved').length;
    const rejected = prs.filter(p => (p.status || '').toLowerCase() === 'rejected').length;
    const toPo = prs.filter(p => !!p.po_id).length;

    setText('pendingCount', pending);
    setText('approvedCount', approved);
    setText('rejectedCount', rejected);
    setText('poCount', toPo);
}

function renderPRTable(prs) {
    const tbody = document.getElementById('prTableBody');
    if (!tbody) return;

    if (!prs || prs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No purchase requisitions found</td></tr>`;
        return;
    }

    const user = typeof getStoredUser === 'function' ? getStoredUser() : null;
    const userRole = (user && user.role || '').toString().toLowerCase();
    const canApprove = userRole === 'manager' || userRole === 'admin';

    // Diagnostic log to help debug if buttons are still missing
    console.log('[PR-DEBUG] User:', user);
    console.log('[PR-DEBUG] User role (processed):', userRole);
    console.log('[PR-DEBUG] canApprove:', canApprove);

    tbody.innerHTML = prs.map(pr => {
        const rawStatus = pr.status || '';
        const status = rawStatus.toLowerCase().trim();

        console.log(`[PR-DEBUG] PR ${pr.pr_number || pr.pr_id}: rawStatus="${rawStatus}", processedStatus="${status}"`);

        const badgeClass =
            status === 'approved' ? 'success' :
                status === 'rejected' ? 'danger' :
                    'warning';
        const itemsCount = pr.items_count ?? (pr.items ? pr.items.length : pr.total_items || 0);
        const requesterName = pr.requester?.full_name || pr.requester_name || 'N/A';

        const actions = [];
        actions.push(`
            <button class="btn btn-outline-primary" onclick="viewPR(${pr.pr_id})" title="View Details">
                <i class="fas fa-eye"></i> View
            </button>
        `);

        if (canApprove && (status === 'pending' || status === '')) {
            actions.push(`
                <button class="btn btn-sm btn-success mx-1" onclick="approvePR(${pr.pr_id})" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="rejectPR(${pr.pr_id})" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            `);
        }

        return `
            <tr>
                <td>${pr.pr_number || pr.pr_id || '-'}</td>
                <td>${formatDate(pr.pr_date)}</td>
                <td><span class="badge bg-${badgeClass} text-uppercase">${status || 'pending'}</span></td>
                <td>${itemsCount}</td>
                <td>${requesterName}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        ${actions.join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewPR(prId) {
    if (!prId) return;

    try {
        const res = await fetchWithAuth(`${PR_API_BASE}/pr/${prId}`);
        if (!res.ok) throw new Error('Failed to load PR details');

        const json = await res.json();
        const data = json && json.data ? json.data : json || {};

        const modalEl = document.getElementById('prDetailsModal');
        if (!modalEl) return;

        document.getElementById('prModalNumber').textContent = data.pr_number || prId;
        document.getElementById('prModalStatus').textContent = data.status || '-';
        document.getElementById('prModalDate').textContent = formatDate(data.pr_date);
        document.getElementById('prModalRequester').textContent = data.requester?.full_name || 'N/A';
        document.getElementById('prModalApprover').textContent = data.approver?.full_name || '-';
        document.getElementById('prModalRemarks').textContent = data.remarks || '-';

        // --- Conversion Logic Start ---
        const convArea = document.getElementById('conversionArea');
        const convBtn = document.getElementById('convertToPoBtn');
        const isApproved = (data.status || '').toLowerCase() === 'approved';
        const hasPo = data.purchaseOrders && data.purchaseOrders.length > 0;

        if (convArea && convBtn) {
            if (isApproved && !hasPo) {
                convArea.style.display = 'block';
                convBtn.style.display = 'block';
                await loadSuppliersForConversion();

                // Set default date to +7 days
                const dateInput = document.getElementById('poDeliveryDate');
                if (dateInput) {
                    const future = new Date();
                    future.setDate(future.getDate() + 7);
                    dateInput.value = future.toISOString().split('T')[0];
                }

                window.currentPrId = prId; // Cache for conversion
            } else {
                convArea.style.display = 'none';
                convBtn.style.display = 'none';
            }
        }
        // --- Conversion Logic End ---

        const itemsBody = document.getElementById('prModalItemsBody');
        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
            itemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No items</td></tr>`;
        } else {
            itemsBody.innerHTML = items.map(it => `
                <tr>
                    <td>${it.item?.sku || '-'}</td>
                    <td>${it.item?.item_name || '-'}</td>
                    <td>${it.requested_qty}</td>
                    <td>${it.current_stock ?? 0}</td>
                    <td>${formatCurrency(it.line_total ?? 0)}</td>
                </tr>
            `).join('');
        }

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (err) {
        console.error('View PR error', err);
        alert('Failed to load PR details');
    }
}

async function loadSuppliersForConversion() {
    try {
        const res = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/suppliers`);
        if (!res.ok) return;
        const json = await res.json();
        const suppliers = (json.data && json.data.suppliers) ? json.data.suppliers : (json.data || json.suppliers || []);

        const select = document.getElementById('poSupplier');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose Supplier --</option>';
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.supplier_id;
            opt.textContent = s.supplier_name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Error loading suppliers', e);
    }
}

async function processConversion() {
    const prId = window.currentPrId;
    const supplierId = document.getElementById('poSupplier').value;
    const deliveryDate = document.getElementById('poDeliveryDate').value;

    if (!supplierId) return alert('Please select a supplier');
    if (!deliveryDate) return alert('Please select expected delivery date');

    try {
        const btn = document.getElementById('convertToPoBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Converting...';

        const res = await fetchWithAuth(`${PR_API_BASE}/pr/${prId}/po`, {
            method: 'POST',
            body: JSON.stringify({
                supplier_id: supplierId,
                expected_delivery_date: deliveryDate
            })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Conversion failed');

        alert(`Successfully converted to PO: ${json.data?.po_number || 'Success'}`);

        // Hide modal and refresh list
        const modal = bootstrap.Modal.getInstance(document.getElementById('prDetailsModal'));
        modal.hide();
        loadPurchaseRequisitions();

    } catch (err) {
        console.error('Conversion error', err);
        alert(err.message);
    } finally {
        const btn = document.getElementById('convertToPoBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Create Purchase Order';
    }
}

async function approvePR(prId) {
    if (!prId) return;
    if (!confirm('Approve this purchase requisition?')) return;

    try {
        const res = await fetchWithAuth(`${PR_API_BASE}/pr/${prId}/approve`, {
            method: 'POST'
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
            throw new Error(json.message || 'Failed to approve PR');
        }
        await loadPurchaseRequisitions();
    } catch (err) {
        console.error('Approve PR error', err);
        alert(err.message || 'Failed to approve PR');
    }
}

async function rejectPR(prId) {
    if (!prId) return;
    const reason = prompt('Enter rejection reason (optional):') || null;

    try {
        const res = await fetchWithAuth(`${PR_API_BASE}/pr/${prId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ remarks: reason })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
            throw new Error(json.message || 'Failed to reject PR');
        }
        await loadPurchaseRequisitions();
    } catch (err) {
        console.error('Reject PR error', err);
        alert(err.message || 'Failed to reject PR');
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

