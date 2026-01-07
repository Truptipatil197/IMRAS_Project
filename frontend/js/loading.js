/**
 * IMRAS - Loading State Manager
 * 
 * Manages loading indicators for different scenarios:
 * - Full-page loader (initial page load)
 * - Section loader (loading part of page)
 * - Button loader (during form submission)
 * - Skeleton loaders (for content that's loading)
 * - Inline spinners (small indicators)
 */

class LoadingManager {
    constructor() {
        this.loaders = new Map();
        this.skeletonIdCounter = 0;
    }

    /**
     * Show full-page loader
     */
    showPageLoader(message = 'Loading...') {
        // Remove existing loader if any
        this.hidePageLoader();

        const overlay = document.createElement('div');
        overlay.id = 'page-loader';
        overlay.className = 'page-loader-overlay';

        overlay.innerHTML = `
            <div class="page-loader">
                <div class="spinner"></div>
                <p class="loader-message">${message}</p>
            </div>
        `;

        document.body.appendChild(overlay);
        this.loaders.set('page-loader', overlay);

        // Animate in
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
    }

    /**
     * Hide full-page loader
     */
    hidePageLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.remove('show');
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.remove();
                this.loaders.delete('page-loader');
            }, 300);
        }
    }

    /**
     * Show section loader
     */
    showSectionLoader(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID "${elementId}" not found`);
            return;
        }

        // Remove existing loader if any
        this.hideSectionLoader(elementId);

        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }

        const loaderId = `section-loader-${elementId}`;
        const loader = document.createElement('div');
        loader.id = loaderId;
        loader.className = 'section-loader';
        loader.innerHTML = `
            <div class="section-loader-content">
                <div class="spinner spinner-sm"></div>
                <p class="loader-message">${message}</p>
            </div>
        `;

        element.style.position = 'relative';
        element.style.minHeight = '200px';
        element.appendChild(loader);
        this.loaders.set(loaderId, { element, loader });
    }

    /**
     * Hide section loader
     */
    hideSectionLoader(elementId) {
        const loaderId = `section-loader-${elementId}`;
        const loaderData = this.loaders.get(loaderId);
        
        if (loaderData && loaderData.loader) {
            loaderData.loader.classList.add('fade-out');
            setTimeout(() => {
                loaderData.loader.remove();
                this.loaders.delete(loaderId);
            }, 300);
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(buttonElement, isLoading = true, loadingText = 'Loading...') {
        if (!buttonElement) return;

        if (isLoading) {
            // Store original state
            if (!buttonElement.dataset.originalText) {
                buttonElement.dataset.originalText = buttonElement.innerHTML;
            }
            if (!buttonElement.dataset.originalDisabled) {
                buttonElement.dataset.originalDisabled = buttonElement.disabled;
            }

            // Set loading state
            buttonElement.disabled = true;
            buttonElement.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ${loadingText}
            `;
            buttonElement.classList.add('loading');
        } else {
            // Restore original state
            if (buttonElement.dataset.originalText) {
                buttonElement.innerHTML = buttonElement.dataset.originalText;
                delete buttonElement.dataset.originalText;
            }
            if (buttonElement.dataset.originalDisabled !== undefined) {
                buttonElement.disabled = buttonElement.dataset.originalDisabled === 'true';
                delete buttonElement.dataset.originalDisabled;
            } else {
                buttonElement.disabled = false;
            }
            buttonElement.classList.remove('loading');
        }
    }

    /**
     * Get skeleton row for table
     */
    getSkeletonRow(columns, rows = 1) {
        let html = '';
        for (let r = 0; r < rows; r++) {
            html += '<tr class="skeleton-row">';
            for (let i = 0; i < columns; i++) {
                html += '<td><div class="skeleton-box"></div></td>';
            }
            html += '</tr>';
        }
        return html;
    }

    /**
     * Get skeleton card
     */
    getSkeletonCard(options = {}) {
        const titleWidth = options.titleWidth || '60%';
        const textWidth = options.textWidth || '40%';
        const lines = options.lines || 2;

        let textLines = '';
        for (let i = 0; i < lines; i++) {
            textLines += `<div class="skeleton-box mb-2" style="width: ${textWidth};"></div>`;
        }

        return `
            <div class="card skeleton-card">
                <div class="card-body">
                    <div class="skeleton-box mb-3" style="width: ${titleWidth}; height: 24px;"></div>
                    ${textLines}
                </div>
            </div>
        `;
    }

    /**
     * Get skeleton list item
     */
    getSkeletonListItem() {
        return `
            <div class="skeleton-list-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton-box mb-2" style="width: 60%;"></div>
                    <div class="skeleton-box" style="width: 40%;"></div>
                </div>
            </div>
        `;
    }

    /**
     * Show inline spinner
     */
    showInlineSpinner(elementId, message = '') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID "${elementId}" not found`);
            return;
        }

        const spinnerId = `inline-spinner-${elementId}`;
        const spinner = document.createElement('div');
        spinner.id = spinnerId;
        spinner.className = 'inline-spinner';
        spinner.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${message}
        `;

        element.appendChild(spinner);
        this.loaders.set(spinnerId, spinner);
    }

    /**
     * Hide inline spinner
     */
    hideInlineSpinner(elementId) {
        const spinnerId = `inline-spinner-${elementId}`;
        const spinner = this.loaders.get(spinnerId);
        
        if (spinner) {
            spinner.remove();
            this.loaders.delete(spinnerId);
        }
    }

    /**
     * Show table skeleton loader
     */
    showTableSkeleton(tableId, columns, rows = 5) {
        const table = document.getElementById(tableId);
        if (!table) {
            console.warn(`Table with ID "${tableId}" not found`);
            return;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.warn(`Table tbody not found in "${tableId}"`);
            return;
        }

        // Store original content
        if (!tbody.dataset.originalContent) {
            tbody.dataset.originalContent = tbody.innerHTML;
        }

        tbody.innerHTML = this.getSkeletonRow(columns, rows);
        this.loaders.set(`table-skeleton-${tableId}`, { tbody, columns, rows });
    }

    /**
     * Hide table skeleton loader
     */
    hideTableSkeleton(tableId) {
        const loaderData = this.loaders.get(`table-skeleton-${tableId}`);
        
        if (loaderData && loaderData.tbody) {
            if (loaderData.tbody.dataset.originalContent) {
                loaderData.tbody.innerHTML = loaderData.tbody.dataset.originalContent;
                delete loaderData.tbody.dataset.originalContent;
            } else {
                loaderData.tbody.innerHTML = '';
            }
            this.loaders.delete(`table-skeleton-${tableId}`);
        }
    }

    /**
     * Show card skeleton loader
     */
    showCardSkeleton(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container with ID "${containerId}" not found`);
            return;
        }

        // Store original content
        if (!container.dataset.originalContent) {
            container.dataset.originalContent = container.innerHTML;
        }

        let html = '';
        for (let i = 0; i < count; i++) {
            html += this.getSkeletonCard();
        }
        container.innerHTML = html;
        this.loaders.set(`card-skeleton-${containerId}`, { container, count });
    }

    /**
     * Hide card skeleton loader
     */
    hideCardSkeleton(containerId) {
        const loaderData = this.loaders.get(`card-skeleton-${containerId}`);
        
        if (loaderData && loaderData.container) {
            if (loaderData.container.dataset.originalContent) {
                loaderData.container.innerHTML = loaderData.container.dataset.originalContent;
                delete loaderData.container.dataset.originalContent;
            } else {
                loaderData.container.innerHTML = '';
            }
            this.loaders.delete(`card-skeleton-${containerId}`);
        }
    }

    /**
     * Clear all loaders
     */
    clearAll() {
        // Hide page loader
        this.hidePageLoader();

        // Hide all section loaders
        for (const [id, data] of this.loaders.entries()) {
            if (id.startsWith('section-loader-')) {
                const elementId = id.replace('section-loader-', '');
                this.hideSectionLoader(elementId);
            } else if (id.startsWith('inline-spinner-')) {
                const elementId = id.replace('inline-spinner-', '');
                this.hideInlineSpinner(elementId);
            } else if (id.startsWith('table-skeleton-')) {
                const tableId = id.replace('table-skeleton-', '');
                this.hideTableSkeleton(tableId);
            } else if (id.startsWith('card-skeleton-')) {
                const containerId = id.replace('card-skeleton-', '');
                this.hideCardSkeleton(containerId);
            }
        }

        this.loaders.clear();
    }
}

// Create global instance
const Loading = new LoadingManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.Loading = Loading;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}

