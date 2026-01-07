/**
 * GRN Details Page JavaScript
 */

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadUserInfo();
    
    const urlParams = new URLSearchParams(window.location.search);
    const grnId = urlParams.get('id');
    
    if (grnId) {
        await loadGRNDetails(grnId);
    } else {
        Swal.fire('Error', 'GRN ID not provided', 'error');
        setTimeout(() => window.location.href = 'grn.html', 2000);
    }
});

// ===== LOAD GRN DETAILS =====
async function loadGRNDetails(grnId) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/grn/${grnId}`);
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('GRN not found');
        }
        
        const grn = data.data;
        
        // Populate header
        document.getElementById('grnNumber').textContent = grn.grn_number || 'N/A';
        document.getElementById('grnNumberBreadcrumb').textContent = grn.grn_number || 'GRN Details';
        document.getElementById('poNumber').textContent = grn.purchaseOrder?.po_number || '-';
        document.getElementById('supplierName').textContent = grn.purchaseOrder?.supplier?.supplier_name || '-';
        
        // Status badge
        const statusBadge = document.getElementById('grnStatus');
        statusBadge.textContent = grn.status || 'Draft';
        statusBadge.className = `badge fs-6 ${grn.status === 'Completed' ? 'bg-success' : 'bg-warning'}`;
        
        // GRN Information
        document.getElementById('grnDate').textContent = grn.grn_date ? formatDate(grn.grn_date) : '-';
        document.getElementById('warehouseName').textContent = grn.warehouse?.warehouse_name || '-';
        document.getElementById('receivedBy').textContent = grn.receiver?.full_name || '-';
        document.getElementById('remarks').textContent = grn.remarks || '-';
        
        // Summary
        let totalReceived = 0;
        let totalAccepted = 0;
        let totalRejected = 0;
        
        if (grn.grnItems && Array.isArray(grn.grnItems)) {
            grn.grnItems.forEach(item => {
                totalReceived += item.received_qty || 0;
                totalAccepted += item.accepted_qty || 0;
                totalRejected += item.rejected_qty || 0;
            });
        }
        
        document.getElementById('totalReceived').textContent = totalReceived;
        document.getElementById('totalAccepted').textContent = totalAccepted;
        document.getElementById('totalRejected').textContent = totalRejected;
        
        // Items Table
        populateItemsTable(grn.grnItems || []);
        
    } catch (error) {
        console.error('Error loading GRN details:', error);
        Swal.fire('Error', 'Failed to load GRN details', 'error');
        setTimeout(() => window.location.href = 'grn.html', 2000);
    }
}

// ===== POPULATE ITEMS TABLE =====
function populateItemsTable(items) {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No items found</td></tr>';
        return;
    }
    
    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.item?.item_name || 'Unknown'}</td>
            <td>${item.item?.sku || 'N/A'}</td>
            <td>${item.received_qty || 0}</td>
            <td>${item.accepted_qty || 0}</td>
            <td>${item.rejected_qty || 0}</td>
            <td>${item.batch_number || '-'}</td>
            <td>${item.expiry_date ? formatDate(item.expiry_date) : '-'}</td>
            <td>${item.rejection_reason || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===== PRINT GRN =====
function printGRN() {
    window.print();
}

// ===== DOWNLOAD PDF =====
function downloadPDF() {
    Swal.fire('Info', 'PDF export functionality will be implemented', 'info');
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

