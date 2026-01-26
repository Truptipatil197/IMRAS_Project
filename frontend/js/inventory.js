/**
 * Inventory Management Page JavaScript
 */

// ===== GLOBAL VARIABLES =====
let itemsTable;
let selectedItems = [];

// ===== INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadCategories();
    await loadStatsCards();
    initializeDataTable();
    setupEventListeners();
});

// ===== LOAD STATS CARDS =====
async function loadStatsCards() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items?limit=1000`);

        if (!response.ok) {
            throw new Error('Failed to fetch items');
        }

        const json = await response.json();
        // Backend wraps: { success, message, data: { items, total, ... } }
        const payload = json && json.data ? json.data : json || {};
        const items = Array.isArray(payload) ? payload : (Array.isArray(payload.items) ? payload.items : []);

        let totalItems = items.length;
        let activeItems = items.filter(item => item.is_active).length;
        let lowStockItems = 0;
        let outOfStock = 0;

        // Calculate stock levels (would need stock data from API)
        items.forEach(item => {
            const stock = item.current_stock || 0;
            const reorderPoint = item.reorder_point || 0;

            if (stock === 0) {
                outOfStock++;
            } else if (stock <= reorderPoint) {
                lowStockItems++;
            }
        });

        document.getElementById('totalItems').textContent = formatNumber(totalItems);
        document.getElementById('activeItems').textContent = formatNumber(activeItems);
        document.getElementById('lowStockItems').textContent = formatNumber(lowStockItems);
        document.getElementById('outOfStock').textContent = formatNumber(outOfStock);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===== LOAD CATEGORIES FOR FILTER =====
async function loadCategories() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/categories`);

        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const json = await response.json();
        // Backend wraps: { success, message, data }
        const payload = json && json.data ? json.data : json || {};
        const categories = Array.isArray(payload) ? payload : (Array.isArray(payload.categories) ? payload.categories : []);

        const select = document.getElementById('filterCategory');
        select.innerHTML = '<option value="">All Categories</option>';

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_id;
            option.textContent = cat.category_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ===== INITIALIZE DATATABLE =====
