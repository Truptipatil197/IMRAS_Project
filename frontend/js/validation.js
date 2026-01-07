/**
 * IMRAS - Form Validation Framework
 * 
 * Comprehensive form validation system with:
 * - Built-in validators (required, email, phone, number range, string length, pattern)
 * - Custom validators
 * - Async validation (e.g., check if SKU exists)
 * - Real-time validation
 * - Error display
 */

class FormValidator {
    constructor(formId) {
        this.form = typeof formId === 'string' 
            ? document.getElementById(formId) 
            : formId;
        
        if (!this.form) {
            throw new Error(`Form with ID "${formId}" not found`);
        }

        this.rules = {};
        this.errors = {};
        this.asyncValidators = {};
        this.setupForm();
    }

    /**
     * Setup form event listeners
     */
    setupForm() {
        // Prevent default form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    /**
     * Define validation rules for a field
     */
    addRule(fieldName, rules) {
        this.rules[fieldName] = rules;
        return this;
    }

    /**
     * Add multiple rules at once
     */
    addRules(rules) {
        Object.assign(this.rules, rules);
        return this;
    }

    /**
     * Built-in validators
     */
    validators = {
        required: (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim() !== '';
            if (Array.isArray(value)) return value.length > 0;
            return true;
        },

        email: (value) => {
            if (!value) return true; // Optional if not required
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        },

        phone: (value) => {
            if (!value) return true;
            const phoneRegex = /^[0-9]{10}$/;
            const digits = value.replace(/\D/g, '');
            return phoneRegex.test(digits);
        },

        min: (value, min) => {
            if (!value) return true;
            const num = parseFloat(value);
            return !isNaN(num) && num >= min;
        },

        max: (value, max) => {
            if (!value) return true;
            const num = parseFloat(value);
            return !isNaN(num) && num <= max;
        },

        minLength: (value, length) => {
            if (!value) return true;
            return value.length >= length;
        },

        maxLength: (value, length) => {
            if (!value) return true;
            return value.length <= length;
        },

        pattern: (value, regex) => {
            if (!value) return true;
            const pattern = typeof regex === 'string' ? new RegExp(regex) : regex;
            return pattern.test(value);
        },

        integer: (value) => {
            if (!value) return true;
            return Number.isInteger(parseFloat(value));
        },

        positive: (value) => {
            if (!value) return true;
            const num = parseFloat(value);
            return !isNaN(num) && num > 0;
        },

        url: (value) => {
            if (!value) return true;
            const urlRegex = /^https?:\/\/.+/;
            return urlRegex.test(value);
        },

        date: (value) => {
            if (!value) return true;
            const date = new Date(value);
            return !isNaN(date.getTime());
        },

        dateAfter: (value, minDate) => {
            if (!value) return true;
            const date = new Date(value);
            const min = new Date(minDate);
            return date >= min;
        },

        dateBefore: (value, maxDate) => {
            if (!value) return true;
            const date = new Date(value);
            const max = new Date(maxDate);
            return date <= max;
        },

        numeric: (value) => {
            if (!value) return true;
            return !isNaN(parseFloat(value)) && isFinite(value);
        },

        alphanumeric: (value) => {
            if (!value) return true;
            return /^[a-zA-Z0-9]+$/.test(value);
        },

        noSpaces: (value) => {
            if (!value) return true;
            return !/\s/.test(value);
        }
    };

    /**
     * Add custom validator
     */
    addValidator(name, validatorFn) {
        this.validators[name] = validatorFn;
        return this;
    }

    /**
     * Validate single field
     */
    validateField(fieldName) {
        const field = this.form.elements[fieldName];
        if (!field) {
            console.warn(`Field "${fieldName}" not found in form`);
            return true;
        }

        const rules = this.rules[fieldName];
        if (!rules) return true; // No rules defined, field is valid

        const value = this.getFieldValue(field);

        // Check each rule
        for (const [rule, ruleValue] of Object.entries(rules)) {
            if (rule === 'message' || rule === 'async') continue;

            const validator = this.validators[rule];
            if (!validator) {
                console.warn(`Validator "${rule}" not found`);
                continue;
            }

            // Skip validation if field is empty and not required
            if (!rules.required && (value === '' || value === null || value === undefined)) {
                continue;
            }

            const isValid = typeof ruleValue === 'boolean'
                ? validator(value)
                : validator(value, ruleValue);

            if (!isValid) {
                const message = rules.message || this.getDefaultMessage(fieldName, rule, ruleValue);
                this.setError(fieldName, message);
                return false;
            }
        }

        // Clear error if validation passes
        this.clearError(fieldName);
        return true;
    }

    /**
     * Get field value (handles different input types)
     */
    getFieldValue(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        if (field.type === 'radio') {
            const radioGroup = this.form.elements[field.name];
            if (radioGroup.length) {
                return Array.from(radioGroup).find(r => r.checked)?.value || '';
            }
            return field.checked ? field.value : '';
        }
        if (field.type === 'file') {
            return field.files.length > 0 ? field.files : null;
        }
        return field.value || '';
    }

    /**
     * Get default error message
     */
    getDefaultMessage(fieldName, rule, ruleValue) {
        const fieldLabel = this.getFieldLabel(fieldName);
        const messages = {
            required: `${fieldLabel} is required`,
            email: `${fieldLabel} must be a valid email address`,
            phone: `${fieldLabel} must be a valid phone number`,
            min: `${fieldLabel} must be at least ${ruleValue}`,
            max: `${fieldLabel} must be at most ${ruleValue}`,
            minLength: `${fieldLabel} must be at least ${ruleValue} characters`,
            maxLength: `${fieldLabel} must be at most ${ruleValue} characters`,
            pattern: `${fieldLabel} format is invalid`,
            integer: `${fieldLabel} must be an integer`,
            positive: `${fieldLabel} must be a positive number`,
            url: `${fieldLabel} must be a valid URL`,
            date: `${fieldLabel} must be a valid date`,
            numeric: `${fieldLabel} must be a number`,
            alphanumeric: `${fieldLabel} must contain only letters and numbers`,
            noSpaces: `${fieldLabel} cannot contain spaces`
        };
        return messages[rule] || `${fieldLabel} is invalid`;
    }

    /**
     * Get field label
     */
    getFieldLabel(fieldName) {
        const field = this.form.elements[fieldName];
        if (!field) return fieldName;

        // Try to find label
        const label = this.form.querySelector(`label[for="${fieldName}"]`);
        if (label) {
            return label.textContent.trim().replace(/[*:]/g, '');
        }

        // Try placeholder
        if (field.placeholder) {
            return field.placeholder;
        }

        // Use field name with formatting
        return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Validate entire form
     */
    validate() {
        this.errors = {};
        let isValid = true;

        for (const fieldName in this.rules) {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        }

        return isValid;
    }

    /**
     * Async validation
     */
    async validateAsync(fieldName, asyncValidator) {
        const field = this.form.elements[fieldName];
        if (!field) return true;

        try {
            const value = this.getFieldValue(field);
            const isValid = await asyncValidator(value);

            if (!isValid) {
                const rules = this.rules[fieldName];
                const message = rules?.asyncMessage || `${this.getFieldLabel(fieldName)} validation failed`;
                this.setError(fieldName, message);
                return false;
            }

            this.clearError(fieldName);
            return true;
        } catch (error) {
            console.error('Async validation error:', error);
            this.setError(fieldName, 'Validation error occurred');
            return false;
        }
    }

    /**
     * Validate form with async validators
     */
    async validateAll() {
        // First validate synchronously
        const syncValid = this.validate();
        if (!syncValid) return false;

        // Then validate async validators
        for (const fieldName in this.rules) {
            const rules = this.rules[fieldName];
            if (rules.async) {
                const asyncValid = await this.validateAsync(fieldName, rules.async);
                if (!asyncValid) return false;
            }
        }

        return true;
    }

    /**
     * Set error for field
     */
    setError(fieldName, message) {
        this.errors[fieldName] = message;
        const field = this.form.elements[fieldName];
        if (!field) return;

        // Add error class
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');

        // Show error message
        let errorDiv = this.getErrorElement(field);
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            this.insertErrorElement(field, errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    /**
     * Get or create error element
     */
    getErrorElement(field) {
        // Check next sibling
        let nextSibling = field.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains('invalid-feedback')) {
            return nextSibling;
        }

        // Check parent's next sibling (for wrapped inputs)
        const parent = field.parentElement;
        if (parent) {
            nextSibling = parent.nextElementSibling;
            if (nextSibling && nextSibling.classList.contains('invalid-feedback')) {
                return nextSibling;
            }
        }

        return null;
    }

    /**
     * Insert error element after field
     */
    insertErrorElement(field, errorDiv) {
        // If field is wrapped (e.g., in input-group), insert after parent
        const parent = field.parentElement;
        if (parent && parent.classList.contains('input-group')) {
            parent.parentNode.insertBefore(errorDiv, parent.nextSibling);
        } else {
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }
    }

    /**
     * Clear error for field
     */
    clearError(fieldName) {
        delete this.errors[fieldName];
        const field = this.form.elements[fieldName];
        if (!field) return;

        field.classList.remove('is-invalid');
        field.classList.add('is-valid');

        const errorDiv = this.getErrorElement(field);
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        for (const fieldName in this.errors) {
            this.clearError(fieldName);
        }
        this.errors = {};
    }

    /**
     * Get form data as object
     */
    getFormData() {
        const formData = new FormData(this.form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Handle multiple values (e.g., checkboxes)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        // Handle checkboxes and radios
        for (const fieldName in this.rules) {
            const field = this.form.elements[fieldName];
            if (!field) continue;

            if (field.type === 'checkbox') {
                data[fieldName] = field.checked;
            } else if (field.type === 'radio') {
                const radioGroup = this.form.elements[fieldName];
                if (radioGroup.length) {
                    const checked = Array.from(radioGroup).find(r => r.checked);
                    data[fieldName] = checked ? checked.value : null;
                } else {
                    data[fieldName] = field.checked ? field.value : null;
                }
            }
        }

        return data;
    }

    /**
     * Get form data as FormData object (for file uploads)
     */
    getFormDataObject() {
        return new FormData(this.form);
    }

    /**
     * Reset form
     */
    reset() {
        this.form.reset();
        this.clearAllErrors();
    }

    /**
     * Setup real-time validation
     */
    setupRealTimeValidation() {
        for (const fieldName in this.rules) {
            const field = this.form.elements[fieldName];
            if (!field) continue;

            // Validate on blur
            field.addEventListener('blur', () => {
                this.validateField(fieldName);
            });

            // Clear error on input (if error exists)
            field.addEventListener('input', () => {
                if (this.errors[fieldName]) {
                    this.validateField(fieldName);
                }
            });
        }
    }

    /**
     * Validate on form submit
     */
    onSubmit(callback) {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isValid = await this.validateAll();
            if (isValid) {
                const formData = this.getFormData();
                callback(formData, this.form);
            } else {
                // Focus first error field
                const firstErrorField = Object.keys(this.errors)[0];
                if (firstErrorField) {
                    const field = this.form.elements[firstErrorField];
                    if (field) {
                        field.focus();
                        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }

                // Show notification
                if (window.Notify) {
                    window.Notify.error('Please fix the errors in the form');
                }
            }
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.FormValidator = FormValidator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidator;
}

