/**
 * IMRAS - Toast Notification System
 * 
 * Beautiful toast notification system with:
 * - Multiple notification types (success, error, warning, info, loading)
 * - Auto-dismiss with progress bar
 * - Manual dismiss
 * - Stack management
 * - Position configuration
 * - Confirmation dialogs
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxVisible = 3;
        this.defaultDuration = 5000; // 5 seconds
        this.position = 'top-right';
        this.init();
    }

    /**
     * Initialize notification container
     */
    init() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            this.container.setAttribute('id', 'notification-container');
            document.body.appendChild(this.container);
        }
    }

    /**
     * Set notification position
     */
    setPosition(position) {
        this.position = position;
        if (this.container) {
            // Remove old position classes
            this.container.classList.remove('top-right', 'top-center', 'bottom-right', 'bottom-center', 'top-left', 'bottom-left');
            this.container.classList.add(position);
        }
    }

    /**
     * Show success notification
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     */
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    /**
     * Show warning notification
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show loading notification
     */
    loading(message, id = null) {
        const notificationId = id || `loading-${Date.now()}-${Math.random()}`;
        return this.show(message, 'loading', {
            id: notificationId,
            duration: 0, // No auto-dismiss
            persistent: true
        });
    }

    /**
     * Update loading notification message
     */
    updateLoading(id, message) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && notification.element) {
            const messageEl = notification.element.querySelector('.toast-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    /**
     * Dismiss loading notification and optionally show final message
     */
    dismissLoading(id, finalMessage = null, type = 'success') {
        if (finalMessage) {
            // Replace loading notification with final message
            this.dismiss(id);
            setTimeout(() => {
                this.show(finalMessage, type);
            }, 100);
        } else {
            this.dismiss(id);
        }
    }

    /**
     * Show notification
     */
    show(message, type = 'info', options = {}) {
        // Ensure container exists
        this.init();

        // Set position
        if (!this.container.classList.contains(this.position)) {
            this.container.classList.add(this.position);
        }

        const id = options.id || `${type}-${Date.now()}-${Math.random()}`;
        const duration = options.persistent ? 0 : (options.duration || this.defaultDuration);
        const title = options.title || null;
        const actions = options.actions || null;

        // Create toast element
        const toast = this.createToastElement(message, type, {
            id,
            title,
            duration,
            actions,
            persistent: options.persistent
        });

        // Add to container
        this.container.appendChild(toast);

        // Store notification
        const notification = {
            id,
            type,
            element: toast,
            timer: null
        };
        this.notifications.push(notification);

        // Animate in
        this.animateIn(toast);

        // Handle max visible
        this.handleMaxVisible();

        // Auto dismiss
        if (duration > 0) {
            notification.timer = this.startAutoDismiss(toast, duration, id);
        }

        // Return notification ID for manual dismissal
        return id;
    }

    /**
     * Create toast element
     */
    createToastElement(message, type, options) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('data-id', options.id);
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Get icon based on type
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            loading: '<i class="fas fa-spinner fa-spin"></i>'
        };

        // Build content
        let content = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                ${options.title ? `<div class="toast-title">${options.title}</div>` : ''}
                <div class="toast-message">${message}</div>
                ${options.actions ? `<div class="toast-actions">${this.createActionButtons(options.actions, options.id)}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Close" onclick="Notify.dismiss('${options.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        toast.innerHTML = content;

        // Add progress bar if not persistent
        if (!options.persistent && options.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-progress';
            progressBar.style.animationDuration = `${options.duration}ms`;
            toast.appendChild(progressBar);
        }

        // Click to dismiss
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.toast-close') || e.target.closest('.toast-actions')) {
                return; // Let close button or actions handle it
            }
            if (options.clickToDismiss !== false) {
                this.dismiss(options.id);
            }
        });

        return toast;
    }

    /**
     * Create action buttons
     */
    createActionButtons(actions, notificationId) {
        let buttons = '';
        actions.forEach(action => {
            buttons += `
                <button class="toast-action-btn ${action.class || ''}" 
                        onclick="Notify.handleAction('${notificationId}', '${action.id}')">
                    ${action.label}
                </button>
            `;
        });
        return buttons;
    }

    /**
     * Handle action button click
     */
    handleAction(notificationId, actionId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            const action = notification.element.querySelector(`[onclick*="'${actionId}'"]`)?.closest('.toast-action-btn');
            if (action && notification.onAction) {
                notification.onAction(actionId);
            }
        }
    }

    /**
     * Start auto-dismiss timer
     */
    startAutoDismiss(element, duration, id) {
        return setTimeout(() => {
            this.dismiss(id);
        }, duration);
    }

    /**
     * Animate toast in
     */
    animateIn(element) {
        // Force reflow
        element.offsetHeight;
        element.classList.add('show');
    }

    /**
     * Animate toast out
     */
    animateOut(element, callback) {
        element.classList.add('hide');
        element.classList.remove('show');
        
        setTimeout(() => {
            if (callback) callback();
        }, 300); // Match CSS animation duration
    }

    /**
     * Handle max visible notifications
     */
    handleMaxVisible() {
        const visibleNotifications = this.notifications.filter(n => 
            n.element && n.element.parentNode
        );

        if (visibleNotifications.length > this.maxVisible) {
            // Remove oldest notifications
            const toRemove = visibleNotifications.slice(0, visibleNotifications.length - this.maxVisible);
            toRemove.forEach(notification => {
                this.dismiss(notification.id);
            });
        }
    }

    /**
     * Dismiss notification
     */
    dismiss(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;

        const notification = this.notifications[index];
        
        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Animate out and remove
        if (notification.element && notification.element.parentNode) {
            this.animateOut(notification.element, () => {
                notification.element.remove();
            });
        }

        // Remove from array
        this.notifications.splice(index, 1);
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        const ids = this.notifications.map(n => n.id);
        ids.forEach(id => this.dismiss(id));
    }

    /**
     * Show confirmation dialog
     */
    async confirm(message, options = {}) {
        return new Promise((resolve, reject) => {
            const id = `confirm-${Date.now()}`;
            const title = options.title || 'Confirm Action';
            const confirmText = options.confirmText || 'Yes';
            const cancelText = options.cancelText || 'No';
            const confirmClass = options.confirmClass || 'btn-primary';
            const cancelClass = options.cancelClass || 'btn-secondary';

            // Create modal-style confirmation
            const modal = document.createElement('div');
            modal.className = 'notification-modal-overlay';
            modal.setAttribute('data-id', id);

            modal.innerHTML = `
                <div class="notification-modal">
                    <div class="notification-modal-header">
                        <h5 class="notification-modal-title">${title}</h5>
                        <button class="notification-modal-close" onclick="Notify.dismissConfirm('${id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="notification-modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="notification-modal-footer">
                        <button class="btn ${cancelClass}" onclick="Notify.dismissConfirm('${id}', false)">
                            ${cancelText}
                        </button>
                        <button class="btn ${confirmClass}" onclick="Notify.dismissConfirm('${id}', true)">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Animate in
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);

            // Store resolve/reject
            modal._resolve = resolve;
            modal._reject = reject;

            // Store modal reference
            this.confirmModals = this.confirmModals || new Map();
            this.confirmModals.set(id, modal);
        });
    }

    /**
     * Dismiss confirmation dialog
     */
    dismissConfirm(id, result = false) {
        const modal = this.confirmModals?.get(id);
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            this.confirmModals?.delete(id);

            if (result) {
                modal._resolve(true);
            } else {
                modal._reject(false);
            }
        }, 300);
    }
}

// Create global instance
const Notify = new NotificationSystem();

// Make available globally
if (typeof window !== 'undefined') {
    window.Notify = Notify;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}

