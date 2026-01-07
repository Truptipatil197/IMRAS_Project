/**
 * Stock Movement Page JavaScript
 */

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadWarehouses();
    await loadItems();
    await loadRecentMovements();
    
    // Initialize Select2 for searchable dropdowns
    $('.select2').select2({
        placeholder: 'Search and select item...',
        allowClear: true,
        width: '100%'
    });
    
    setupEventListeners();
});

// ===== LOAD ITEMS =====
async function loadItems() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items?limit=1000`);
        const data = await response.json();
        
        const payload = (data && data.data) ? data.data : data || {};
        const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload) ? payload : []);
        
        const selects = ['#transferItem', '#issueItem', '#adjustItem'];
        selects.forEach(selector => {
            const select = document.querySelector(selector);
            if (select) {
                items.forEach(item => {
                    if (item.is_active) {
                        const option = document.createElement('option');
                        option.value = item.item_id;
                        option.textContent = `${item.item_name} (${item.sku || 'N/A'})`;
                        option.setAttribute('data-sku', item.sku || '');
                        select.appendChild(option);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// ===== LOAD WAREHOUSES =====
async function loadWarehouses() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/warehouses`);
        const data = await response.json();
        
        const payload = (data && data.data) ? data.data : data || {};
        const warehouses = Array.isArray(payload) ? payload : [];
        
        const selects = [
            '#fromWarehouse', '#toWarehouse', 
            '#issueWarehouse', '#adjustWarehouse'
        ];
        
        selects.forEach(selector => {
            const select = document.querySelector(selector);
            if (select) {
                warehouses.forEach(wh => {
                    if (wh.is_active !== false) {
                        const option = document.createElement('option');
                        option.value = wh.warehouse_id;
                        option.textContent = wh.warehouse_name;
                        select.appendChild(option);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error loading warehouses:', error);
    }
}

// ===== LOAD LOCATIONS =====
async function loadLocations(warehouseId, selectId) {
    if (!warehouseId) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select location</option>';
        }
        return;
    }
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/locations/warehouse/${warehouseId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch locations');
        }
        
        const data = await response.json();
        const payload = (data && data.data) ? data.data : data || {};
        const locations = Array.isArray(payload) ? payload : (Array.isArray(payload.locations) ? payload.locations : []);
        
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select location</option>';
            
            if (locations.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No locations available';
                option.disabled = true;
                select.appendChild(option);
                if (window.Notify) {
                    window.Notify.warning('No locations found in this warehouse. Please create locations first.');
                }
            } else {
                locations.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc.location_id;
                    // Use location_code or format as aisle-rack-bin
                    const locationText = loc.location_code || 
                                       (loc.aisle && loc.rack && loc.bin ? `${loc.aisle}-${loc.rack}-${loc.bin}` : 
                                       `Location ${loc.location_id}`);
                    option.textContent = locationText;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error loading locations</option>';
        }
        if (window.Notify) {
            window.Notify.error('Failed to load locations');
        }
    }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Transfer Form
    document.getElementById('transferItem')?.addEventListener('change', handleTransferItemChange);
    document.getElementById('fromWarehouse')?.addEventListener('change', async function() {
        await loadLocations(this.value, 'fromLocation');
        handleTransferItemChange();
    });
    document.getElementById('toWarehouse')?.addEventListener('change', async function() {
        await loadLocations(this.value, 'toLocation');
    });
    document.getElementById('transferForm')?.addEventListener('submit', handleTransferSubmit);
    
    // Issue Form
    document.getElementById('issueItem')?.addEventListener('change', handleIssueItemChange);
    document.getElementById('issueWarehouse')?.addEventListener('change', handleIssueItemChange);
    document.getElementById('issueForm')?.addEventListener('submit', handleIssueSubmit);
    
    // Adjustment Form
    document.getElementById('adjustItem')?.addEventListener('change', handleAdjustItemChange);
    document.getElementById('adjustWarehouse')?.addEventListener('change', handleAdjustItemChange);
    document.getElementById('adjustmentForm')?.addEventListener('submit', handleAdjustmentSubmit);
    
    // Real-time quantity validation
    document.getElementById('transferQty')?.addEventListener('input', validateTransferQty);
    document.getElementById('issueQty')?.addEventListener('input', validateIssueQty);
}

// ===== TRANSFER STOCK =====
async function handleTransferItemChange() {
    const itemId = document.getElementById('transferItem').value;
    const warehouseId = document.getElementById('fromWarehouse').value;
    
    if (itemId && warehouseId) {
        await loadCurrentStock(itemId, warehouseId, 'transfer');
    }
}

async function loadCurrentStock(itemId, warehouseId, context) {
    try {
        const response = await fetchWithAuth(
            `${CONFIG.API_BASE_URL}/api/stock/item/${itemId}?warehouse_id=${warehouseId}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to load stock');
        }
        
        const data = await response.json();
        const payload = (data && data.data) ? data.data : data || {};
        
        if (context === 'transfer') {
            const stockInfo = payload.stock_by_warehouse?.find(s => s.warehouse_id == warehouseId) || {};
            document.getElementById('currentWarehouse').textContent = stockInfo.warehouse_name || '-';
            document.getElementById('currentLocation').textContent = stockInfo.location_code || 'Multiple';
            const availableQty = stockInfo.current_stock || 0;
            document.getElementById('availableQty').textContent = availableQty;
            document.getElementById('maxTransferQty').textContent = availableQty;
            document.getElementById('currentStockInfo').classList.remove('d-none');
        } else if (context === 'issue') {
            const stockInfo = payload.stock_by_warehouse?.find(s => s.warehouse_id == warehouseId) || {};
            document.getElementById('issueAvailableQty').textContent = stockInfo.current_stock || 0;
        } else if (context === 'adjust') {
            const stockInfo = payload.stock_by_warehouse?.find(s => s.warehouse_id == warehouseId) || {};
            document.getElementById('adjustCurrentStock').textContent = stockInfo.current_stock || 0;
        }
        
        return payload.current_stock || 0;
    } catch (error) {
        console.error('Error loading stock:', error);
        return 0;
    }
}

function validateTransferQty() {
    const qty = parseInt(this.value) || 0;
    const max = parseInt(document.getElementById('maxTransferQty').textContent) || 0;
    
    if (qty > max) {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (qty > 0) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
    }
}

async function handleTransferSubmit(e) {
    e.preventDefault();
    
    const fromWarehouseId = parseInt(document.getElementById('fromWarehouse').value);
    const toWarehouseId = parseInt(document.getElementById('toWarehouse').value);
    const fromLocationId = document.getElementById('fromLocation').value ? parseInt(document.getElementById('fromLocation').value) : null;
    const toLocationId = document.getElementById('toLocation').value ? parseInt(document.getElementById('toLocation').value) : null;
    
    // Determine if it's a location transfer or warehouse transfer
    const isLocationTransfer = fromWarehouseId === toWarehouseId && fromLocationId && toLocationId;
    
    const formData = {
        item_id: parseInt(document.getElementById('transferItem').value),
        quantity: parseInt(document.getElementById('transferQty').value),
        remarks: document.getElementById('transferReason').value
    };
    
    if (isLocationTransfer) {
        // Location-to-location transfer
        formData.from_location_id = fromLocationId;
        formData.to_location_id = toLocationId;
    } else {
        // Warehouse-to-warehouse transfer
        formData.from_warehouse_id = fromWarehouseId;
        formData.to_warehouse_id = toWarehouseId;
        if (fromLocationId) formData.from_location_id = fromLocationId;
        if (toLocationId) formData.to_location_id = toLocationId;
    }
    
    try {
        const endpoint = isLocationTransfer ? '/api/stock/transfer/location' : '/api/stock/transfer/warehouse';
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            await Swal.fire('Success', 'Stock transferred successfully', 'success');
            document.getElementById('transferForm').reset();
            $('#transferItem').val(null).trigger('change');
            document.getElementById('currentStockInfo').classList.add('d-none');
            await loadRecentMovements();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Transfer failed');
        }
    } catch (error) {
        console.error('Transfer error:', error);
        Swal.fire('Error', error.message || 'Failed to transfer stock', 'error');
    }
}

// ===== ISSUE STOCK =====
async function handleIssueItemChange() {
    const itemId = document.getElementById('issueItem').value;
    const warehouseId = document.getElementById('issueWarehouse').value;
    
    if (itemId && warehouseId) {
        await loadCurrentStock(itemId, warehouseId, 'issue');
    }
}

function validateIssueQty() {
    const qty = parseInt(this.value) || 0;
    const available = parseInt(document.getElementById('issueAvailableQty').textContent) || 0;
    
    if (qty > available) {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (qty > 0) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
    }
}

async function handleIssueSubmit(e) {
    e.preventDefault();
    
    const formData = {
        warehouse_id: parseInt(document.getElementById('issueWarehouse').value),
        items: [{
            item_id: parseInt(document.getElementById('issueItem').value),
            quantity: parseInt(document.getElementById('issueQty').value)
        }],
        order_reference: document.getElementById('issueReference').value,
        remarks: document.getElementById('issueReason').value
    };
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/issue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            await Swal.fire('Success', 'Stock issued successfully (FEFO applied)', 'success');
            document.getElementById('issueForm').reset();
            $('#issueItem').val(null).trigger('change');
            await loadRecentMovements();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Issue failed');
        }
    } catch (error) {
        console.error('Issue error:', error);
        Swal.fire('Error', error.message || 'Failed to issue stock', 'error');
    }
}

// ===== STOCK ADJUSTMENT =====
async function handleAdjustItemChange() {
    const itemId = document.getElementById('adjustItem').value;
    const warehouseId = document.getElementById('adjustWarehouse').value;
    
    if (itemId && warehouseId) {
        await loadCurrentStock(itemId, warehouseId, 'adjust');
    }
}

async function handleAdjustmentSubmit(e) {
    e.preventDefault();
    
    const formData = {
        item_id: parseInt(document.getElementById('adjustItem').value),
        warehouse_id: parseInt(document.getElementById('adjustWarehouse').value),
        adjustment_type: document.getElementById('adjustmentType').value,
        quantity: parseInt(document.getElementById('adjustQty').value),
        reason: document.getElementById('adjustReasonSelect').value + (document.getElementById('adjustNotes').value ? ': ' + document.getElementById('adjustNotes').value : ''),
        remarks: document.getElementById('adjustNotes').value || null
    };
    
    // Confirmation dialog
    const result = await Swal.fire({
        title: 'Confirm Stock Adjustment',
        html: `
            <p><strong>Item:</strong> ${document.querySelector('#adjustItem option:checked')?.textContent || 'Unknown'}</p>
            <p><strong>Type:</strong> ${formData.adjustment_type}</p>
            <p><strong>Quantity:</strong> ${formData.quantity}</p>
            <p><strong>Reason:</strong> ${formData.reason}</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Yes, adjust stock'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/adjust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                await Swal.fire('Success', 'Stock adjusted successfully', 'success');
                document.getElementById('adjustmentForm').reset();
                $('#adjustItem').val(null).trigger('change');
                await loadRecentMovements();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Adjustment failed');
            }
        } catch (error) {
            console.error('Adjustment error:', error);
            Swal.fire('Error', error.message || 'Failed to adjust stock', 'error');
        }
    }
}

