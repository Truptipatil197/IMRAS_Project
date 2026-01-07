/**
 * Category Management JavaScript
 */

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    await loadCategories();
    setupFormSubmit();
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
        
        const grid = document.getElementById('categoriesGrid');
        
        if (categories && categories.length > 0) {
            grid.innerHTML = categories.map(category => {
                const itemCount = category.item_count || category.items?.length || 0;
                
                return `
                    <div class="col-md-4 col-lg-3">
                        <div class="card category-card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h5 class="card-title mb-0">${category.category_name || 'Unnamed'}</h5>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-light" type="button" 
                                                data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="editCategory(${category.category_id}); return false;">
                                                    <i class="fas fa-edit me-2"></i> Edit
                                                </a>
                                            </li>
                                            <li>
                                                <a class="dropdown-item text-danger" href="#" onclick="deleteCategory(${category.category_id}); return false;">
                                                    <i class="fas fa-trash me-2"></i> Delete
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <p class="card-text text-muted small mb-3">
                                    ${category.description || 'No description'}
                                </p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="badge bg-primary">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No categories found</h5>
                    <p class="text-muted">Create your first category to organize your inventory!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        await Swal.fire('Error', 'Failed to load categories', 'error');
    }
}

// ===== OPEN ADD CATEGORY MODAL =====
function openAddCategoryModal() {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDescription').value = '';
    
    const form = document.getElementById('categoryForm');
    form.classList.remove('was-validated');
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

// ===== EDIT CATEGORY =====
async function editCategory(categoryId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/inventory/categories/${categoryId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch category');
        }
        
        const json = await response.json();
        // Backend wraps: { success, message, data }
        const category = json && json.data ? json.data : json || {};
        
        if (!category || !category.category_id) {
            throw new Error('Category not found');
        }
        
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = category.category_id;
        document.getElementById('categoryName').value = category.category_name || '';
        document.getElementById('categoryDescription').value = category.description || '';
        
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading category:', error);
        await Swal.fire('Error', 'Failed to load category data', 'error');
    }
}

// ===== DELETE CATEGORY =====
async function deleteCategory(categoryId) {
    const result = await Swal.fire({
        title: 'Delete Category?',
        text: 'Items in this category will not be deleted, but will have no category assigned.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await fetchWithAuth(
                `${CONFIG.API_BASE_URL}/api/inventory/categories/${categoryId}`,
                { method: 'DELETE' }
            );
            
            if (response.ok) {
                await Swal.fire('Deleted!', 'Category has been deleted.', 'success');
                await loadCategories();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Delete failed');
            }
        } catch (error) {
            await Swal.fire('Error', error.message || 'Failed to delete category', 'error');
        }
    }
}

// Make functions globally available
window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

// ===== SETUP FORM SUBMIT =====
function setupFormSubmit() {
    const form = document.getElementById('categoryForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const categoryId = document.getElementById('categoryId').value;
        const isEdit = !!categoryId;
        
        const formData = {
            category_name: document.getElementById('categoryName').value.trim(),
            description: document.getElementById('categoryDescription').value.trim() || null
        };
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
        
        try {
            const url = isEdit ?
                `${CONFIG.API_BASE_URL}/api/inventory/categories/${categoryId}` :
                `${CONFIG.API_BASE_URL}/api/inventory/categories`;
            
            const response = await fetchWithAuth(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
                modal.hide();
                
                await Swal.fire({
                    title: 'Success',
                    text: `Category ${isEdit ? 'updated' : 'created'} successfully`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                await loadCategories();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Submit error:', error);
            await Swal.fire({
                title: 'Error',
                text: error.message || 'Operation failed. Please try again.',
                icon: 'error'
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

