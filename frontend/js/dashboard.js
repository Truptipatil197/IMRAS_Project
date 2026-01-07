/**
 * IMRAS Dashboard Module
 * Common functionality for all dashboards
 */

// ============================================
// AUTHENTICATION CHECK
// ============================================
async function checkAuth() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ME}`);
        if (!response.ok) throw new Error('Invalid token');
        
        const data = await response.json();
        if (data.success && data.data) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.data));
            return data.data;
        }
        throw new Error('Invalid response');
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.clear();
        window.location.href = '../index.html';
        return false;
    }
}

// ============================================
// FETCH WITH AUTH
// ============================================
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return fetch(url, options);
}

// ============================================
// LOAD USER INFO
// ============================================
function loadUserInfo() {
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    try {
        const user = JSON.parse(userStr);
        // Display in navbar
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName');
        userNameElements.forEach(el => {
            if (el) el.textContent = user.full_name || user.username;
        });
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = user.role || '-';
        }
        
        return user;
    } catch (error) {
        console.error('Error loading user info:', error);
        return null;
    }
}

// ============================================
// LOGOUT
// ============================================
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        if (token) {
            try {
                await fetchWithAuth(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.LOGOUT}`, {
                    method: 'POST'
                });
            } catch (error) {
                console.warn('Logout API call failed:', error);
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuthData();
        window.location.href = '../index.html';
    }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    
    // Save preference
    const collapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebar_collapsed', collapsed);
}

function toggleSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

// ============================================
// LOAD SIDEBAR PREFERENCE
// ============================================
function loadSidebarPreference() {
    const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const sidebar = document.getElementById('sidebar');
    if (sidebar && collapsed && window.innerWidth >= 992) {
        sidebar.classList.add('collapsed');
    }
}

// ============================================
// HIGHLIGHT ACTIVE MENU
// ============================================
function highlightActivePage() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuLinks = document.querySelectorAll('.sidebar .nav-link');
    
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ============================================
// FORMAT UTILITIES
// ============================================
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat().format(num);
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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

function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

// ============================================
// SHOW LOADING
// ============================================
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3">Loading...</p>
            </div>
        `;
    }
}

// ============================================
// SHOW ERROR
// ============================================
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message || 'An error occurred. Please try again.'}
            </div>
        `;
    }
}

// ============================================
// SHOW EMPTY STATE
// ============================================
function showEmptyState(elementId, message, icon = 'fa-inbox') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas ${icon}"></i>
                <h5>No Data Available</h5>
                <p>${message || 'There is no data to display at this time.'}</p>
            </div>
        `;
    }
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(url) {
    window.location.href = url;
}

// ============================================
// CLEAR AUTH DATA
// ============================================
function clearAuthData() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
}

// ============================================
// GET STORED USER
// ============================================
function getStoredUser() {
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}

// ============================================
// INITIALIZE COMMON FEATURES
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = await checkAuth();
    if (!user) return;
    
    // Load user info
    loadUserInfo();
    
    // Load sidebar preference
    loadSidebarPreference();
    
    // Setup event listeners
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebarMobile);
    }
    
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', toggleSidebar);
    }
    
    // Highlight active page
    highlightActivePage();
    
    // Setup global search
    setupGlobalSearch();
    
    // Load notifications
    loadNotifications();
    setInterval(loadNotifications, 30000); // Refresh every 30 seconds
    
    // Setup role-based dashboard navigation
    setupDashboardNavigation();
});

/**
 * Setup role-based dashboard navigation
 * Ensure users are redirected to correct dashboard based on role
 */
function setupDashboardNavigation() {
    // Handle main dashboard link clicks (do not intercept reports dashboard links)
    const dashboardLinks = document.querySelectorAll(
        '.sidebar a[href="admin-dashboard.html"], ' +
        '.sidebar a[href="manager-dashboard.html"], ' +
        '.sidebar a[href="staff-dashboard.html"]'
    );
    
    dashboardLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const user = getStoredUser();
            if (!user) {
                window.location.href = '../index.html';
                return;
            }
            
            const role = user.role;
            let correctDashboard;
            
            if (role === 'Admin') {
                correctDashboard = 'admin-dashboard.html';
            } else if (role === 'Manager') {
                correctDashboard = 'manager-dashboard.html';
            } else if (role === 'Staff') {
                correctDashboard = 'staff-dashboard.html';
            } else {
                correctDashboard = 'admin-dashboard.html'; // Default
            }
            
            window.location.href = correctDashboard;
        });
    });
    
    // Check if user is on wrong dashboard and redirect
    // Only redirect if on one of the main dashboard pages (not reports-dashboard or other pages)
    const user = getStoredUser();
    if (user) {
        const currentPage = window.location.pathname.split('/').pop();
        const role = user.role;
        
        // Only check main dashboard pages, not reports-dashboard or other pages
        const mainDashboardPages = ['admin-dashboard.html', 'manager-dashboard.html', 'staff-dashboard.html'];
        const isOnMainDashboard = mainDashboardPages.includes(currentPage);
        
        if (!isOnMainDashboard) {
            // Not on a main dashboard page, don't redirect
            return;
        }
        
        let correctDashboard;
        if (role === 'Admin') {
            correctDashboard = 'admin-dashboard.html';
        } else if (role === 'Manager') {
            correctDashboard = 'manager-dashboard.html';
        } else if (role === 'Staff') {
            correctDashboard = 'staff-dashboard.html';
        }
        
        // If on a main dashboard page but wrong one, redirect
        if (correctDashboard && currentPage !== correctDashboard) {
            console.log(`Redirecting from ${currentPage} to ${correctDashboard} for role ${role}`);
            window.location.href = correctDashboard;
        }
    }
}

/**
 * Setup global search functionality
 */
function setupGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;
    
    let searchTimeout;
    
    // Search on Enter key
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                await performGlobalSearch(query);
            }
        }
    });
    
    // Optional: Search on input with debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                performGlobalSearch(query);
            }, 500);
        }
    });
}

/**
 * Perform global search
 */
async function performGlobalSearch(query) {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Search failed');
        }
        
        if (!data.results || data.results.length === 0) {
            if (window.Notify) {
                window.Notify.info('No results found for: ' + query);
            } else {
                alert('No results found');
            }
            return;
        }
        
        // Display search results in modal
        displaySearchResults(data.results, data.grouped || {});
        
    } catch (error) {
        console.error('Search error:', error);
        if (window.Notify) {
            window.Notify.error('Search failed. Please try again.');
        } else {
            alert('Search failed. Please try again.');
        }
    }
}

/**
 * Display search results in modal
 */
function displaySearchResults(results, grouped) {
    // Remove existing modal if present
    const existingModal = document.getElementById('searchResultsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Group results by type
    const groups = Object.keys(grouped).length > 0 ? grouped : results.reduce((acc, item) => {
        if (!acc[item.type]) {
            acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
    }, {});
    
    let html = '<div class="search-results-container">';
    
    for (const [type, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        
        html += `<h6 class="mt-3 mb-2"><strong>${type}</strong> (${items.length})</h6>`;
        html += '<div class="list-group mb-3">';
        
        items.forEach(item => {
            html += `
                <a href="${item.url}" class="list-group-item list-group-item-action">
                    <div class="d-flex align-items-center">
                        <i class="fas ${item.icon || 'fa-circle'} me-3 text-primary"></i>
                        <div class="flex-grow-1">
                            <strong>${item.title}</strong>
                            ${item.subtitle ? `<div class="text-muted small">${item.subtitle}</div>` : ''}
                        </div>
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                </a>
            `;
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    
    // Create modal
    const modalHTML = `
        <div class="modal fade" id="searchResultsModal" tabindex="-1" aria-labelledby="searchResultsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="searchResultsModalLabel">
                            <i class="fas fa-search me-2"></i>Search Results
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${html}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modalElement = document.getElementById('searchResultsModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Cleanup when modal is hidden
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });
}