function initializeDataTable() {
    itemsTable = $('#itemsTable').DataTable({
        processing: true,
        serverSide: false,
        ajax: {
            url: `${CONFIG.API_BASE_URL}/api/inventory/items`,
            type: 'GET',
            beforeSend: function (xhr) {
                const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
            },
            dataSrc: function (json) {
                const data = (json && json.data) || json || {};
                const items = data.items || data;
                const normalized = Array.isArray(items) ? items : [];
                console.log('Items DataTable payload:', data); // Debug payload to verify shape
                return normalized;
            },
            error: function (xhr, error, thrown) {
                console.error('DataTable AJAX error:', error);
                Swal.fire('Error', 'Failed to load items', 'error');
            }
        },
        columns: [
            {
                data: null,
                orderable: false,
                width: '30px',
                render: function (data, type, row) {
                    return `<input type="checkbox" class="item-checkbox" value="${row.item_id}">`;
                }
            },
            {
                data: 'sku',
                render: function (data) {
                    return data || '-';
                }
            },
            {
                data: 'item_name',
                render: function (data) {
                    return data || '-';
                }
            },
            {
                data: 'category',
                render: function (data) {
                    return data ? (data.category_name || '-') : '-';
                }
            },
            {
                data: 'unit_price',
                render: function (data) {
                    return data ? `₹${parseFloat(data).toFixed(2)}` : '-';
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    const stock = parseFloat(row.current_stock ?? row.stock ?? row.total_stock ?? 0);
                    const reorder = parseFloat(row.reorder_point || 0);
                    let badgeClass = 'stock-good';

                    if (stock === 0) badgeClass = 'stock-out';
                    else if (stock <= reorder) badgeClass = 'stock-low';

                    return `<span class="badge ${badgeClass}">${stock}</span>`;
                }
            },
            {
                data: 'reorder_point',
                render: function (data) {
                    return data || 0;
                }
            },
            {
                data: 'is_active',
                render: function (data) {
                    return data ?
                        '<span class="badge status-active">Active</span>' :
                        '<span class="badge status-inactive">Inactive</span>';
                }
            },
            {
                data: null,
                orderable: false,
                width: '120px',
                render: function (data, type, row) {
                    return `
                        <button class="action-btn view" onclick="viewItem(${row.item_id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editItem(${row.item_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteItem(${row.item_id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        pageLength: 20,
        order: [[2, 'asc']],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Excel',
                className: 'btn btn-success btn-sm',
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7] // Exclude checkbox and actions
                }
            },
            {
                extend: 'csv',
                text: '<i class="fas fa-file-csv"></i> CSV',
                className: 'btn btn-info btn-sm',
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7]
                }
            }
        ],
        language: {
            search: "Search items:",
            lengthMenu: "Show _MENU_ items per page",
            info: "Showing _START_ to _END_ of _TOTAL_ items",
            infoEmpty: "No items found",
            zeroRecords: "No matching items found",
            processing: '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>'
        },
        responsive: true,
        drawCallback: function () {
            // Update checkboxes after table redraw
            updateSelectedItems();
        }
    });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Select All Checkbox
    document.getElementById('selectAll').addEventListener('change', function () {
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = this.checked;
        });
        updateSelectedItems();
    });

    // Item Checkboxes (delegated event)
    $(document).on('change', '.item-checkbox', updateSelectedItems);

    // Filter Changes
    document.getElementById('filterCategory').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterStock').addEventListener('change', applyFilters);

    // Reset Filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Export Button
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
}

// ===== UPDATE SELECTED ITEMS =====
function updateSelectedItems() {
    selectedItems = [];
    document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
        selectedItems.push(parseInt(cb.value));
    });

    const bulkBar = document.getElementById('bulkActionsBar');
    const countSpan = document.getElementById('selectedCount');

    if (selectedItems.length > 0) {
        bulkBar.style.display = 'block';
        countSpan.textContent = `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} selected`;
        document.getElementById('selectAll').checked = selectedItems.length === document.querySelectorAll('.item-checkbox').length;
    } else {
        bulkBar.style.display = 'none';
        document.getElementById('selectAll').checked = false;
    }
}

// ===== APPLY FILTERS =====
function applyFilters() {
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const stock = document.getElementById('filterStock').value;

    let apiUrl = `${CONFIG.API_BASE_URL}/api/inventory/items?`;

    if (category) apiUrl += `category_id=${category}&`;
    if (status !== '') apiUrl += `is_active=${status}&`;

    // Note: Stock level filter would need to be handled client-side or via API
    // For now, reload table and filter client-side if needed

    itemsTable.ajax.url(apiUrl).load();
}

// ===== RESET FILTERS =====
function resetFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterStock').value = '';
    itemsTable.ajax.url(`${CONFIG.API_BASE_URL}/api/inventory/items`).load();
}

// ===== VIEW ITEM =====
function viewItem(itemId) {
    window.location.href = `item-details.html?id=${itemId}`;
}

// ===== EDIT ITEM =====
function editItem(itemId) {
    window.location.href = `item-form.html?id=${itemId}`;
}

// ===== DELETE ITEM =====
async function deleteItem(itemId) {
    const result = await Swal.fire({
        title: 'Delete Item?',
        text: 'This will soft-delete the item. You can reactivate it later.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                itemsTable.ajax.reload();
                loadStatsCards();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Delete failed');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'Failed to delete item', 'error');
        }
    }
}

// ===== BULK OPERATIONS =====
async function bulkActivate() {
    if (selectedItems.length === 0) return;

    try {
        // Activate items individually since bulk endpoint is not available
        for (const itemId of selectedItems) {
            await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: true })
            });
        }

        await Swal.fire('Success', `${selectedItems.length} item(s) activated`, 'success');
        itemsTable.ajax.reload();
        clearSelection();
        loadStatsCards();
    } catch (error) {
        Swal.fire('Error', 'Bulk activation failed. Please try individual updates.', 'error');
    }
}

async function bulkDeactivate() {
    if (selectedItems.length === 0) return;

    const result = await Swal.fire({
        title: `Deactivate ${selectedItems.length} items?`,
        text: 'These items will be marked as inactive.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, deactivate'
    });

    if (result.isConfirmed) {
        try {
            // Update each item individually (bulk endpoint may not exist)
            for (const itemId of selectedItems) {
                await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ is_active: false })
                });
            }

            await Swal.fire('Success', `${selectedItems.length} item(s) deactivated`, 'success');
            itemsTable.ajax.reload();
            clearSelection();
            loadStatsCards();
        } catch (error) {
            Swal.fire('Error', 'Bulk deactivation failed', 'error');
        }
    }
}

async function bulkDelete() {
    if (selectedItems.length === 0) return;

    const result = await Swal.fire({
        title: `Delete ${selectedItems.length} items?`,
        text: 'This will soft-delete the selected items.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete them'
    });

    if (result.isConfirmed) {
        try {
            // Delete each item individually
            for (const itemId of selectedItems) {
                await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`, {
                    method: 'DELETE'
                });
            }

            await Swal.fire('Deleted!', `${selectedItems.length} item(s) deleted`, 'success');
            itemsTable.ajax.reload();
            clearSelection();
            loadStatsCards();
        } catch (error) {
            Swal.fire('Error', 'Bulk delete failed', 'error');
        }
    }
}

function clearSelection() {
    selectedItems = [];
    document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAll').checked = false;
    document.getElementById('bulkActionsBar').style.display = 'none';
}

// ===== EXPORT TO EXCEL =====
function exportToExcel() {
    // Use DataTables buttons extension
    if (itemsTable) {
        itemsTable.button('.buttons-excel').trigger();
    } else {
        Swal.fire('Info', 'Export functionality will be available after table loads', 'info');
    }
}

// Make functions globally available
window.viewItem = viewItem;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.bulkActivate = bulkActivate;
window.bulkDeactivate = bulkDeactivate;
window.bulkDelete = bulkDelete;
window.clearSelection = clearSelection;
window.exportToExcel = exportToExcel;

