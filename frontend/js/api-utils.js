/**
 * IMRAS - Centralized API Utility Functions
 * 
 * Provides unified fetch wrapper with:
 * - Automatic JWT token injection
 * - Request/response interceptors
 * - Error handling
 * - Loading state management
 * - Timeout handling (30 seconds)
 * - Retry logic for failed requests
 * - Response status validation
 */

class APIUtils {
    constructor() {
        this.baseURL = CONFIG?.API_BASE_URL || 'http://localhost:5000';
        this.timeout = 30000; // 30 seconds
        this.retryCount = 3;
        this.retryDelay = 1000; // Initial delay in ms
        this.requestQueue = [];
        this.isRefreshing = false;
        this.cache = new Map();
        this.cacheTimeout = 10 * 1000; // 10 seconds for safe UI responsiveness
        this.pendingRequests = new Map(); // For request deduplication
        this.devMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    /**
     * Get JWT token from localStorage
     */
    getToken() {
        return localStorage.getItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'imras_token');
    }

    /**
     * Set JWT token in localStorage
     */
    setToken(token) {
        if (token) {
            localStorage.setItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'imras_token', token);
        } else {
            this.clearToken();
        }
    }

    /**
     * Clear JWT token from localStorage
     */
    clearToken() {
        localStorage.removeItem(CONFIG?.STORAGE_KEYS?.TOKEN || 'imras_token');
        localStorage.removeItem(CONFIG?.STORAGE_KEYS?.USER || 'imras_user');
    }

    /**
     * Check if token is expired
     */
    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= exp;
        } catch (error) {
            console.error('Error parsing token:', error);
            return true;
        }
    }

    /**
     * Refresh JWT token
     */
    async refreshToken() {
        if (this.isRefreshing) {
            // Wait for ongoing refresh
            return new Promise((resolve) => {
                const checkRefresh = setInterval(() => {
                    if (!this.isRefreshing) {
                        clearInterval(checkRefresh);
                        resolve();
                    }
                }, 100);
            });
        }

        this.isRefreshing = true;

        try {
            const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: this.getToken() }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    this.setToken(data.token);
                    this.isRefreshing = false;
                    return true;
                }
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        this.isRefreshing = false;
        return false;
    }

    /**
     * Create AbortController for timeout
     */
    createTimeoutController(timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        return { controller, timeoutId };
    }

    /**
     * Generate cache key from endpoint and params
     */
    getCacheKey(endpoint, params) {
        return `${endpoint}?${new URLSearchParams(params).toString()}`;
    }

    /**
     * Check if cached response is still valid
     */
    getCachedResponse(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(cacheKey);
        return null;
    }

    /**
     * Store response in cache
     */
    setCachedResponse(cacheKey, data) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Generate request signature for deduplication
     */
    getRequestSignature(endpoint, options) {
        return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}`;
    }

    /**
     * Main fetch wrapper with all features
     */
    async request(endpoint, options = {}) {
        const method = options.method || 'GET';
        const isGet = method === 'GET';
        const params = options.params || {};

        // Build full URL
        let url = `${this.baseURL}${endpoint}`;
        if (isGet && Object.keys(params).length > 0) {
            url += `?${new URLSearchParams(params).toString()}`;
        }

        // Check cache for GET requests
        if (isGet && options.useCache !== false) {
            const cacheKey = this.getCacheKey(endpoint, params);
            const cached = this.getCachedResponse(cacheKey);
            if (cached) {
                if (this.devMode) console.log('📦 Cache hit:', endpoint);
                return cached;
            }
        }

        // Check for duplicate requests
        const requestSignature = this.getRequestSignature(endpoint, options);
        if (this.pendingRequests.has(requestSignature)) {
            if (this.devMode) console.log('🔄 Deduplicating request:', endpoint);
            return this.pendingRequests.get(requestSignature);
        }

        // Create request promise
        const requestPromise = this._executeRequest(url, endpoint, options, isGet);

        // Store for deduplication
        this.pendingRequests.set(requestSignature, requestPromise);

        // Clean up after request completes
        requestPromise.finally(() => {
            this.pendingRequests.delete(requestSignature);
        });

        return requestPromise;
    }

    /**
     * Execute the actual request with retry logic
     */
    async _executeRequest(url, endpoint, options, isGet, retryAttempt = 0) {
        const method = options.method || 'GET';
        const token = this.getToken();

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add authorization header if token exists
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Prepare request body
        let body = options.body;
        if (body && typeof body === 'object' && !(body instanceof FormData)) {
            body = JSON.stringify(body);
        }

        // Create timeout controller
        const { controller, timeoutId } = this.createTimeoutController(this.timeout);

        try {
            // Log request in dev mode
            if (this.devMode) {
                console.log(`🚀 ${method} ${endpoint}`, options.body || '');
            }

            // Make request
            const response = await fetch(url, {
                method,
                headers,
                body,
                signal: controller.signal,
                ...options.fetchOptions
            });

            clearTimeout(timeoutId);

            // Handle token refresh on 401
            if (response.status === 401 && retryAttempt === 0) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    return this._executeRequest(url, endpoint, options, isGet, retryAttempt + 1);
                } else {
                    // Refresh failed, redirect to login
                    this.handleError({ status: 401, message: 'Session expired' }, endpoint);
                    throw new Error('Session expired. Please login again.');
                }
            }

            // Parse response
            const parsedResponse = await this.parseResponse(response);

            // Cache GET responses
            if (isGet && options.useCache !== false && response.ok) {
                const cacheKey = this.getCacheKey(endpoint, options.params || {});
                this.setCachedResponse(cacheKey, parsedResponse);
            }

            // Log response in dev mode
            if (this.devMode) {
                console.log(`✅ ${method} ${endpoint}`, parsedResponse);
            }

            return parsedResponse;

        } catch (error) {
            clearTimeout(timeoutId);

            // Handle abort (timeout)
            if (error.name === 'AbortError') {
                const timeoutError = {
                    status: 408,
                    message: 'Request timeout. Please try again.',
                    isTimeout: true
                };
                this.handleError(timeoutError, endpoint);
                throw timeoutError;
            }

            // Retry logic for network errors or 5xx errors
            if (retryAttempt < this.retryCount) {
                const isRetryable = !error.status || (error.status >= 500 && error.status < 600);

                if (isRetryable) {
                    const delay = this.retryDelay * Math.pow(2, retryAttempt); // Exponential backoff
                    if (this.devMode) {
                        console.log(`🔄 Retrying ${endpoint} (attempt ${retryAttempt + 1}/${this.retryCount}) after ${delay}ms`);
                    }

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this._executeRequest(url, endpoint, options, isGet, retryAttempt + 1);
                }
            }

            // Handle error
            const errorObj = {
                status: error.status || 0,
                message: error.message || 'Network error occurred',
                ...error
            };

            this.handleError(errorObj, endpoint);
            throw errorObj;

        } finally {
            // Clear loading state if callback provided
            if (options.onComplete) {
                options.onComplete();
            }
        }
    }

    /**
     * Parse response based on content type
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';

        // Handle empty responses
        if (response.status === 204 || response.status === 205) {
            return { success: true, message: 'Operation completed' };
        }

        // Handle blob responses (file downloads)
        if (contentType.includes('application/octet-stream') ||
            contentType.includes('application/pdf') ||
            contentType.includes('application/vnd.openxmlformats-officedocument')) {
            const blob = await response.blob();
            return { success: true, blob, filename: this.extractFilename(response) };
        }

        // Handle JSON responses
        try {
            const text = await response.text();
            if (!text) {
                return { success: response.ok, status: response.status };
            }
            const json = JSON.parse(text);

            // Add status to response
            if (!json.status) {
                json.status = response.status;
            }
            json.success = response.ok;

            return json;
        } catch (error) {
            console.error('Error parsing response:', error);
            return {
                success: false,
                status: response.status,
                message: 'Invalid response format',
                error: error.message
            };
        }
    }

    /**
     * Extract filename from Content-Disposition header
     */
    extractFilename(response) {
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                return filenameMatch[1].replace(/['"]/g, '');
            }
        }
        return 'download';
    }

    /**
     * Handle errors with user-friendly messages
     */
    handleError(error, endpoint) {
        const status = error.status || 0;
        let message = error.message || 'An error occurred';
        let userMessage = message;

        // Network errors
        if (status === 0 || error.isTimeout) {
            userMessage = 'Cannot connect to server. Please check your internet connection.';
            if (this.devMode) {
                console.error('🌐 Network Error:', endpoint, error);
            }
        }
        // Authentication errors
        else if (status === 401) {
            userMessage = 'Your session has expired. Please login again.';
            this.clearToken();
            // Redirect to login after a delay
            setTimeout(() => {
                if (window.location.pathname !== '/index.html' && !window.location.pathname.includes('index.html')) {
                    window.location.href = 'index.html';
                }
            }, 2000);
        }
        // Authorization errors
        else if (status === 403) {
            userMessage = 'You do not have permission to perform this action.';
        }
        // Validation errors
        else if (status === 400) {
            userMessage = error.message || 'Invalid request. Please check your input.';
        }
        // Not found
        else if (status === 404) {
            userMessage = 'The requested resource was not found.';
        }
        // Server errors
        else if (status >= 500) {
            userMessage = 'Server error occurred. Please try again later.';
        }

        // Log error in dev mode
        if (this.devMode) {
            console.error(`❌ Error [${status}] ${endpoint}:`, error);
        }

        // Show notification if Notify is available
        if (window.Notify) {
            window.Notify.error(userMessage, {
                duration: status === 401 ? 5000 : 4000
            });
        } else {
            // Fallback to alert if Notify not loaded
            console.error('Error:', userMessage);
        }

        return {
            success: false,
            status,
            message: userMessage,
            originalError: error
        };
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}, options = {}) {
        return this.request(endpoint, {
            method: 'GET',
            params,
            ...options
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data,
            ...options
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data,
            ...options
        });
    }

    /**
     * PATCH request
     */
    async patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: data,
            ...options
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    /**
     * File upload with progress tracking
     */
    async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        // Append additional data
        for (const [key, value] of Object.entries(additionalData)) {
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        }

        const token = this.getToken();
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Don't set Content-Type for FormData - browser will set it with boundary

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        resolve({ success: true, message: 'File uploaded successfully' });
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject({ status: xhr.status, ...error });
                    } catch (e) {
                        reject({ status: xhr.status, message: 'Upload failed' });
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject({ status: 0, message: 'Network error during upload' });
            });

            xhr.addEventListener('abort', () => {
                reject({ status: 0, message: 'Upload cancelled' });
            });

            xhr.open('POST', `${this.baseURL}${endpoint}`);

            // Set headers
            for (const [key, value] of Object.entries(headers)) {
                xhr.setRequestHeader(key, value);
            }

            xhr.send(formData);
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        if (this.devMode) {
            console.log('🗑️ Cache cleared');
        }
    }

    /**
     * Clear cache for specific endpoint
     */
    clearCacheFor(endpoint, params = {}) {
        const cacheKey = this.getCacheKey(endpoint, params);
        this.cache.delete(cacheKey);
    }
}

// Create global instance
const API = new APIUtils();

// Make available globally
if (typeof window !== 'undefined') {
    window.API = API;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIUtils;
}

