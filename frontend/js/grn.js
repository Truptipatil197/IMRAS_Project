/**
 * GRN Management Page JavaScript
 */

// ===== GLOBAL VARIABLES =====
let grnTable;

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadPendingPOs();
    initializeGRNTable();
    setupEventListeners();
});

// ===== LOAD PENDING PURCHASE ORDERS =====
async function loadPendingPOs() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/pending-pos`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch pending POs');
        }
        
        const data = await response.json();
        console.log('Pending POs API Response:', data); // Debug
        
        const container = document.getElementById('pendingPOsList');
        const badge = document.getElementById('pendingCount');
        
        // Backend returns: { success: true, message: "...", data: [...] }
        const pendingPOs = (data && data.data) ? data.data : [];
        badge.textContent = pendingPOs.length || 0;
        
        if (pendingPOs.length > 0) {
            container.innerHTML = pendingPOs.map(po => {
                const isOverdue = po.expected_delivery_date && new Date(po.expected_delivery_date) < new Date();
                const overdueClass = isOverdue ? 'overdue' : '';
                
                // Calculate total amount
                const totalAmount = po.items ? po.items.reduce((sum, item) => sum + (item.unit_price * item.ordered_qty), 0) : 0;
                
                return `
                    <div class="card pending-po-card ${overdueClass}">
                        <div class="po-info">
                            <div class="po-details">
                                <h5>${po.po_number || 'N/A'}</h5>
                                <div class="po-meta">
                                    <span><i class="fas fa-truck"></i> ${po.supplier?.supplier_name || 'Unknown Supplier'}</span>
                                    <span class="badge bg-info">${po.items?.length || 0} items</span>
                                    <span class="badge bg-secondary">₹${formatCurrency(totalAmount)}</span>
                                </div>
                                <small class="text-muted">
                                    Expected: ${po.expected_delivery_date ? formatDate(po.expected_delivery_date) : 'N/A'}
                                    ${isOverdue ? '<span class="text-danger ms-2">⚠ Overdue</span>' : ''}
                                </small>
                            </div>
                            <div>
                                <button class="btn btn-primary" onclick="createGRNForPO(${po.po_id})">
                                    <i class="fas fa-clipboard-check"></i> Create GRN
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-check-circle fa-3x mb-3"></i>
                    <p>No pending purchase orders. All POs have been received!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading pending POs:', error);
        Swal.fire('Error', 'Failed to load pending purchase orders', 'error');
    }
}

// ===== CREATE GRN FOR PO =====
function createGRNForPO(poId) {
    window.location.href = `grn-form.html?po_id=${poId}`;
}

// ===== INITIALIZE GRN TABLE =====
function initializeGRNTable() {
    grnTable = $('#grnTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: `${CONFIG.API_BASE_URL}/api/grn`,
            type: 'GET',
            beforeSend: function(xhr) {
                const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            },
            dataSrc: function(json) {
                console.log('GRN Table API Response:', json); // Debug
                // Backend returns: { success: true, message: "...", data: { grns: [...], pagination: {...} } }
                const data = (json && json.data) ? json.data : json || {};
                return Array.isArray(data.grns) ? data.grns : [];
            },
            error: function(xhr, error, thrown) {
                console.error('DataTable AJAX error:', error);
                Swal.fire('Error', 'Failed to load GRN history', 'error');
            }
        },
        columns: [
            { data: 'grn_number' },
            { data: 'po_number' },
            { data: 'supplier_name' },
            { 
                data: 'grn_date',
                render: (data) => data ? formatDate(data) : '-'
            },
            { data: 'item_count' },
            {
                data: 'status',
                render: (data) => {
                    const statusClass = data === 'Completed' ? 'status-completed' : 'status-draft';
                    return `<span class="badge ${statusClass}">${data || 'Draft'}</span>`;
                }
            },
            { data: 'received_by' },
            {
                data: null,
                orderable: false,
                render: (data, type, row) => `
                    <button class="btn btn-sm btn-info" onclick="viewGRN(${row.grn_id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${row.status === 'Draft' ? `
                        <button class="btn btn-sm btn-primary" onclick="editGRN(${row.grn_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                `
            }
        ],
        pageLength: 20,
        order: [[3, 'desc']]
    });
}

// ===== NAVIGATION FUNCTIONS =====
function viewGRN(grnId) {
    window.location.href = `grn-details.html?id=${grnId}`;
}

function editGRN(grnId) {
    window.location.href = `grn-form.html?id=${grnId}`;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('filterStatus')?.addEventListener('change', applyFilters);
    document.getElementById('filterDateFrom')?.addEventListener('change', applyFilters);
    document.getElementById('filterDateTo')?.addEventListener('change', applyFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
}

function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    
    let url = `${CONFIG.API_BASE_URL}/api/grn?`;
    if (status) url += `status=${status}&`;
    if (dateFrom) url += `start_date=${dateFrom}&`;
    if (dateTo) url += `end_date=${dateTo}&`;
    
    grnTable.ajax.url(url).load();
}

function resetFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    grnTable.ajax.url(`${CONFIG.API_BASE_URL}/api/grn`).load();
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0.00';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

