# IMRAS - Common Issues & Solutions

This guide provides solutions to common issues encountered when using or developing the IMRAS system.

## API Integration Issues

### Issue: CORS Errors

**Symptom:** Browser console shows "CORS policy" error or "Access-Control-Allow-Origin" error

**Solution:**

```javascript
// Backend: server.js
const cors = require('cors');
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Alternative:** If using Express, ensure CORS middleware is before routes:

```javascript
app.use(cors());
app.use(express.json());
app.use('/api', routes);
```

---

### Issue: 401 Unauthorized on API Calls

**Symptom:** API returns 401 even with valid token

**Check:**

1. Token format in Authorization header: `Bearer ${token}`
2. Token not expired
3. Backend JWT verification working
4. Token stored correctly in localStorage

**Solution:**

```javascript
// Ensure proper token format in api-utils.js
headers: {
    'Authorization': `Bearer ${localStorage.getItem('imras_token')}`
}

// Check token expiration
const token = localStorage.getItem('imras_token');
if (!token || isTokenExpired(token)) {
    // Redirect to login
    window.location.href = 'index.html';
}
```

**Debug Steps:**

```javascript
// Add to api-utils.js for debugging
console.log('Token:', localStorage.getItem('imras_token'));
console.log('Token expired:', API.isTokenExpired());
```

---

### Issue: Network Request Failed

**Symptom:** Fetch returns "Failed to fetch" error

**Check:**

1. Backend server running on correct port
2. API_BASE_URL matches backend URL
3. Network connectivity
4. Firewall blocking requests

**Solution:**

```javascript
// Verify API base URL in config.js
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000' // Ensure this matches backend
};

// Add error handling
try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch (error) {
    if (error.message === 'Failed to fetch') {
        Notify.error('Cannot connect to server. Please check if backend is running.');
        console.error('Backend URL:', CONFIG.API_BASE_URL);
    }
}
```

**Common Causes:**

- Backend server not started
- Wrong port number
- Backend crashed
- Network issues

---

## Data Issues

### Issue: Stock Balance Incorrect

**Symptom:** Stock ledger shows wrong running balance

**Debug Steps:**

1. Check stock_ledger table for item
2. Verify all transactions present
3. Recalculate manually

**Solution:**

```sql
-- Recalculate stock balance
SET @balance := 0;
UPDATE stock_ledger 
SET balance_qty = (@balance := @balance + quantity)
WHERE item_id = ? 
ORDER BY transaction_date, ledger_id;
```

**JavaScript Check:**

```javascript
// Verify ledger entries
const ledger = await API.get(`/api/stock/ledger/${itemId}`);
console.log('Ledger entries:', ledger);

// Check running balance
let balance = 0;
ledger.forEach(entry => {
    balance += entry.quantity;
    console.log(`Entry ${entry.ledger_id}: ${entry.quantity}, Balance: ${balance}`);
});
```

---

### Issue: FEFO Logic Not Working

**Symptom:** Stock issued from wrong batch (not earliest expiring)

**Check:**

1. Batch expiry dates set correctly
2. FEFO query sorting by expiry_date ASC
3. Sufficient quantity in earliest batch

**Solution:**

```javascript
// Ensure correct sorting in backend
const batches = await Batch.findAll({
    where: {
        item_id: itemId,
        available_qty: { [Op.gt]: 0 },
        status: 'Active'
    },
    order: [['expiry_date', 'ASC']] // ✅ Earliest expiry first
});

// Verify in frontend
const batches = await API.get(`/api/batches?item_id=${itemId}`);
console.log('Batches sorted by expiry:', batches);
```

**Debug:**

```javascript
// Manual FEFO check
const item = await Item.findByPk(itemId);
const batches = await Batch.findAll({
    where: { item_id: itemId, available_qty: { [Op.gt]: 0 } },
    order: [['expiry_date', 'ASC']]
});

console.log('FEFO Order:');
batches.forEach((batch, index) => {
    console.log(`${index + 1}. Batch ${batch.batch_number}: Expiry ${batch.expiry_date}, Qty: ${batch.available_qty}`);
});
```

---

### Issue: Reorder Alerts Not Generating

**Symptom:** No alerts even though stock below reorder point

**Check:**

1. Reorder point set for item
2. Current stock calculation correct
3. Alert generation logic running
4. Scheduler job active

**Debug:**

```javascript
// Manual alert check
const item = await Item.findByPk(itemId);
const stock = await getStockBalance(itemId, warehouseId);

console.log('Reorder Point:', item.reorder_point);
console.log('Current Stock:', stock);
console.log('Should Alert:', stock < item.reorder_point);

// Check if alert exists
const alerts = await Alert.findAll({
    where: { item_id: itemId, is_read: false }
});
console.log('Existing alerts:', alerts);
```

**Solution:**

```javascript
// Ensure reorder check runs
await API.post('/api/reorder/check');