// ===== LOAD RECENT MOVEMENTS =====
async function loadRecentMovements() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/stock/ledger?limit=20`);
        const data = await response.json();
        
        const payload = (data && data.data) ? data.data : data || {};
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
        
        const tbody = document.getElementById('recentMovementsBody');
        if (!tbody) return;
        
        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No recent movements</td></tr>';
            return;
        }
        
        tbody.innerHTML = transactions.map(m => {
            const qtyClass = m.quantity > 0 ? 'movement-qty-positive' : 'movement-qty-negative';
            const transactionType = m.transaction_type || 'Unknown';
            const transactionClass = `transaction-badge ${transactionType.toLowerCase()}`;
            
            return `
                <tr>
                    <td>${formatDateTime(m.transaction_date || m.createdAt)}</td>
                    <td>${m.item?.item_name || 'Unknown'}</td>
                    <td><span class="${transactionClass}">${transactionType}</span></td>
                    <td>${m.location?.location_code || m.warehouse?.warehouse_name || '-'}</td>
                    <td>-</td>
                    <td class="${qtyClass}">${m.quantity > 0 ? '+' : ''}${m.quantity}</td>
                    <td>${m.created_by?.full_name || m.created_by?.username || 'System'}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewMovementDetails(${m.ledger_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent movements:', error);
    }
}

function viewMovementDetails(ledgerId) {
    // Navigate to stock ledger with filter
    window.location.href = `stock-ledger.html?ledger_id=${ledgerId}`;
}

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