/**
 * Load notifications count
 */
async function loadNotifications() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/alerts?limit=1`);
        
        if (!response.ok) {
            return;
        }
        
        const data = await response.json();
        const payload = data.data || data || {};
        const count = payload.unread_count || 0;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

/**
 * Load and display notifications dropdown
 */
async function loadNotificationsDropdown() {
    try {
        const response = await fetchWithAuth(`${CONFIG.API_BASE_URL}/api/reorder/alerts?limit=10`);
        
        if (!response.ok) {
            return;
        }
        
        const data = await response.json();
        const payload = data.data || data || {};
        const alerts = payload.alerts || [];
        
        // Find the dropdown menu (it's the ul element after the notificationDropdown link)
        const dropdownLink = document.getElementById('notificationDropdown');
        if (!dropdownLink) return;
        
        const dropdown = dropdownLink.nextElementSibling || 
                        document.querySelector('[aria-labelledby="notificationDropdown"]') ||
                        document.querySelector('.notification-dropdown');
        if (!dropdown) return;
        
        let html = '<li><h6 class="dropdown-header">Notifications</h6></li>';
        
        if (alerts.length === 0) {
            html += '<li><a class="dropdown-item text-muted">No new notifications</a></li>';
        } else {
            alerts.slice(0, 10).forEach(alert => {
                const item = alert.item || {};
                const icon = alert.severity === 'Critical' ? 'fa-exclamation-circle text-danger' : 
                           alert.severity === 'High' ? 'fa-exclamation-triangle text-warning' :
                           'fa-info-circle text-info';
                
                html += `
                    <li>
                        <a class="dropdown-item ${alert.is_read ? '' : 'fw-bold'}" href="reorder-alert-report.html?alert_id=${alert.alert_id}">
                            <i class="fas ${icon} me-2"></i>
                            <div>
                                <div>${item.item_name || 'Alert'}</div>
                                <small class="text-muted">${alert.message || ''}</small>
                            </div>
                        </a>
                    </li>
                `;
            });
        }
        
        html += '<li><hr class="dropdown-divider"></li>';
        html += '<li><a class="dropdown-item text-center" href="reorder-alert-report.html">View All Notifications</a></li>';
        
        dropdown.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load notifications dropdown:', error);
    }
}

// Setup notification dropdown - use Bootstrap dropdown event
document.addEventListener('DOMContentLoaded', () => {
    // Use Bootstrap dropdown shown event to load notifications when dropdown opens
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationDropdown) {
        // Get the dropdown menu element
        const dropdownMenu = notificationDropdown.nextElementSibling || 
                           document.querySelector('[aria-labelledby="notificationDropdown"]');
        
        if (dropdownMenu) {
            dropdownMenu.addEventListener('show.bs.dropdown', async () => {
                await loadNotificationsDropdown();
            });
        }
    }
});

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.dashboardModule = {
        fetchWithAuth,
        getStoredUser,
        clearAuthData,
        navigateTo,
        formatNumber,
        formatCurrency,
        formatDate,
        formatDateTime,
        formatRelativeTime,
        showLoading,
        showError,
        showEmptyState
    };
}
