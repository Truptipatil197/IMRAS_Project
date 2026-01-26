// ========================================
// SUPPLIER PERFORMANCE REPORT
// ========================================

const API_URL = CONFIG.API_BASE_URL + '/api';

let supplierPerformanceTable;
let supplierComparisonChart;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeSupplierTable();
    loadSupplierPerformanceData();
});

// Initialize DataTable
function initializeSupplierTable() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.dataTable === 'undefined') {
        console.error('jQuery or DataTables not loaded');
        return;
    }
    
    supplierPerformanceTable = $('#supplierPerformanceTable').DataTable({
        columns: [
            { 
                data: 'supplier_name',
                render: function(data, type, row) {
                    return `<strong>${data || 'Unknown'}</strong>`;
                }
            },
            { data: 'total_orders' },
            { 
                data: 'on_time_percentage',
                render: function(data) {
                    return getPerformanceBar(data || 0, 'success');
                }
            },
            { 
                data: 'quality_rate',
                render: function(data) {
                    return getPerformanceBar(data || 0, 'primary');
                }
            },
            { 
                data: 'avg_lead_time',
                render: function(data) {
                    return `${data || 0} days`;
                }
            },
            { 
                data: 'total_value',
                render: function(data) {
                    return formatCurrency(data || 0);
                }
            },
            { 
                data: 'performance_score',
                render: function(data) {
                    return `<strong>${(data || 0).toFixed(1)}/10</strong>`;
                }
            },
            { 
                data: 'performance_rating',
                render: function(data) {
                    return getRatingStars(data || 0);
                }
            }
        ],
        order: [[6, 'desc']],
        pageLength: 25,
        language: {
            emptyTable: "No supplier data available"
        }
    });
}

// Load Supplier Performance Data
async function loadSupplierPerformanceData() {
    try {
        showLoader();
        
        const response = await fetchWithAuth(`${API_URL}/analytics/supplier-performance`);
        
        let suppliers = [];
        if (response.ok) {
            suppliers = await response.json();
        }
        
        // Render comparison chart
        renderComparisonChart(suppliers);
        
        // Populate table
        if (supplierPerformanceTable) {
            supplierPerformanceTable.clear();
            supplierPerformanceTable.rows.add(suppliers);
            supplierPerformanceTable.draw();
        }
        
        hideLoader();
    } catch (error) {
        console.error('Error loading supplier performance:', error);
        showNotification('Failed to load supplier performance data', 'error');
        hideLoader();
    }
}

// Render Comparison Chart
function renderComparisonChart(suppliers) {
    const ctx = document.getElementById('supplierComparisonChart');
    if (!ctx || !suppliers || suppliers.length === 0) return;
    
    if (supplierComparisonChart) {
        supplierComparisonChart.destroy();
    }
    
    // Take top 10 suppliers
    const topSuppliers = suppliers.slice(0, 10);
    
    supplierComparisonChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topSuppliers.map(s => s.supplier_name || 'Unknown'),
            datasets: [
                {
                    label: 'On-Time Delivery %',
                    data: topSuppliers.map(s => s.on_time_percentage || 0),
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: '#28a745',
                    borderWidth: 1
                },
                {
                    label: 'Quality Rate %',
                    data: topSuppliers.map(s => s.quality_rate || 0),
                    backgroundColor: 'rgba(74, 144, 226, 0.7)',
                    borderColor: '#4A90E2',
                    borderWidth: 1
                },
                {
                    label: 'Performance Score (×10)',
                    data: topSuppliers.map(s => (s.performance_score || 0) * 10),
                    backgroundColor: 'rgba(255, 193, 7, 0.7)',
                    borderColor: '#ffc107',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (label.includes('Performance Score')) {
                                label += ((context.parsed.x || 0) / 10).toFixed(1) + '/10';
                            } else {
                                label += (context.parsed.x || 0).toFixed(1) + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage / Score'
                    }
                }
            }
        }
    });
}

// Get Performance Bar
function getPerformanceBar(percentage, color) {
    const barColor = {
        'success': '#28a745',
        'primary': '#4A90E2',
        'warning': '#ffc107',
        'danger': '#dc3545'
    };
    
    // Determine actual color based on percentage
    let actualColor = barColor[color];
    if (percentage >= 90) {
        actualColor = barColor.success;
    } else if (percentage >= 70) {
        actualColor = barColor.warning;
    } else if (percentage < 70) {
        actualColor = barColor.danger;
    }
    
    return `
        <div class="d-flex align-items-center">
            <div class="progress flex-grow-1" style="height: 20px;">
                <div class="progress-bar" role="progressbar" 
                     style="width: ${percentage}%; background-color: ${actualColor};"
                     aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            <span class="ms-2 fw-bold">${percentage.toFixed(1)}%</span>
        </div>
    `;
}

// Get Rating Stars
function getRatingStars(rating) {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-warning"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt text-warning"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star text-warning"></i>';
    }
    
    return `<span class="rating-stars">${stars}</span>`;
}

// Export to Excel
function exportToExcel() {
    try {
        showLoader();
        
        const tableData = supplierPerformanceTable ? supplierPerformanceTable.rows().data().toArray() : [];
        
        const excelData = [
            ['Supplier Performance Report'],
            ['Generated on: ' + new Date().toLocaleString()],
            [],
            ['Supplier', 'Total Orders', 'On-Time Delivery %', 'Quality Rate %', 'Avg Lead Time', 'Total Value', 'Performance Score', 'Rating']
        ];
        
        tableData.forEach(supplier => {
            excelData.push([
                supplier.supplier_name || '',
                supplier.total_orders || 0,
                (supplier.on_time_percentage || 0).toFixed(1) + '%',
                (supplier.quality_rate || 0).toFixed(1) + '%',
                (supplier.avg_lead_time || 0) + ' days',
                supplier.total_value || 0,
                (supplier.performance_score || 0).toFixed(1) + '/10',
                (supplier.performance_rating || 0).toFixed(1) + '/5'
            ]);
        });
        
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Supplier Performance");
            XLSX.writeFile(wb, `Supplier_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        doc.text('Supplier Performance Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = supplierPerformanceTable ? supplierPerformanceTable.rows().data().toArray() : [];
        const rows = tableData.map(supplier => [
            (supplier.supplier_name || '').substring(0, 25),
            supplier.total_orders || 0,
            (supplier.on_time_percentage || 0).toFixed(1) + '%',
            (supplier.quality_rate || 0).toFixed(1) + '%',
            supplier.avg_lead_time || 0,
            formatCurrency(supplier.total_value || 0),
            (supplier.performance_score || 0).toFixed(1)
        ]);
        
        if (typeof doc.autoTable !== 'undefined') {
            doc.autoTable({
                startY: 35,
                head: [['Supplier', 'Orders', 'On-Time %', 'Quality %', 'Lead Time', 'Total Value', 'Score']],
                body: rows,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [74, 144, 226] }
            });
        }
        
        doc.save(`Supplier_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoader();
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showNotification('Failed to export PDF', 'error');
        hideLoader();
    }
}

// Utility Functions
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