// Verify alerts created
const alerts = await API.get('/api/reorder/alerts');
console.log('Alerts:', alerts);
```

---

## UI Issues

### Issue: DataTable Not Initializing

**Symptom:** Table shows plain HTML, no sorting/pagination

**Solution:**

```javascript
// Ensure jQuery and DataTables loaded before initialization
$(document).ready(function() {
    $('#myTable').DataTable({
        order: [[0, 'desc']],
        pageLength: 25,
        responsive: true
    });
});

// Check if DataTables loaded
if (typeof $.fn.DataTable === 'undefined') {
    console.error('DataTables not loaded!');
}
```

**Common Causes:**

- jQuery not loaded
- DataTables library not included
- Table ID mismatch
- Initialization before DOM ready

---

### Issue: Chart.js Not Rendering

**Symptom:** Chart container blank

**Check:**

1. Chart.js CDN loaded
2. Canvas element exists
3. Chart ID matches
4. Data format correct

**Solution:**

```html
<!-- Load Chart.js BEFORE your JS -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="js/dashboard.js"></script>
```

```javascript
// Verify canvas element
const canvas = document.getElementById('myChart');
if (!canvas) {
    console.error('Canvas element not found!');
    return;
}

// Check Chart.js loaded
if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded!');
    return;
}

// Create chart
const ctx = canvas.getContext('2d');
const chart = new Chart(ctx, {
    type: 'doughnut',
    data: chartData,
    options: chartOptions
});
```

---

### Issue: Modal Not Opening

**Symptom:** Click button, modal doesn't appear

**Solution:**

```javascript
// Use Bootstrap 5 syntax
const modalElement = document.getElementById('myModal');
const modal = new bootstrap.Modal(modalElement);
modal.show();

// Not Bootstrap 4 syntax:
// $('#myModal').modal('show'); // ❌ Old way
```

**Check:**

1. Bootstrap 5 loaded
2. Modal HTML structure correct
3. Modal ID matches
4. JavaScript errors in console

---

### Issue: Notifications Not Appearing

**Symptom:** Notify.success() called but nothing shows

**Check:**

1. Notification system initialized
2. Container appended to body
3. CSS loaded
4. No JavaScript errors

**Debug:**

```javascript
console.log('Notify object:', window.Notify);
console.log('Container:', document.querySelector('.notification-container'));

// Test notification
if (window.Notify) {
    Notify.success('Test notification');
} else {
    console.error('Notify not available!');
}
```

**Solution:**

```html
<!-- Ensure CSS and JS loaded -->
<link rel="stylesheet" href="css/notifications.css">
<script src="js/notifications.js"></script>
```

---

## Form Issues

### Issue: Form Validation Not Working

**Symptom:** Form submits even with invalid data

**Solution:**

```javascript
form.addEventListener('submit', (e) => {
    e.preventDefault(); // ✅ Prevent default submission
    
    const validator = new FormValidator('myForm');
    validator
        .addRule('email', { required: true, email: true })
        .setupRealTimeValidation();
    
    if (validator.validate()) {
        // Submit form
        submitForm(validator.getFormData());
    }
});
```

**Check:**

1. FormValidator loaded
2. Rules defined correctly
3. Form ID matches
4. Event listener attached

---

### Issue: File Upload Fails

**Symptom:** File not received by backend

**Solution:**

```javascript
// Use FormData for file uploads
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('item_id', itemId);

await API.uploadFile('/api/upload', fileInput.files[0], {
    item_id: itemId
}, (progress) => {
    console.log('Upload progress:', progress + '%');
});
```

**Check:**

1. File size within limits
2. File type allowed
3. Backend multer configured
4. Content-Type not set manually (browser sets it)

---

## Performance Issues

### Issue: Page Load Slow

**Symptom:** Page takes > 5 seconds to load

**Optimization:**

1. Lazy load images
2. Paginate large datasets
3. Cache API responses
4. Minimize bundle size

**Solution:**

```javascript
// Implement pagination
const limit = 25;
const offset = (page - 1) * limit;

await API.get(`/api/items?limit=${limit}&offset=${offset}`);

// Cache responses
const items = await API.get('/api/items', {}, { useCache: true });
```

**Check:**

1. Network tab in DevTools
2. Large API responses
3. Unnecessary API calls
4. Heavy JavaScript files

---

### Issue: Chart Rendering Slow

**Symptom:** Chart takes > 3 seconds to render

**Solution:**

```javascript
// Reduce data points for large datasets
const chartData = rawData.length > 100 
    ? rawData.filter((_, index) => index % Math.ceil(rawData.length / 100) === 0)
    : rawData;

