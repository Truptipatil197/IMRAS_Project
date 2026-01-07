// ========================================
// EXPIRY TRACKING REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let expiredBatches = [];
let expiring7Batches = [];
let expiring30Batches = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadExpiryData();
});

// Load All Expiry Data
async function loadExpiryData() {
    try {
        showLoader();
        
        // Fetch all expiry categories
        const [expired, expiring7, expiring30] = await Promise.all([
            fetchExpiredBatches(),
            fetchExpiring7Days(),
            fetchExpiring30Days()
        ]);
        
        expiredBatches = expired || [];
        expiring7Batches = expiring7 || [];
        expiring30Batches = expiring30 || [];
        
        // Update summary cards
        updateSummaryCards();
        
        // Populate tables
        populateExpiredTable();
        populateExpiring7Table();
        populateExpiring30Table();
        
        // Update badge counts
        updateBadgeCounts();
        
        hideLoader();
    } catch (error) {
        console.error('Error loading expiry data:', error);
        showNotification('Failed to load expiry data', 'error');
        hideLoader();
    }
}

// Fetch Expired Batches
async function fetchExpiredBatches() {
    const response = await fetchWithAuth(`${API_URL}/batches/expired`);
    if (!response.ok) return [];
    return await response.json();
}

// Fetch Batches Expiring in 7 Days
async function fetchExpiring7Days() {
    const response = await fetchWithAuth(`${API_URL}/batches/expiring?days=7`);
    if (!response.ok) return [];
    return await response.json();
}

// Fetch Batches Expiring in 30 Days
async function fetchExpiring30Days() {
    const response = await fetchWithAuth(`${API_URL}/batches/expiring?days=30`);
    if (!response.ok) return [];
    return await response.json();
}

// Update Summary Cards
function updateSummaryCards() {
    // Expired
    const expiredValue = expiredBatches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.unit_price || 0)), 0);
    const expiredCountEl = document.getElementById('expiredCount');
    const expiredValueEl = document.getElementById('expiredValue');
    if (expiredCountEl) expiredCountEl.textContent = expiredBatches.length;
    if (expiredValueEl) expiredValueEl.textContent = formatCurrency(expiredValue) + ' value';
    
    // Expiring in 7 days
    const expiring7Value = expiring7Batches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.unit_price || 0)), 0);
    const expiring7CountEl = document.getElementById('expiring7Count');
    const expiring7ValueEl = document.getElementById('expiring7Value');
    if (expiring7CountEl) expiring7CountEl.textContent = expiring7Batches.length;
    if (expiring7ValueEl) expiring7ValueEl.textContent = formatCurrency(expiring7Value) + ' value';
    
    // Expiring in 30 days
    const expiring30Value = expiring30Batches.reduce((sum, b) => sum + ((b.quantity || 0) * (b.unit_price || 0)), 0);
    const expiring30CountEl = document.getElementById('expiring30Count');
    const expiring30ValueEl = document.getElementById('expiring30Value');
    if (expiring30CountEl) expiring30CountEl.textContent = expiring30Batches.length;
    if (expiring30ValueEl) expiring30ValueEl.textContent = formatCurrency(expiring30Value) + ' value';
}

// Update Badge Counts
function updateBadgeCounts() {
    const expiredBadge = document.getElementById('expiredBadge');
    const expiring7Badge = document.getElementById('expiring7Badge');
    const expiring30Badge = document.getElementById('expiring30Badge');
    
    if (expiredBadge) expiredBadge.textContent = expiredBatches.length;
    if (expiring7Badge) expiring7Badge.textContent = expiring7Batches.length;
    if (expiring30Badge) expiring30Badge.textContent = expiring30Batches.length;
}

