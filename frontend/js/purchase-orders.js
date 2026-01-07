const PO_API_BASE = `${CONFIG.API_BASE_URL}/api`;

document.addEventListener('DOMContentLoaded', () => {
    loadPendingPOs();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadPendingPOs);

    const statusBtn = document.getElementById('statusBtn');
    if (statusBtn) statusBtn.addEventListener('click', checkStatus);
});

async function loadPendingPOs() {
    try {
        showLoading('poTableBody');

        const res = await fetchWithAuth(`${PO_API_BASE}/grn/pending-pos`);
        if (!res.ok) throw new Error('Failed to load pending POs');

        const json = await res.json();
        // Backend wraps: { success, message, data: { grns: [...] } } or older shapes
        const payload = json && json.data ? json.data : json || {};
        const pos = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.grns)
                ? payload.grns
                : [];

        const tbody = document.getElementById('poTableBody');
        if (!tbody) return;

        if (!pos || pos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pending purchase orders</td></tr>`;
            return;
        }

        tbody.innerHTML = pos.map(po => {
            const expected = po.expected_delivery_date || po.expected_date;
            const itemsCount = po.items ? po.items.length : po.items_count || 0;
            return `
                <tr>
                    <td>${po.po_number || po.po_id || 'N/A'}</td>
                    <td>${po.supplier?.supplier_name || po.supplier_name || 'N/A'}</td>
                    <td>${expected ? formatDate(expected) : 'N/A'}</td>
                    <td>${itemsCount}</td>
                    <td><span class="badge bg-warning">Pending</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="openStatus(${po.po_id || po.id})">
                            <i class="fas fa-search"></i> Status
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        showError('poTableBody', 'Unable to load purchase orders');
    }
}

function openStatus(poId) {
    const input = document.getElementById('poIdInput');
    if (input) {
        input.value = poId || '';
    }
    checkStatus();
}

async function checkStatus() {
    const input = document.getElementById('poIdInput');
    const result = document.getElementById('statusResult');
    if (!input || !result) return;

    const poId = input.value;
    if (!poId) {
        result.textContent = 'Enter a PO ID to check status.';
        return;
    }

    try {
        result.textContent = 'Checking...';
        const res = await fetchWithAuth(`${PO_API_BASE}/reorder/po/${poId}/status`);
        if (!res.ok) throw new Error('Status lookup failed');

        const json = await res.json();
        const status = json.status || json.data?.status || 'Unknown';
        result.textContent = `PO ${poId}: ${status}`;
    } catch (err) {
        console.error(err);
        result.textContent = 'Unable to retrieve status.';
    }
}

