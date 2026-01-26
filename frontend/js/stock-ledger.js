/**
 * Stock Ledger Page JavaScript
 */

// ===== GLOBAL VARIABLES =====
let ledgerTable;

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadFilterOptions();
    initializeLedgerTable();
    setupEventListeners();
});

// ===== LOAD FILTER OPTIONS =====
async function loadFilterOptions() {
    try {
        // Load items
        const itemsRes = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items?limit=1000`);
        const itemsData = await itemsRes.json();
        const itemsPayload = (itemsData && itemsData.data) ? itemsData.data : itemsData || {};
        const items = Array.isArray(itemsPayload.items) ? itemsPayload.items : (Array.isArray(itemsPayload) ? itemsPayload : []);

        const itemSelect = document.getElementById('filterItem');
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.item_id;
            option.textContent = `${item.item_name} (${item.sku || 'N/A'})`;
            itemSelect.appendChild(option);
        });

        // Load warehouses
        const whRes = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/warehouses`);
        const whData = await whRes.json();
        const warehouses = (whData && whData.data) ? (Array.isArray(whData.data) ? whData.data : []) : [];

        const whSelect = document.getElementById('filterWarehouse');
        warehouses.forEach(wh => {
            const option = document.createElement('option');
            option.value = wh.warehouse_id;
            option.textContent = wh.warehouse_name;
            whSelect.appendChild(option);
        });

        // Initialize Select2 for item filter
        $('#filterItem').select2({
            placeholder: 'All Items',
            allowClear: true,
            width: '100%'
        });
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// ===== INITIALIZE LEDGER TABLE =====
function initializeLedgerTable() {
    ledgerTable = $('#ledgerTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: `${CONFIG.API_BASE_URL}/api/stock/ledger`,
            type: 'GET',
            beforeSend: function (xhr) {
                const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            },
            dataSrc: function (json) {
                console.log('Ledger API Response:', json); // Debug
                const data = (json && json.data) ? json.data : json || {};
                return Array.isArray(data.transactions) ? data.transactions : [];
            },
            error: function (xhr, error, thrown) {
                console.error('DataTable AJAX error:', error);
                Swal.fire('Error', 'Failed to load stock ledger', 'error');
            }
        },
        columns: [
            {
                data: 'transaction_date',
                render: (data) => data ? formatDateTime(data) : '-'
            },
            {
                data: 'item',
                render: (data) => data ? `${data.item_name} (${data.sku || 'N/A'})` : '-'
            },
            {
                data: 'warehouse',
                render: (data) => data ? data.warehouse_name : '-'
            },
            {
                data: 'location',
                render: (data) => data ? data.location_code : '-'
            },
            {
                data: 'transaction_type',
                render: (data) => {
                    const type = data || 'Unknown';
                    const typeClass = `ledger-type-${type.toLowerCase()}`;
                    return `<span class="${typeClass}">${type}</span>`;
                }
            },
            {
                data: 'quantity',
                render: (data) => {
                    const qty = parseFloat(data || 0);
                    const qtyClass = qty > 0 ? 'stock-up-tick' : 'stock-down-tick';
                    const sign = qty > 0 ? '+' : (qty < 0 ? '-' : '');
                    // Force absolute value to prevent double signs from backend or CSS
                    return `<span class="${qtyClass}">${sign}${Math.abs(qty)}</span>`;
                }
            },
            {
                data: 'balance_qty',
                render: (data) => {
                    const balance = parseFloat(data || 0);
                    let balanceClass = '';
                    if (balance === 0) balanceClass = 'balance-critical';
                    else if (balance < 10) balanceClass = 'balance-low';
                    return `<span class="balance-column ${balanceClass}">${balance}</span>`;
                }
            },
            {
                data: 'reference_type',
                render: (data) => data || '-'
            },
            {
                data: 'created_by',
                render: (data) => data ? (data.full_name || data.username || 'System') : 'System'
            },
            {
                data: null,
                orderable: false,
                render: (data, type, row) => `
                    <button class="btn btn-sm btn-info" onclick="viewTransactionDetails(${row.ledger_id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `
            }
        ],
        pageLength: 50,
        order: [[0, 'desc']],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Excel',
                className: 'btn btn-success btn-sm',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            },
            {
                extend: 'csv',
                text: '<i class="fas fa-file-csv"></i> CSV',
                className: 'btn btn-info btn-sm',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            }
        ]
    });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('exportLedger')?.addEventListener('click', exportLedger);
}

