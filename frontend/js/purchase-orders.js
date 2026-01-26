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

        const res = await fetchWithAuth(`${PO_API_BASE}/reorder/po`);
        if (!res.ok) throw new Error('Failed to load purchase orders');

        const json = await res.json();
        // Backend now returns: { success, message, data: { purchase_orders: [...] } }
        const pos = json && json.data && json.data.purchase_orders ? json.data.purchase_orders : [];

        const tbody = document.getElementById('poTableBody');
        if (!tbody) return;

        if (!pos || pos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pending purchase orders</td></tr>`;
            return;
        }

        tbody.innerHTML = pos.map(po => {
            const expected = po.expected_delivery_date || po.expected_date;
            const itemsCount = po.items ? po.items.length : po.items_count || 0;
            const status = (po.status || 'Pending').toString();
            const badgeClass =
                status === 'Issued' ? 'bg-primary' :
                    status === 'In-Transit' ? 'bg-info' :
                        status === 'Completed' ? 'bg-success' :
                            status === 'Cancelled' ? 'bg-danger' :
                                'bg-warning';

            return `
                <tr>
                    <td>${po.po_number || po.po_id || 'N/A'}</td>
                    <td>${po.supplier?.supplier_name || po.supplier_name || 'N/A'}</td>
                    <td>${expected ? formatDate(expected) : 'N/A'}</td>
                    <td>${itemsCount}</td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
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

