/**
 * Item Form JavaScript (Add/Edit)
 */

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadCategories();
    
    // Check if editing (URL param: ?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    
    if (itemId) {
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-edit me-2"></i> Edit Item';
        document.getElementById('breadcrumbTitle').textContent = 'Edit Item';
        document.getElementById('submitBtnText').textContent = 'Update Item';
        await loadItemData(itemId);
    }
    
    setupFormValidation();
    setupEventListeners();
});

// ===== LOAD CATEGORIES =====
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
        
        const select = document.getElementById('category');
        select.innerHTML = '<option value="">Select Category</option>';
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_id;
            option.textContent = cat.category_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        Swal.fire('Error', 'Failed to load categories', 'error');
    }
}

// ===== LOAD ITEM DATA (FOR EDITING) =====
async function loadItemData(itemId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch item');
        }
        
        const json = await response.json();
        // Backend wraps: { success, message, data: { item, total_stock, ... } }
        const payload = json && json.data ? json.data : json || {};
        const item = payload && payload.item ? payload.item : payload;
        
        if (!item || !item.item_id) {
            throw new Error('Item not found');
        }
        
        document.getElementById('itemId').value = item.item_id;
        document.getElementById('sku').value = item.sku || '';
        document.getElementById('itemName').value = item.item_name || '';
        document.getElementById('description').value = item.description || '';
        document.getElementById('category').value = item.category_id || '';
        document.getElementById('unitOfMeasure').value = item.unit_of_measure || '';
        document.getElementById('unitPrice').value = item.unit_price || '';
        document.getElementById('reorderPoint').value = item.reorder_point || 0;
        document.getElementById('safetyStock').value = item.safety_stock || 0;
        document.getElementById('leadTime').value = item.lead_time_days || 7;
        document.getElementById('status').value = item.is_active ? '1' : '0';
        
        // Disable SKU field when editing
        document.getElementById('sku').readOnly = true;
    } catch (error) {
        console.error('Error loading item data:', error);
        await Swal.fire('Error', 'Failed to load item data', 'error');
        setTimeout(() => window.location.href = 'inventory.html', 2000);
    }
}

// ===== SETUP FORM VALIDATION =====
function setupFormValidation() {
    const form = document.getElementById('itemForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        await submitForm();
    });
    
    // Real-time validation on blur
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.hasAttribute('required')) {
                if (input.validity.valid) {
                    input.classList.remove('is-invalid');
                    input.classList.add('is-valid');
                } else {
                    input.classList.remove('is-valid');
                    input.classList.add('is-invalid');
                }
            }
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid') && input.validity.valid) {
                input.classList.remove('is-invalid');
            }
        });
    });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('generateSKU').addEventListener('click', generateSKU);
}

// ===== GENERATE SKU =====
function generateSKU() {
    const categorySelect = document.getElementById('category');
    const categoryText = categorySelect.options[categorySelect.selectedIndex]?.text || 'ITEM';
    const prefix = categoryText.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    document.getElementById('sku').value = `${prefix}-${random}`;
}

// ===== SUBMIT FORM =====
async function submitForm() {
    const itemId = document.getElementById('itemId').value;
    const isEdit = !!itemId;
    
    const formData = {
        item_name: document.getElementById('itemName').value.trim(),
        description: document.getElementById('description').value.trim() || null,
        category_id: parseInt(document.getElementById('category').value),
        unit_of_measure: document.getElementById('unitOfMeasure').value,
        unit_price: parseFloat(document.getElementById('unitPrice').value),
        reorder_point: parseInt(document.getElementById('reorderPoint').value) || 0,
        safety_stock: parseInt(document.getElementById('safetyStock').value) || 0,
        lead_time_days: parseInt(document.getElementById('leadTime').value) || 0,
        is_active: document.getElementById('status').value === '1'
    };
    
    // Add SKU only for new items
    if (!isEdit) {
        const sku = document.getElementById('sku').value.trim();
        if (sku) {
            formData.sku = sku;
        }
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
    
    try {
        const url = isEdit ? 
            `${CONFIG.API_BASE_URL}/api/inventory/items/${itemId}` :
            `${CONFIG.API_BASE_URL}/api/inventory/items`;
        
        const response = await fetchWithAuth(url, {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            await Swal.fire({
                title: 'Success!',
                text: `Item ${isEdit ? 'updated' : 'created'} successfully`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            window.location.href = 'inventory.html';
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Operation failed');
        }
    } catch (error) {
        console.error('Submit error:', error);
        await Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to save item. Please try again.',
            icon: 'error'
        });
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i> <span id="submitBtnText">Save Item</span>';
    }
}