// ===== APPLY FILTERS =====
function applyFilters() {
    const itemId = document.getElementById('filterItem').value;
    const warehouseId = document.getElementById('filterWarehouse').value;
    const transactionType = document.getElementById('filterTransactionType').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    let url = `${CONFIG.API_BASE_URL}/api/stock/ledger?`;
    if (itemId) url += `item_id=${itemId}&`;
    if (warehouseId) url += `warehouse_id=${warehouseId}&`;
    if (transactionType) url += `transaction_type=${transactionType}&`;
    if (dateFrom) url += `start_date=${dateFrom}&`;
    if (dateTo) url += `end_date=${dateTo}&`;

    ledgerTable.ajax.url(url).load();
}

// ===== RESET FILTERS =====
function resetFilters() {
    document.getElementById('filterItem').value = '';
    $('#filterItem').val(null).trigger('change');
    document.getElementById('filterWarehouse').value = '';
    document.getElementById('filterTransactionType').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    ledgerTable.ajax.url(`${CONFIG.API_BASE_URL}/api/stock/ledger`).load();
}

// ===== EXPORT LEDGER =====
function exportLedger() {
    if (ledgerTable) {
        ledgerTable.button('.buttons-excel').trigger();
    }
}

// ===== VIEW TRANSACTION DETAILS =====
async function viewTransactionDetails(ledgerId) {
    try {
        // Fetch transaction details from ledger
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/ledger?limit=1000`);
        const data = await response.json();
        const payload = (data && data.data) ? data.data : data || {};
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

        const transaction = transactions.find(t => t.ledger_id == ledgerId);

        if (!transaction) {
            Swal.fire('Error', 'Transaction not found', 'error');
            return;
        }

        const modalBody = document.getElementById('transactionDetails');
        modalBody.innerHTML = `
            <div class="transaction-timeline">
                <div class="timeline-item">
                    <h6>Transaction Information</h6>
                    <table class="table table-sm">
                        <tr>
                            <th width="30%">Transaction ID:</th>
                            <td>${transaction.ledger_id}</td>
                        </tr>
                        <tr>
                            <th>Date & Time:</th>
                            <td>${formatDateTime(transaction.transaction_date || transaction.createdAt)}</td>
                        </tr>
                        <tr>
                            <th>Transaction Type:</th>
                            <td><span class="ledger-type-${(transaction.transaction_type || '').toLowerCase()}">${transaction.transaction_type || 'Unknown'}</span></td>
                        </tr>
                        <tr>
                            <th>Item:</th>
                            <td>${transaction.item?.item_name || 'Unknown'} (${transaction.item?.sku || 'N/A'})</td>
                        </tr>
                        <tr>
                            <th>Warehouse:</th>
                            <td>${transaction.warehouse?.warehouse_name || '-'}</td>
                        </tr>
                        <tr>
                            <th>Location:</th>
                            <td>${transaction.location?.location_code || '-'}</td>
                        </tr>
                        <tr>
                            <th>Quantity:</th>
                            <td><span class="${transaction.quantity > 0 ? 'qty-increase' : 'qty-decrease'}">${transaction.quantity > 0 ? '+' : ''}${transaction.quantity || 0}</span></td>
                        </tr>
                        <tr>
                            <th>Balance After:</th>
                            <td><strong>${transaction.balance_qty || 0}</strong></td>
                        </tr>
                        <tr>
                            <th>Reference:</th>
                            <td>${transaction.reference_type || '-'}</td>
                        </tr>
                        <tr>
                            <th>Performed By:</th>
                            <td>${transaction.created_by?.full_name || transaction.created_by?.username || 'System'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading transaction details:', error);
        Swal.fire('Error', 'Failed to load transaction details', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