// Use requestAnimationFrame for smooth rendering
requestAnimationFrame(() => {
    const chart = new Chart(ctx, { data: chartData, ... });
});
```

---

## Browser-Specific Issues

### Issue: Works in Chrome, Not in Safari

**Symptom:** Feature works in Chrome but breaks in Safari

**Common Causes:**

1. Date parsing differences
2. Fetch API differences
3. CSS compatibility
4. JavaScript syntax

**Solution:**

```javascript
// Use ISO date format for cross-browser compatibility
const date = new Date('2025-01-15'); // ✅ ISO format
// Not: new Date('01/15/2025'); // ❌ May fail in Safari

// Check fetch support
if (typeof fetch === 'undefined') {
    // Use polyfill or XMLHttpRequest
}
```

---

## Database Issues

### Issue: Foreign Key Constraint Error

**Symptom:** Cannot insert record due to FK constraint

**Check:**

1. Referenced record exists
2. FK value matches data type
3. Cascade delete configured if needed

**Solution:**

```javascript
// Check if related record exists before inserting
const supplier = await Supplier.findByPk(supplier_id);
if (!supplier) {
    throw new Error('Supplier not found');
}

// Use transaction for related inserts
await sequelize.transaction(async (t) => {
    const item = await Item.create(itemData, { transaction: t });
    await Stock.create({ item_id: item.item_id, ... }, { transaction: t });
});
```

---

### Issue: Deadlock Detected

**Symptom:** Transaction fails with deadlock error

**Solution:**

```javascript
// Use transactions with proper locking
const result = await sequelize.transaction(async (t) => {
    const item = await Item.findByPk(itemId, {
        lock: t.LOCK.UPDATE,
        transaction: t
    });
    
    // Update operations
    
    return result;
});

// Retry on deadlock
let retries = 3;
while (retries > 0) {
    try {
        return await performTransaction();
    } catch (error) {
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('deadlock')) {
            retries--;
            await delay(100 * (4 - retries)); // Exponential backoff
        } else {
            throw error;
        }
    }
}
```

---

## Testing Issues

### Issue: Tests Fail Intermittently

**Symptom:** Tests pass sometimes, fail other times

**Common Causes:**

1. Race conditions
2. Async timing issues
3. Test data conflicts

**Solution:**

```javascript
// Add delays between steps
await new Promise(resolve => setTimeout(resolve, 1000));

// Use unique test data
const sku = 'TEST-' + Date.now() + '-' + Math.random();

// Wait for async operations
await waitForCondition(() => {
    return stockBalance === expectedBalance;
}, 5000);
```

---

### Issue: Cannot Clean Up Test Data

**Symptom:** Test data accumulates in database

**Solution:**

```javascript
// Add cleanup function
async function cleanupTestData(prefix = 'TEST-') {
    await Item.destroy({
        where: {
            sku: {
                [Op.like]: `${prefix}%`
            }
        }
    });
}

// Call after each test
afterEach(async () => {
    await cleanupTestData();
});
```

---

## Configuration Issues

### Issue: API Base URL Wrong

**Symptom:** All API calls fail

**Solution:**

```javascript
// Check config.js
const CONFIG = {
    API_BASE_URL: 'http://localhost:5000' // Verify this matches backend
};

// Environment-specific config
const CONFIG = {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000'
};
```

---

### Issue: Token Not Persisting

**Symptom:** User logged out on page refresh

**Check:**

1. localStorage enabled
2. Token stored correctly
3. Token retrieved on page load

**Solution:**

```javascript
// Check localStorage
console.log('Token in storage:', localStorage.getItem('imras_token'));

// Verify on page load
window.addEventListener('load', () => {
    const token = localStorage.getItem('imras_token');
    if (token) {
        API.setToken(token);
        // Verify token still valid
        API.get('/api/auth/me').catch(() => {
            // Token invalid, clear and redirect
            API.clearToken();
            window.location.href = 'index.html';
        });
    }
});
```

---

## Getting Help

If you encounter an issue not covered here:

1. Check browser console for errors
2. Check network tab for failed requests
3. Check backend logs
4. Review API documentation
5. Check database for data inconsistencies
6. Verify all dependencies installed
7. Check environment variables
8. Review recent changes in code

---

## Quick Reference

### Common Console Commands

```javascript
// Check API connection
API.get('/api/auth/me').then(console.log).catch(console.error);

// Check token
console.log('Token:', localStorage.getItem('imras_token'));

// Clear cache
API.clearCache();

// Test notification
Notify.success('Test');

// Check loading state
Loading.showPageLoader('Testing...');
```

### Useful SQL Queries

```sql
-- Check stock balance
SELECT * FROM stock_ledger WHERE item_id = ? ORDER BY transaction_date;

-- Find reorder alerts
SELECT * FROM alerts WHERE is_read = 0;

-- Check batch expiry
SELECT * FROM batches WHERE expiry_date < DATE_ADD(NOW(), INTERVAL 30 DAY);
```

---

**Last Updated:** 2025-01-15