// Populate Expired Items Table
function populateExpiredTable() {
    const tbody = document.getElementById('expiredTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (expiredBatches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No expired items</td></tr>';
        return;
    }
    
    expiredBatches.forEach(batch => {
        const daysExpired = calculateDaysExpired(batch.expiry_date);
        const value = (batch.quantity || 0) * (batch.unit_price || 0);
        
        const row = `
            <tr class="expired-row">
                <td><strong>${batch.item_name || 'N/A'}</strong></td>
                <td>${batch.sku || ''}</td>
                <td><span class="badge bg-secondary">${batch.batch_number || ''}</span></td>
                <td>${formatDate(batch.expiry_date)}</td>
                <td><span class="text-danger fw-bold">${daysExpired} days</span></td>
                <td>${batch.quantity || 0}</td>
                <td>${formatCurrency(value)}</td>
                <td>${batch.warehouse_name || ''} - ${batch.location_code || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="openActionModal(${batch.batch_id || 0}, 'dispose')">
                        <i class="fas fa-trash"></i> Dispose
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Populate Expiring in 7 Days Table
function populateExpiring7Table() {
    const tbody = document.getElementById('expiring7TableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (expiring7Batches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items expiring in 7 days</td></tr>';
        return;
    }
    
    expiring7Batches.forEach(batch => {
        const daysLeft = calculateDaysUntilExpiry(batch.expiry_date);
        const value = (batch.quantity || 0) * (batch.unit_price || 0);
        
        const row = `
            <tr class="expiring-soon-row">
                <td><strong>${batch.item_name || 'N/A'}</strong></td>
                <td>${batch.sku || ''}</td>
                <td><span class="badge bg-warning text-dark">${batch.batch_number || ''}</span></td>
                <td>${formatDate(batch.expiry_date)}</td>
                <td><span class="text-warning fw-bold">${daysLeft} days</span></td>
                <td>${batch.quantity || 0}</td>
                <td>${formatCurrency(value)}</td>
                <td>${batch.warehouse_name || ''} - ${batch.location_code || 'N/A'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-warning" onclick="openActionModal(${batch.batch_id || 0}, 'discount')">
                            <i class="fas fa-tag"></i> Discount
                        </button>
                        <button class="btn btn-sm btn-info" onclick="openActionModal(${batch.batch_id || 0}, 'transfer')">
                            <i class="fas fa-exchange-alt"></i> Transfer
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Populate Expiring in 30 Days Table
function populateExpiring30Table() {
    const tbody = document.getElementById('expiring30TableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (expiring30Batches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items expiring in 30 days</td></tr>';
        return;
    }
    
    expiring30Batches.forEach(batch => {
        const daysLeft = calculateDaysUntilExpiry(batch.expiry_date);
        const value = (batch.quantity || 0) * (batch.unit_price || 0);
        
        const row = `
            <tr>
                <td><strong>${batch.item_name || 'N/A'}</strong></td>
                <td>${batch.sku || ''}</td>
                <td><span class="badge bg-info">${batch.batch_number || ''}</span></td>
                <td>${formatDate(batch.expiry_date)}</td>
                <td><span class="text-info fw-bold">${daysLeft} days</span></td>
                <td>${batch.quantity || 0}</td>
                <td>${formatCurrency(value)}</td>
                <td>${batch.warehouse_name || ''} - ${batch.location_code || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="viewBatchDetails(${batch.batch_id || 0})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Calculate Days Expired
function calculateDaysExpired(expiryDate) {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = today - expiry;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Calculate Days Until Expiry
function calculateDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
}

// Open Action Modal
function openActionModal(batchId, suggestedAction = 'dispose') {
    const batchIdInput = document.getElementById('actionBatchId');
    const actionTypeSelect = document.getElementById('actionType');
    const actionNotesTextarea = document.getElementById('actionNotes');
    
    if (batchIdInput) batchIdInput.value = batchId;
    if (actionTypeSelect) actionTypeSelect.value = suggestedAction;
    if (actionNotesTextarea) actionNotesTextarea.value = '';
    
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('actionModal'));
        modal.show();
    }
}

// Submit Batch Action
async function submitAction() {
    const batchIdInput = document.getElementById('actionBatchId');
    const actionTypeSelect = document.getElementById('actionType');
    const actionNotesTextarea = document.getElementById('actionNotes');
    
    const batchId = batchIdInput?.value;
    const actionType = actionTypeSelect?.value;
    const notes = actionNotesTextarea?.value.trim();
    
    if (!notes) {
        showNotification('Please provide reason/notes', 'warning');
        return;
    }
    
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/batches/${batchId}/action`, {
            method: 'POST',
            body: JSON.stringify({
                action_type: actionType,
                notes: notes
            })
        });
        
        if (!response.ok) throw new Error('Failed to submit action');
        
        // Close modal
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
            if (modal) modal.hide();
        }
        
        hideLoader();
        showNotification(`Action ${actionType} completed successfully`, 'success');
        
        // Reload data
        loadExpiryData();
    } catch (error) {
        console.error('Error submitting action:', error);
        showNotification('Failed to submit action', 'error');
        hideLoader();
    }
}

// View Batch Details
function viewBatchDetails(batchId) {
    // Navigate to batch details page or open modal
    console.log('View batch details:', batchId);
    showNotification('Batch details feature coming soon', 'info');
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const excelData = [
            ['Expiry Tracking Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['EXPIRED ITEMS'],
            ['Item Name', 'SKU', 'Batch Number', 'Expiry Date', 'Days Expired', 'Quantity', 'Value', 'Location']
        ];
        
        expiredBatches.forEach(batch => {
            excelData.push([
                batch.item_name || '',
                batch.sku || '',
                batch.batch_number || '',
                formatDate(batch.expiry_date),
                calculateDaysExpired(batch.expiry_date) + ' days',
                batch.quantity || 0,
                (batch.quantity || 0) * (batch.unit_price || 0),
                (batch.warehouse_name || '') + ' - ' + (batch.location_code || 'N/A')
            ]);
        });
        
        excelData.push([]);
        excelData.push(['EXPIRING IN 7 DAYS']);
        excelData.push(['Item Name', 'SKU', 'Batch Number', 'Expiry Date', 'Days Left', 'Quantity', 'Value', 'Location']);
        
        expiring7Batches.forEach(batch => {
            excelData.push([
                batch.item_name || '',
                batch.sku || '',
                batch.batch_number || '',
                formatDate(batch.expiry_date),
                calculateDaysUntilExpiry(batch.expiry_date) + ' days',
                batch.quantity || 0,
                (batch.quantity || 0) * (batch.unit_price || 0),
                (batch.warehouse_name || '') + ' - ' + (batch.location_code || 'N/A')
            ]);
        });
        
        excelData.push([]);
        excelData.push(['EXPIRING IN 30 DAYS']);
        excelData.push(['Item Name', 'SKU', 'Batch Number', 'Expiry Date', 'Days Left', 'Quantity', 'Value', 'Location']);
        
        expiring30Batches.forEach(batch => {
            excelData.push([
                batch.item_name || '',
                batch.sku || '',
                batch.batch_number || '',
                formatDate(batch.expiry_date),
                calculateDaysUntilExpiry(batch.expiry_date) + ' days',
                batch.quantity || 0,
                (batch.quantity || 0) * (batch.unit_price || 0),
                (batch.warehouse_name || '') + ' - ' + (batch.location_code || 'N/A')
            ]);
        });
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Expiry Tracking");
            XLSX.writeFile(wb, `Expiry_Tracking_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        hideLoader();
        showNotification('Report exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Failed to export report', 'error');
        hideLoader();
    }
}

// Export to PDF
function exportToPDF() {
    try {
        showLoader();
        
        if (typeof window.jspdf === 'undefined') {
            showNotification('PDF export library not loaded', 'error');
            hideLoader();
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        doc.setFontSize(18);
        doc.text('Expiry Tracking Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        let startY = 35;
        
        // Expired Items
        if (expiredBatches.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(220, 53, 69);
            doc.text('EXPIRED ITEMS', 14, startY);
            startY += 5;
            
            const expiredRows = expiredBatches.map(batch => [
                (batch.item_name || '').substring(0, 20),
                batch.batch_number || '',
                formatDate(batch.expiry_date),
                calculateDaysExpired(batch.expiry_date),
                batch.quantity || 0,
                formatCurrency((batch.quantity || 0) * (batch.unit_price || 0))
            ]);
            
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: startY,
                    head: [['Item', 'Batch', 'Expiry', 'Days Expired', 'Qty', 'Value']],
                    body: expiredRows,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [220, 53, 69] }
                });
                
                startY = doc.lastAutoTable.finalY + 10;
            }
        }
        
        // Expiring in 7 Days
        if (expiring7Batches.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(255, 193, 7);
            doc.text('EXPIRING IN 7 DAYS', 14, startY);
            startY += 5;
            
            const expiring7Rows = expiring7Batches.map(batch => [
                (batch.item_name || '').substring(0, 20),
                batch.batch_number || '',
                formatDate(batch.expiry_date),
                calculateDaysUntilExpiry(batch.expiry_date),
                batch.quantity || 0,
                formatCurrency((batch.quantity || 0) * (batch.unit_price || 0))
            ]);
            
            if (typeof doc.autoTable !== 'undefined') {
                doc.autoTable({
                    startY: startY,
                    head: [['Item', 'Batch', 'Expiry', 'Days Left', 'Qty', 'Value']],
                    body: expiring7Rows,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [255, 193, 7] }
                });
            }
        }
        
        doc.save(`Expiry_Tracking_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoader();
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Failed to export PDF', 'error');
        hideLoader();
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showLoader() {
    document.body.style.cursor = 'wait';
}

function hideLoader() {
    document.body.style.cursor = 'default';
}

function showNotification(message, type) {
    alert(message);
}

