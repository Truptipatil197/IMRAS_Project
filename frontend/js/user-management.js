let usersTable;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER));
    if (!user || user.role !== 'Admin') {
        window.location.href = '../index.html';
        return;
    }
    
    initializeDataTable();
    await loadUserStats();
    await loadUsers();
});

function initializeDataTable() {
    usersTable = $('#usersTable').DataTable({
        responsive: true,
        pageLength: 10,
        order: [[0, 'asc']],
        columnDefs: [
            { orderable: false, targets: [6] }
        ]
    });
}

async function loadUserStats() {
    try {
        const response = await API.get('/api/users/stats');
        
        if (response.success) {
            document.getElementById('totalUsers').textContent = response.stats.total || 0;
            document.getElementById('activeUsers').textContent = response.stats.active || 0;
            document.getElementById('adminCount').textContent = response.stats.admins || 0;
            document.getElementById('staffCount').textContent = response.stats.staff || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    try {
        const response = await API.get('/api/users');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load users');
        }
        
        usersTable.clear();
        
        response.users.forEach(user => {
            const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
            const avatar = `<div class="user-avatar">${initials}</div>`;
            
            const roleClass = user.role === 'Admin' ? 'role-admin' : 
                            user.role === 'Manager' ? 'role-manager' : 'role-staff';
            
            const statusClass = user.is_active ? 'status-active' : 'status-inactive';
            const statusText = user.is_active ? 'Active' : 'Inactive';
            
            const lastLogin = user.last_login ? 
                new Date(user.last_login).toLocaleDateString() : 'Never';
            
            // Escape user name for safe use in onclick
            const safeUserName = user.full_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            const actions = `
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id}, '${safeUserName}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="resetPassword(${user.user_id})" title="Reset Password">
                    <i class="fas fa-key"></i>
                </button>
            `;
            
            usersTable.row.add([
                `${avatar} ${user.full_name}`,
                user.email,
                `<span class="role-badge ${roleClass}">${user.role}</span>`,
                user.phone || 'N/A',
                `<span class="status-badge ${statusClass}">${statusText}</span>`,
                lastLogin,
                actions
            ]);
        });
        
        usersTable.draw();
        
    } catch (error) {
        console.error('Error loading users:', error);
        Notify.error('Failed to load users');
    }
}

function openAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordRequired').style.display = 'inline';
    document.getElementById('password').required = true;
    
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

async function editUser(userId) {
    try {
        const response = await API.get(`/api/users/${userId}`);
        
        if (!response.success) {
            throw new Error('Failed to load user');
        }
        
        const user = response.user;
        
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = user.user_id;
        document.getElementById('fullName').value = user.full_name;
        document.getElementById('email').value = user.email;
        document.getElementById('username').value = user.username;
        document.getElementById('role').value = user.role;
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('department').value = user.department || '';
        document.getElementById('isActive').value = user.is_active ? '1' : '0';
        
        document.getElementById('passwordRequired').style.display = 'none';
        document.getElementById('password').required = false;
        document.getElementById('password').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading user:', error);
        Notify.error('Failed to load user details');
    }
}

async function saveUser() {
    try {
        const userId = document.getElementById('userId').value;
        const isEdit = userId !== '';
        
        // Validate form
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        if (!fullName || !email || !username || !role) {
            Notify.error('Please fill all required fields');
            return;
        }
        
        if (!isEdit && !password) {
            Notify.error('Password is required for new users');
            return;
        }
        
        const data = {
            full_name: fullName,
            email: email,
            username: username,
            role: role,
            phone: document.getElementById('phone').value.trim(),
            department: document.getElementById('department').value.trim(),
            is_active: parseInt(document.getElementById('isActive').value)
        };
        
        if (password) {
            data.password = password;
        }
        
        let response;
        if (isEdit) {
            response = await API.put(`/api/users/${userId}`, data);
        } else {
            response = await API.post('/api/users', data);
        }
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to save user');
        }
        
        Notify.success(`User ${isEdit ? 'updated' : 'created'} successfully`);
        
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        
        await loadUsers();
        await loadUserStats();
        
    } catch (error) {
        console.error('Error saving user:', error);
        Notify.error(error.message || 'Failed to save user');
    }
}

async function deleteUser(userId, userName) {
    // Escape HTML to prevent XSS
    const safeUserName = userName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const result = await Swal.fire({
        title: 'Delete User?',
        html: `Are you sure you want to delete <strong>${safeUserName}</strong>? This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await API.delete(`/api/users/${userId}`);
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete user');
            }
            
            Notify.success('User deleted successfully');
            await loadUsers();
            await loadUserStats();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            Notify.error('Failed to delete user');
        }
    }
}

async function resetPassword(userId) {
    const { value: newPassword } = await Swal.fire({
        title: 'Reset Password',
        input: 'password',
        inputLabel: 'Enter new password',
        inputPlaceholder: 'Enter new password',
        inputAttributes: {
            minlength: 6
        },
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Password is required!';
            }
            if (value.length < 6) {
                return 'Password must be at least 6 characters!';
            }
        }
    });
    
    if (newPassword) {
        try {
            const response = await API.put(`/api/users/${userId}/reset-password`, {
                password: newPassword
            });
            
            if (!response.success) {
                throw new Error(response.message || 'Failed to reset password');
            }
            
            Notify.success('Password reset successfully');
            
        } catch (error) {
            console.error('Error resetting password:', error);
            Notify.error('Failed to reset password');
        }
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

