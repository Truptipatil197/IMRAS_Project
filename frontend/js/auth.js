/**
 * IMRAS Authentication Module
 * Handles login, token management, and role-based routing
 */

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Ensure CONFIG is loaded
        if (typeof CONFIG === 'undefined') {
            console.error('CONFIG is not defined. Make sure config.js is loaded before auth.js');
            // Still set up event listeners even if CONFIG is missing
            setupEventListeners();
            showError('Configuration error. Please refresh the page.');
            return;
        }

        console.log('Auth module initialized');
        console.log('CONFIG:', CONFIG);
        
        // Check existing login (don't let errors here prevent event listeners)
        try {
            checkExistingLogin();
        } catch (error) {
            console.error('Error in checkExistingLogin:', error);
        }
        
        // Always set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing auth module:', error);
        // Still try to set up event listeners
        setupEventListeners();
        showError('Initialization error. Please check the console.');
    }
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found, attaching submit listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found!');
    }

    // Also attach click handler to button as fallback
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        console.log('Login button found, attaching click listener');
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Login button clicked');
            // Call handleLogin directly
            handleLogin(e);
        });
    } else {
        console.error('Login button not found!');
    }

    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }

    // Enter key support for form submission
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {
            const form = document.getElementById('loginForm');
            if (form && form.checkValidity()) {
                handleLogin(e);
            }
        }
    });

    // Forgot password link
    const forgotPassword = document.getElementById('forgotPassword');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showError('Forgot password feature coming soon. Please contact your administrator.');
        });
    }
}

// ============================================
// CHECK EXISTING LOGIN
// ============================================
async function checkExistingLogin() {
    // Check if CONFIG is available
    if (typeof CONFIG === 'undefined') {
        console.warn('CONFIG not available, skipping existing login check');
        return;
    }

    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);

    if (!token || !user) {
        return; // No existing session
    }

    try {
        // Verify token is still valid
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ME}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Token is valid, redirect to dashboard
            const userData = JSON.parse(user);
            redirectToDashboard(userData.role);
        } else {
            // Token invalid, clear storage
            clearAuthData();
        }
    } catch (error) {
        console.error('Error checking existing login:', error);
        clearAuthData();
    }
}

// ============================================
// HANDLE LOGIN
// ============================================
async function handleLogin(event) {
    console.log('Login form submitted');
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Get form values
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeInput = document.getElementById('rememberMe');

    if (!usernameInput || !passwordInput) {
        console.error('Form inputs not found');
        showError('Form error. Please refresh the page.');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeInput ? rememberMeInput.checked : false;

    console.log('Username:', username ? '***' : 'empty');
    console.log('Password:', password ? '***' : 'empty');

    // Validate form
    if (!validateForm()) {
        console.log('Form validation failed');
        return;
    }

    console.log('Form validation passed');

    // Show loading state
    showLoading();

    try {
        // Make API call
        const response = await login(username, password);

        if (response.success) {
            // Save authentication data
            saveAuthData(response.data.token, response.data.user, rememberMe);

            // Show success message briefly
            showSuccess('Login successful! Redirecting...');

            // Redirect to appropriate dashboard
            setTimeout(() => {
                redirectToDashboard(response.data.user.role);
            }, 500);
        } else {
            // Handle error response
            showError(response.message || 'Login failed. Please check your credentials.');
            hideLoading();
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
        hideLoading();
    }
}

// ============================================
// API FUNCTIONS
// ============================================
async function login(username, password) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || 'Login failed'
            };
        }

        return {
            success: true,
            data: data.data || data
        };
    } catch (error) {
        console.error('Login API error:', error);
        throw error;
    }
}

// ============================================
// VALIDATION
// ============================================
function validateForm() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    let isValid = true;

    // Clear previous errors
    clearErrors();

    // Validate username
    if (!username) {
        showFieldError('username', 'Username or email is required');
        isValid = false;
    }

    // Validate password
    if (!password) {
        showFieldError('password', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('password', 'Password must be at least 6 characters');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(`${fieldName}Error`);

    if (field) {
        field.classList.add('is-invalid');
    }

    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearErrors() {
    const fields = ['username', 'password'];
    fields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}Error`);

        if (field) {
            field.classList.remove('is-invalid');
        }

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    });
}

// ============================================
// SAVE AUTH DATA
// ============================================
function saveAuthData(token, user, rememberMe) {
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not available');
        return;
    }

    // Save token
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);

    // Save user data
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));

    // Save remember me preference
    localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');

    // Set expiry time if not remembering
    if (!rememberMe) {
        const expiryTime = Date.now() + CONFIG.TOKEN_EXPIRY;
        localStorage.setItem('imras_token_expiry', expiryTime.toString());
    } else {
        localStorage.removeItem('imras_token_expiry');
    }
}

// ============================================
// CLEAR AUTH DATA
// ============================================
function clearAuthData() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem('imras_token_expiry');
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    console.error('Error:', message);
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    if (errorAlert && errorMessage) {
        errorMessage.textContent = message;
        errorAlert.style.display = 'block';
        errorAlert.classList.add('show', 'shake');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    } else {
        // Fallback: use alert if DOM elements not found
        alert('Error: ' + message);
    }
}

function hideError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.classList.remove('show', 'shake');
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 300);
    }
}

function showSuccess(message) {
    // Create temporary success alert
    const alertHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 10000; min-width: 300px;">
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', alertHTML);
}

// ============================================
// LOADING STATES
// ============================================
function showLoading() {
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Disable form
    const form = document.getElementById('loginForm');
    if (form) {
        form.querySelectorAll('input, button').forEach(el => {
            el.disabled = true;
        });
    }

    // Update button
    if (buttonText) buttonText.style.display = 'none';
    if (buttonLoader) buttonLoader.style.display = 'inline-block';

    // Show overlay
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Enable form
    const form = document.getElementById('loginForm');
    if (form) {
        form.querySelectorAll('input, button').forEach(el => {
            el.disabled = false;
        });
    }

    // Update button
    if (buttonText) buttonText.style.display = 'inline-block';
    if (buttonLoader) buttonLoader.style.display = 'none';

    // Hide overlay
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');

    if (passwordInput && eyeIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
}

// ============================================
// REDIRECT TO DASHBOARD
// ============================================
function redirectToDashboard(role) {
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not available');
        showError('Configuration error. Please refresh the page.');
        return;
    }

    const dashboardPath = CONFIG.DASHBOARDS[role];

    if (!dashboardPath) {
        console.error('Unknown role:', role);
        showError('Unable to determine dashboard. Please contact administrator.');
        return;
    }

    console.log('Redirecting to dashboard:', dashboardPath);
    // Redirect to dashboard
    window.location.href = dashboardPath;
}

// ============================================
// UTILITY FUNCTIONS
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

function getStoredToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.authModule = {
        clearAuthData,
        getStoredUser,
        getStoredToken,
        redirectToDashboard
    };
}

