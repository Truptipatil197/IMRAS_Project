/**
 * Item Details Page JavaScript
 */

let currentItemId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();

    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    if (!itemId) {
        await Swal.fire('Error', 'No item ID provided', 'error');
        setTimeout(() => window.location.href = 'inventory.html', 2000);
        return;
    }

    currentItemId = itemId;
    await loadItemDetails(itemId);
    await loadWarehouseStock(itemId);
    await loadStockMovements(itemId);
});

// ===== LOAD ITEM DETAILS =====
async function loadItemDetails(itemId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`);

        if (!response.ok) {
            throw new Error('Failed to fetch item');
        }

        const json = await response.json();
        // Backend wraps: { success, message, data: { item, total_stock, stock_by_warehouse, ... } }
        const payload = json && json.data ? json.data : json || {};
        const item = payload && payload.item ? payload.item : payload;

        if (!item || !item.item_id) {
            throw new Error('Item not found');
        }

        document.getElementById('itemName').textContent = item.item_name || 'Unknown';
        document.getElementById('itemSKU').textContent = item.sku || 'N/A';
        document.getElementById('itemCategory').textContent = item.category ? (item.category.category_name || '-') : '-';
        document.getElementById('itemNameBreadcrumb').textContent = item.item_name || 'Item Details';

        const statusBadge = document.getElementById('itemStatus');
        if (item.is_active) {
            statusBadge.textContent = 'Active';
            statusBadge.className = 'badge bg-success';
        } else {
            statusBadge.textContent = 'Inactive';
            statusBadge.className = 'badge bg-secondary';
        }

        document.getElementById('itemDescription').textContent = item.description || '-';
        document.getElementById('itemPrice').textContent = item.unit_price ? `₹${parseFloat(item.unit_price).toFixed(2)}` : '-';
        document.getElementById('itemUOM').textContent = item.unit_of_measure || '-';
        document.getElementById('itemReorderPoint').textContent = item.reorder_point || 0;
        document.getElementById('itemSafetyStock').textContent = item.safety_stock || 0;
        document.getElementById('itemLeadTime').textContent = `${item.lead_time_days || 0} days`;

    } catch (error) {
        console.error('Error loading item details:', error);
        await Swal.fire('Error', 'Failed to load item details', 'error');
        setTimeout(() => window.location.href = 'inventory.html', 2000);
    }
}

// ===== LOAD WAREHOUSE STOCK =====
async function loadWarehouseStock(itemId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}/stock`);

        if (!response.ok) {
            throw new Error('Failed to fetch stock');
        }

        const json = await response.json();
        // Backend wraps: { success, message, data }
        const payload = json && json.data ? json.data : json || {};
        const stockData = Array.isArray(payload) ? payload : (Array.isArray(payload.stock_by_warehouse) ? payload.stock_by_warehouse : []);

        const container = document.getElementById('warehouseStockList');
        let totalStock = payload.total_stock || 0;

        if (stockData && stockData.length > 0) {
            container.innerHTML = stockData.map(ws => {
                const quantity = ws.quantity || 0;
                const warehouseName = ws.warehouse ? ws.warehouse.warehouse_name : (ws.warehouse_name || 'Unknown Warehouse');

                return `
                    <div class="warehouse-stock-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${warehouseName}</strong>
                                <br><small class="text-muted">Location: ${ws.location_code || 'Multiple locations'}</small>
                            </div>
                            <span class="badge bg-primary fs-6">${quantity} units</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center py-3">No stock available in any warehouse</p>';
        }

        document.getElementById('totalStock').textContent = totalStock;
    } catch (error) {
        console.error('Error loading warehouse stock:', error);
        document.getElementById('warehouseStockList').innerHTML = '<p class="text-muted text-center py-3">Failed to load stock information</p>';
    }
}

// ===== LOAD STOCK MOVEMENTS =====
async function loadStockMovements(itemId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/ledger?item_id=${itemId}&limit=10`);

        if (!response.ok) {
            throw new Error('Failed to fetch movements');
        }

        const json = await response.json();
        // Backend wraps: { success, message, data }
        const payload = json && json.data ? json.data : json || {};
        const movements = Array.isArray(payload) ? payload : (payload.transactions || payload.ledger || []);

        const container = document.getElementById('stockMovements');

        if (movements && movements.length > 0) {
            container.innerHTML = movements.map(movement => {
                const type = movement.transaction_type || 'Unknown';
                const icon = getMovementIcon(type);
                const color = getMovementColor(type);
                const quantity = movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity;
                const className = type.toLowerCase().replace(/\s+/g, '-');

                return `
                    <div class="timeline-item ${className}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <i class="fas ${icon} me-2" style="color: ${color}"></i>
                                <strong>${type}</strong>
                                <span class="badge bg-secondary ms-2">${quantity}</span>
                                <br><small class="text-muted">${formatRelativeTime(movement.transaction_date || movement.createdAt)}</small>
                                ${movement.created_by ? `<br><small class="text-muted">By: ${movement.created_by.full_name || movement.created_by.username || 'System'}</small>` : ''}
                            </div>
                            <div class="text-end">
                                <small class="text-muted">Balance: ${movement.balance_qty || 0}</small>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center py-3">No recent stock movements</p>';
        }
    } catch (error) {
        console.error('Error loading stock movements:', error);
        document.getElementById('stockMovements').innerHTML = '<p class="text-muted text-center py-3">Failed to load stock movements</p>';
    }
}

// ===== HELPER FUNCTIONS =====
function getMovementIcon(type) {
    const icons = {
        'GRN': 'fa-clipboard-check',
        'Transfer': 'fa-exchange-alt',
        'Issue': 'fa-arrow-up',
        'Adjustment': 'fa-sliders-h',
        'Stock Count': 'fa-tasks'
    };
    return icons[type] || 'fa-circle';
}

function getMovementColor(type) {
    const colors = {
        'GRN': '#28a745',
        'Transfer': '#17a2b8',
        'Issue': '#ffc107',
        'Adjustment': '#6f42c1',
        'Stock Count': '#007bff'
    };
    return colors[type] || '#6c757d';
}

async function createPRForThisItem() {
    if (!currentItemId) return;

    const { value: qty } = await Swal.fire({
        title: 'Create Purchase Requisition',
        text: 'Enter the quantity requested:',
        input: 'number',
        inputAttributes: {
            min: 1,
            step: 1
        },
        inputValue: 1,
        showCancelButton: true,
        confirmButtonText: 'Create PR',
        inputValidator: (value) => {
            if (!value || value <= 0) {
                return 'Please enter a valid quantity';
            }
        }
    });

    if (qty) {
        try {
            const payload = {
                pr_date: new Date().toISOString().split('T')[0],
                remarks: 'Manual requisition from item details',
                items: [{
                    item_id: parseInt(currentItemId),
                    requested_qty: parseInt(qty),
                    justification: 'Requested by user from inventory details'
                }]
            };

            const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/pr`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resData = await response.json();
                await Swal.fire('Success', `Purchase Requisition created successfully`, 'success');
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Failed to create PR');
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

// Make functions globally available
window.editItem = editItem;
window.deleteItem = deleteItem;
window.createPRForThisItem = createPRForThisItem;

// ===== EDIT/DELETE FUNCTIONS =====
function editItem() {
    if (currentItemId) {
        window.location.href = `item-form.html?id=${currentItemId}`;
    }
}

async function deleteItem() {
    if (!currentItemId) return;

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
            const response = await fetchWithAuth(
                `${CONFIG.API_BASE_URL}/api/inventory/items/${currentItemId}`,
                { method: 'DELETE' }
            );

            if (response.ok) {
                await Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                window.location.href = 'inventory.html';
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Delete failed');
            }
        } catch (error) {
            await Swal.fire('Error', error.message || 'Failed to delete item', 'error');
        }
    }
}

