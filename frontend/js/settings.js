document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER));
    if (!user || user.role !== 'Admin') {
        window.location.href = '../index.html';
        return;
    }
    
    setupTabNavigation();
    await loadAllSettings();
});

function setupTabNavigation() {
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            document.querySelectorAll('.list-group-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.settings-section').forEach(s => s.classList.add('d-none'));
            
            // Show selected section
            const tab = item.dataset.tab;
            document.getElementById(`${tab}-section`).classList.remove('d-none');
        });
    });
}

async function loadAllSettings() {
    try {
        const response = await API.get('/api/settings');
        
        if (response.success && response.settings) {
            populateSettings(response.settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Load defaults if API fails
        loadDefaultSettings();
    }
}

function populateSettings(settings) {
    // General
    document.getElementById('companyName').value = settings.company_name || '';
    document.getElementById('currency').value = settings.currency || 'INR';
    document.getElementById('dateFormat').value = settings.date_format || 'DD/MM/YYYY';
    
    // Inventory
    document.getElementById('defaultReorderPoint').value = settings.default_reorder_point || 10;
    document.getElementById('defaultSafetyStock').value = settings.default_safety_stock || 5;
    document.getElementById('enableBatchTracking').checked = settings.enable_batch_tracking || false;
    document.getElementById('enableSerialTracking').checked = settings.enable_serial_tracking || false;
    
    // Reorder
    document.getElementById('enableAutoReorder').checked = settings.enable_auto_reorder || false;
    document.getElementById('reorderCheckFrequency').value = settings.reorder_check_frequency || 'daily';
    document.getElementById('autoApprovePRs').checked = settings.auto_approve_prs || false;
    
    // Notifications
    document.getElementById('emailNotifications').checked = settings.email_notifications || false;
    document.getElementById('lowStockAlerts').checked = settings.low_stock_alerts !== false; // Default true
    document.getElementById('expiryAlerts').checked = settings.expiry_alerts !== false; // Default true
    
    // Security
    document.getElementById('sessionTimeout').value = settings.session_timeout || 30;
    document.getElementById('passwordExpiry').value = settings.password_expiry_days || 90;
    
    // Backup
    document.getElementById('autoBackup').checked = settings.auto_backup || false;
    document.getElementById('backupFrequency').value = settings.backup_frequency || 'daily';
    
    if (settings.last_backup) {
        document.getElementById('lastBackup').textContent = new Date(settings.last_backup).toLocaleString();
    }
}

function loadDefaultSettings() {
    // Load sensible defaults
    document.getElementById('currency').value = 'INR';
    document.getElementById('dateFormat').value = 'DD/MM/YYYY';
    document.getElementById('defaultReorderPoint').value = 10;
    document.getElementById('defaultSafetyStock').value = 5;
    document.getElementById('reorderCheckFrequency').value = 'daily';
    document.getElementById('sessionTimeout').value = 30;
    document.getElementById('passwordExpiry').value = 90;
    document.getElementById('backupFrequency').value = 'daily';
    
    document.getElementById('lowStockAlerts').checked = true;
    document.getElementById('expiryAlerts').checked = true;
}

async function saveGeneralSettings() {
    try {
        const data = {
            company_name: document.getElementById('companyName').value,
            currency: document.getElementById('currency').value,
            date_format: document.getElementById('dateFormat').value
        };
        
        const response = await API.post('/api/settings/general', data);
        
        if (response.success) {
            Notify.success('General settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving general settings:', error);
        Notify.error('Failed to save general settings');
    }
}

async function saveInventorySettings() {
    try {
        const data = {
            default_reorder_point: parseInt(document.getElementById('defaultReorderPoint').value) || 0,
            default_safety_stock: parseInt(document.getElementById('defaultSafetyStock').value) || 0,
            enable_batch_tracking: document.getElementById('enableBatchTracking').checked,
            enable_serial_tracking: document.getElementById('enableSerialTracking').checked
        };
        
        const response = await API.post('/api/settings/inventory', data);
        
        if (response.success) {
            Notify.success('Inventory settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving inventory settings:', error);
        Notify.error('Failed to save inventory settings');
    }
}

async function saveReorderSettings() {
    try {
        const data = {
            enable_auto_reorder: document.getElementById('enableAutoReorder').checked,
            reorder_check_frequency: document.getElementById('reorderCheckFrequency').value,
            auto_approve_prs: document.getElementById('autoApprovePRs').checked
        };
        
        const response = await API.post('/api/settings/reorder', data);
        
        if (response.success) {
            Notify.success('Reorder settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving reorder settings:', error);
        Notify.error('Failed to save reorder settings');
    }
}

async function saveNotificationSettings() {
    try {
        const data = {
            email_notifications: document.getElementById('emailNotifications').checked,
            low_stock_alerts: document.getElementById('lowStockAlerts').checked,
            expiry_alerts: document.getElementById('expiryAlerts').checked
        };
        
        const response = await API.post('/api/settings/notifications', data);
        
        if (response.success) {
            Notify.success('Notification settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving notification settings:', error);
        Notify.error('Failed to save notification settings');
    }
}

async function saveSecuritySettings() {
    try {
        const data = {
            session_timeout: parseInt(document.getElementById('sessionTimeout').value) || 30,
            password_expiry_days: parseInt(document.getElementById('passwordExpiry').value) || 90
        };
        
        const response = await API.post('/api/settings/security', data);
        
        if (response.success) {
            Notify.success('Security settings saved successfully');
        }
    } catch (error) {
        console.error('Error saving security settings:', error);
        Notify.error('Failed to save security settings');
    }
}

async function triggerReorderCheck() {
    try {
        Swal.fire({
            title: 'Running Reorder Check...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const response = await API.post('/api/reorder/check-and-create');
        
        Swal.close();
        
        if (response.success) {
            Swal.fire({
                icon: 'success',
                title: 'Reorder Check Complete',
                html: `
                    <p><strong>${response.prs_created || 0}</strong> Purchase Requisitions created</p>
                    <p><strong>${response.items_checked || 0}</strong> items checked</p>
                `,
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        Swal.close();
        console.error('Error running reorder check:', error);
        Notify.error('Failed to run reorder check');
    }
}

async function createBackup() {
    try {
        Swal.fire({
            title: 'Creating Backup...',
            text: 'This may take a few moments',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const response = await API.post('/api/settings/backup');
        
        Swal.close();
        
        if (response.success) {
            // Trigger download
            if (response.backup_url) {
                const link = document.createElement('a');
                link.href = response.backup_url;
                link.download = response.filename || 'backup.sql';
                link.click();
            }
            
            Notify.success('Backup created successfully');
            document.getElementById('lastBackup').textContent = new Date().toLocaleString();
        }
    } catch (error) {
        Swal.close();
        console.error('Error creating backup:', error);
        Notify.error('Failed to create backup');
    }
}

async function restoreBackup(file) {
    if (!file) return;
    
    const result = await Swal.fire({
        title: 'Restore Database?',
        text: 'This will replace ALL current data. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, restore it!'
    });
    
    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Restoring Database...',
                text: 'Please wait and do not close this window',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            const formData = new FormData();
            formData.append('backup', file);
            
            const response = await API.uploadFile('/api/settings/restore', file, {});
            
            Swal.close();
            
            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Restore Complete',
                    text: 'Database restored successfully. Please login again.',
                    confirmButtonText: 'OK'
                }).then(() => {
                    logout();
                });
            }
        } catch (error) {
            Swal.close();
            console.error('Error restoring backup:', error);
            Notify.error('Failed to restore backup');
        }
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

