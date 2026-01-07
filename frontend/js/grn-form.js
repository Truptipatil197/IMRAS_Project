/**
 * GRN Form JavaScript - Create/Edit GRN
 */

// ===== GLOBAL VARIABLES =====
let selectedPO = null;
let poItems = [];
let datePicker = null;

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadPendingPOs();
    await loadWarehouses();
    
    // Initialize Flatpickr for date picker
    datePicker = flatpickr("#grnDate", {
        dateFormat: "Y-m-d",
        defaultDate: "today",
        maxDate: "today"
    });
    
    // Check if editing or creating from PO
    const urlParams = new URLSearchParams(window.location.search);
    const poId = urlParams.get('po_id');
    const grnId = urlParams.get('id');
    
    if (poId) {
        document.getElementById('poSelect').value = poId;
        await loadPODetails(poId);
    }
    
    if (grnId) {
        await loadGRNData(grnId);
    }
    
    setupEventListeners();
});

// ===== LOAD PENDING POS =====
async function loadPendingPOs() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/pending-pos`);
        const data = await response.json();
        
        const select = document.getElementById('poSelect');
        const pendingPOs = (data && data.data) ? data.data : [];
        
        pendingPOs.forEach(po => {
            const option = document.createElement('option');
            option.value = po.po_id;
            option.textContent = `${po.po_number} - ${po.supplier?.supplier_name || 'Unknown'} (${po.items?.length || 0} items)`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading pending POs:', error);
        Swal.fire('Error', 'Failed to load pending purchase orders', 'error');
    }
}

// ===== LOAD PO DETAILS =====
async function loadPODetails(poId) {
    try {
        // Use pending POs endpoint to get PO details
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/pending-pos`);
        const data = await response.json();
        const pendingPOs = (data && data.data) ? data.data : [];
        
        selectedPO = pendingPOs.find(po => po.po_id == poId);
        
        if (!selectedPO) {
            // Try to get PO status from reorder endpoint as fallback
            try {
                const poResponse = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/po/${poId}/status`);
                const poData = await poResponse.json();
                if (poData.success && poData.data) {
                    const po = poData.data;
                    selectedPO = {
                        po_id: po.po_id,
                        po_number: po.po_number,
                        po_date: po.purchase_requisition?.pr_date,
                        expected_delivery_date: po.purchase_requisition?.pr_date,
                        supplier: po.supplier,
                        items: po.items || []
                    };
                }
            } catch (e) {
                console.error('Fallback PO load error:', e);
            }
        }
        
        if (!selectedPO) {
            Swal.fire('Error', 'Purchase Order not found or already completed', 'error');
            setTimeout(() => window.location.href = 'grn.html', 2000);
            return;
        }
        
        // Show PO details
        document.getElementById('poDetails').style.display = 'block';
        document.getElementById('supplierName').textContent = selectedPO.supplier?.supplier_name || '-';
        document.getElementById('poDate').textContent = selectedPO.po_date ? formatDate(selectedPO.po_date) : '-';
        document.getElementById('expectedDate').textContent = selectedPO.expected_delivery_date ? formatDate(selectedPO.expected_delivery_date) : '-';
        
        // Populate items table - use items from pending PO or map from PO status
        const items = selectedPO.items || [];
        populateItemsTable(items);
    } catch (error) {
        console.error('Error loading PO details:', error);
        Swal.fire('Error', 'Failed to load PO details', 'error');
    }
}

// ===== POPULATE ITEMS TABLE =====
function populateItemsTable(items) {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    
    poItems = items.map(item => ({
        item_id: item.item_id || item.item?.item_id,
        item_name: item.item_name || item.item?.item_name,
        sku: item.sku || item.item?.sku,
        ordered_qty: item.ordered_qty || item.pending_qty || 0
    }));
    
    poItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'item-row';
        row.setAttribute('data-item-index', index);
        
        row.innerHTML = `
            <td>
                <strong>${item.item_name || 'Unknown'}</strong><br>
                <small class="text-muted">SKU: ${item.sku || 'N/A'}</small>
            </td>
            <td class="text-center">
                <strong>${item.ordered_qty || 0}</strong>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm received-qty" 
                       data-index="${index}" min="0" max="${item.ordered_qty || 0}" value="0" required>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm accepted-qty" 
                       data-index="${index}" min="0" value="0" required>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm rejected-qty" 
                       data-index="${index}" min="0" value="0">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm batch-number" 
                       data-index="${index}" placeholder="Batch No.">
            </td>
            <td>
                <input type="date" class="form-control form-control-sm expiry-date" 
                       data-index="${index}">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm rejection-reason" 
                       data-index="${index}" placeholder="Reason">
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    attachItemValidation();
}

// ===== ATTACH REAL-TIME VALIDATION =====
function attachItemValidation() {
    // Validate received = accepted + rejected
    document.querySelectorAll('.received-qty, .accepted-qty, .rejected-qty').forEach(input => {
        input.addEventListener('input', function() {
            const index = this.dataset.index;
            validateQuantities(index);
        });
    });
    
    // Require rejection reason if rejected > 0
    document.querySelectorAll('.rejected-qty').forEach(input => {
        input.addEventListener('input', function() {
            const index = this.dataset.index;
            const rejectedQty = parseInt(this.value) || 0;
            const reasonField = document.querySelector(`.rejection-reason[data-index="${index}"]`);
            
            if (rejectedQty > 0) {
                reasonField.required = true;
                reasonField.classList.add('border-warning');
            } else {
                reasonField.required = false;
                reasonField.classList.remove('border-warning');
            }
        });
    });
}

// ===== VALIDATE QUANTITIES =====
function validateQuantities(index) {
    const receivedInput = document.querySelector(`.received-qty[data-index="${index}"]`);
    const acceptedInput = document.querySelector(`.accepted-qty[data-index="${index}"]`);
    const rejectedInput = document.querySelector(`.rejected-qty[data-index="${index}"]`);
    
    if (!receivedInput || !acceptedInput || !rejectedInput) return true;
    
    const received = parseInt(receivedInput.value) || 0;
    const accepted = parseInt(acceptedInput.value) || 0;
    const rejected = parseInt(rejectedInput.value) || 0;
    const ordered = poItems[index]?.ordered_qty || 0;
    
    // Check if received exceeds ordered
    if (received > ordered) {
        receivedInput.classList.add('qty-validation-error');
        receivedInput.setCustomValidity(`Cannot exceed ordered quantity (${ordered})`);
        return false;
    } else {
        receivedInput.classList.remove('qty-validation-error');
        receivedInput.setCustomValidity('');
    }
    
    // Check if received = accepted + rejected
    if (received !== (accepted + rejected)) {
        acceptedInput.classList.add('qty-validation-error');
        rejectedInput.classList.add('qty-validation-error');
        return false;
    } else {
        acceptedInput.classList.remove('qty-validation-error');
        rejectedInput.classList.remove('qty-validation-error');
    }
    
    return true;
}

// ===== LOAD WAREHOUSES =====
async function loadWarehouses() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/warehouses`);
        const data = await response.json();
        
        const select = document.getElementById('warehouse');
        const warehouses = (data && data.data) ? (Array.isArray(data.data) ? data.data : []) : [];
        
        warehouses.forEach(wh => {
            const option = document.createElement('option');
            option.value = wh.warehouse_id;
            option.textContent = wh.warehouse_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading warehouses:', error);
        Swal.fire('Error', 'Failed to load warehouses', 'error');
    }
}

// ===== LOAD GRN DATA (for editing) =====
async function loadGRNData(grnId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/${grnId}`);
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('GRN not found');
        }
        
        const grn = data.data;
        
        // Populate form fields
        document.getElementById('grnId').value = grn.grn_id;
        document.getElementById('warehouse').value = grn.warehouse_id;
        document.getElementById('grnDate').value = grn.grn_date;
        document.getElementById('remarks').value = grn.remarks || '';
        
        // Load PO details
        if (grn.po_id) {
            document.getElementById('poSelect').value = grn.po_id;
            await loadPODetails(grn.po_id);
            
            // Populate item quantities from GRN items
            setTimeout(() => {
                if (grn.grnItems) {
                    grn.grnItems.forEach((grnItem, idx) => {
                        const index = poItems.findIndex(item => item.item_id === grnItem.item_id);
                        if (index !== -1) {
                            document.querySelector(`.received-qty[data-index="${index}"]`).value = grnItem.received_qty || 0;
                            document.querySelector(`.accepted-qty[data-index="${index}"]`).value = grnItem.accepted_qty || 0;
                            document.querySelector(`.rejected-qty[data-index="${index}"]`).value = grnItem.rejected_qty || 0;
                            if (grnItem.batch_number) {
                                document.querySelector(`.batch-number[data-index="${index}"]`).value = grnItem.batch_number;
                            }
                            if (grnItem.expiry_date) {
                                document.querySelector(`.expiry-date[data-index="${index}"]`).value = grnItem.expiry_date;
                            }
                            if (grnItem.rejection_reason) {
                                document.querySelector(`.rejection-reason[data-index="${index}"]`).value = grnItem.rejection_reason;
                            }
                        }
                    });
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error loading GRN data:', error);
        Swal.fire('Error', 'Failed to load GRN data', 'error');
    }
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('poSelect').addEventListener('change', async function() {
        if (this.value) {
            await loadPODetails(this.value);
        } else {
            document.getElementById('poDetails').style.display = 'none';
            document.getElementById('itemsTableBody').innerHTML = '';
        }
    });
    
    document.getElementById('grnForm').addEventListener('submit', handleCompleteGRN);
    document.getElementById('saveDraftBtn').addEventListener('click', handleSaveDraft);
}

// ===== SAVE AS DRAFT =====
async function handleSaveDraft() {
    const formData = collectFormData();
    if (!formData) return;
    
    formData.status = 'Draft';
    await submitGRN(formData, 'Draft');
}

// ===== COMPLETE GRN =====
async function handleCompleteGRN(e) {
    e.preventDefault();
    
    // Validate all quantities
    let allValid = true;
    poItems.forEach((item, index) => {
        if (!validateQuantities(index)) {
            allValid = false;
        }
    });
    
    if (!allValid) {
        Swal.fire('Validation Error', 'Please fix quantity errors before completing GRN', 'error');
        return;
    }
    
    const formData = collectFormData();
    if (!formData) return;
    
    formData.status = 'Completed';
    await submitGRN(formData, 'Completed');
}

// ===== COLLECT FORM DATA =====
function collectFormData() {
    const poId = parseInt(document.getElementById('poSelect').value);
    const warehouseId = parseInt(document.getElementById('warehouse').value);
    const grnDate = document.getElementById('grnDate').value;
    
    if (!poId || !warehouseId || !grnDate) {
        Swal.fire('Validation Error', 'Please fill in all required fields', 'error');
        return null;
    }
    
    const items = [];
    
    poItems.forEach((item, index) => {
        const receivedQty = parseInt(document.querySelector(`.received-qty[data-index="${index}"]`).value) || 0;
        
        if (receivedQty > 0) {
            const acceptedQty = parseInt(document.querySelector(`.accepted-qty[data-index="${index}"]`).value) || 0;
            const rejectedQty = parseInt(document.querySelector(`.rejected-qty[data-index="${index}"]`).value) || 0;
            
            if (receivedQty !== (acceptedQty + rejectedQty)) {
                Swal.fire('Validation Error', `Item ${item.item_name}: Received Qty must equal Accepted Qty + Rejected Qty`, 'error');
                return null;
            }
            
            items.push({
                item_id: item.item_id,
                received_qty: receivedQty,
                accepted_qty: acceptedQty,
                rejected_qty: rejectedQty,
                batch_number: document.querySelector(`.batch-number[data-index="${index}"]`).value || null,
                expiry_date: document.querySelector(`.expiry-date[data-index="${index}"]`).value || null,
                rejection_reason: document.querySelector(`.rejection-reason[data-index="${index}"]`).value || null
            });
        }
    });
    
    if (items.length === 0) {
        Swal.fire('Validation Error', 'Please enter received quantities for at least one item', 'error');
        return null;
    }
    
    return {
        po_id: poId,
        warehouse_id: warehouseId,
        grn_date: grnDate,
        remarks: document.getElementById('remarks').value || null,
        items: items
    };
}

// ===== SUBMIT GRN =====
async function submitGRN(formData, status) {
    const submitBtn = status === 'Draft' ? 
        document.getElementById('saveDraftBtn') : 
        document.getElementById('completeBtn');
    
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const grnId = document.getElementById('grnId').value;
        const url = grnId ? `${CONFIG.API_BASE_URL}/api/grn/${grnId}` : `${CONFIG.API_BASE_URL}/api/grn`;
        const method = grnId ? 'PUT' : 'POST';
        
        const response = await fetchWithAuth(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            await Swal.fire({
                title: 'Success!',
                text: `GRN ${status === 'Draft' ? 'saved as draft' : 'completed'} successfully`,
                icon: 'success',
                timer: 2000
            });
            window.location.href = 'grn.html';
        } else {
            const error = await response.json();
            throw new Error(error.message || 'GRN submission failed');
        }
    } catch (error) {
        console.error('Submit GRN error:', error);
        Swal.fire('Error', error.message || 'Failed to submit GRN', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

