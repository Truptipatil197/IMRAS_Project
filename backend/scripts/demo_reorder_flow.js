/**
 * PRACTICAL DEMONSTRATION: Complete Reorder Flow
 * This script demonstrates the entire reordering process from low stock detection to PO creation
 * 
 * Flow:
 * 1. Check stock levels and detect items below reorder point
 * 2. Create alerts for low stock items
 * 3. Create Purchase Requisition (PR) from alerts
 * 4. Approve the PR (Manager/Admin)
 * 5. Convert approved PR to Purchase Order (PO)
 * 6. Verify PO creation and status
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const log = {
    step: (msg) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    data: (label, data) => console.log(`${colors.cyan}${label}:${colors.reset}`, JSON.stringify(data, null, 2))
};

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        };
        if (data) config.data = data;

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`API Error: ${error.response.data.message || error.message}`);
        }
        throw error;
    }
};

// Step 1: Login as Manager/Admin
const login = async () => {
    log.step('STEP 1: Authentication');
    try {
        const response = await apiCall('POST', '/auth/login', {
            email: 'manager@imras.com', // Change to your manager email
            password: 'manager123' // Change to your manager password
        });

        authToken = response.data.token;
        log.success(`Logged in as: ${response.data.user.full_name} (${response.data.user.role})`);
        log.info(`User ID: ${response.data.user.user_id}`);
        return response.data.user;
    } catch (error) {
        log.error(`Login failed: ${error.message}`);
        log.warning('Please update the credentials in the script or create a manager account');
        throw error;
    }
};

// Step 2: Check reorder points and create alerts
const checkReorderPoints = async () => {
    log.step('STEP 2: Checking Reorder Points');
    try {
        const response = await apiCall('POST', '/reorder/check-reorder-points');

        log.success(`Reorder check completed`);
        log.info(`Items needing reorder: ${response.data.items_needing_reorder}`);
        log.info(`Critical items: ${response.data.critical_items}`);
        log.info(`Alerts created: ${response.data.alerts_created}`);

        if (response.data.items && response.data.items.length > 0) {
            console.log('\nItems Below Reorder Point:');
            response.data.items.forEach((item, idx) => {
                console.log(`  ${idx + 1}. ${item.item_name} (${item.sku})`);
                console.log(`     Current Stock: ${item.current_stock} | Reorder Point: ${item.reorder_point}`);
                console.log(`     Status: ${item.status} | Urgency: ${item.urgency}`);
                console.log(`     Recommended Order: ${item.recommended_order_qty} units`);
            });
        }

        return response.data;
    } catch (error) {
        log.error(`Failed to check reorder points: ${error.message}`);
        throw error;
    }
};

// Step 3: Get reorder alerts
const getReorderAlerts = async () => {
    log.step('STEP 3: Fetching Reorder Alerts');
    try {
        const response = await apiCall('GET', '/reorder/alerts?is_read=false');

        log.success(`Retrieved ${response.data.alerts.length} unread alerts`);
        log.info(`Critical alerts: ${response.data.critical_count}`);

        if (response.data.alerts.length > 0) {
            console.log('\nUnread Alerts:');
            response.data.alerts.slice(0, 5).forEach((alert, idx) => {
                console.log(`  ${idx + 1}. Alert #${alert.alert_id} - ${alert.alert_type}`);
                console.log(`     Item: ${alert.item_name} (SKU: ${alert.sku})`);
                console.log(`     Current Stock: ${alert.current_stock} | Reorder Point: ${alert.reorder_point}`);
                console.log(`     Severity: ${alert.severity} | Days Pending: ${alert.days_pending}`);
                console.log(`     Recommended Order: ${alert.recommended_order_qty} units`);
            });
        }

        return response.data.alerts;
    } catch (error) {
        log.error(`Failed to fetch alerts: ${error.message}`);
        throw error;
    }
};

// Step 4: Create Purchase Requisition from alerts
const createPurchaseRequisition = async (alerts) => {
    log.step('STEP 4: Creating Purchase Requisition');

    if (!alerts || alerts.length === 0) {
        log.warning('No alerts available to create PR');
        return null;
    }

    try {
        // Take the first alert as an example
        const alert = alerts[0];

        const prData = {
            pr_date: new Date().toISOString().split('T')[0],
            remarks: 'Auto-generated PR from reorder alert - Demo',
            items: [{
                item_id: alert.item_id,
                requested_qty: alert.recommended_order_qty,
                justification: `Stock below reorder point. Current: ${alert.current_stock}, Reorder Point: ${alert.reorder_point}`
            }],
            alert_id: alert.alert_id
        };

        log.info(`Creating PR for item: ${alert.item_name}`);
        log.info(`Requested quantity: ${alert.recommended_order_qty} units`);

        const response = await apiCall('POST', '/reorder/purchase-requisitions', prData);

        log.success(`Purchase Requisition created successfully`);
        log.info(`PR Number: ${response.data.pr_number}`);
        log.info(`PR ID: ${response.data.pr_id}`);
        log.info(`Status: ${response.data.status}`);

        console.log('\nPR Items:');
        response.data.prItems.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.item.item_name} - ${item.requested_qty} units`);
            console.log(`     Justification: ${item.justification}`);
        });

        return response.data;
    } catch (error) {
        log.error(`Failed to create PR: ${error.message}`);
        throw error;
    }
};

// Step 5: Approve Purchase Requisition
const approvePurchaseRequisition = async (prId) => {
    log.step('STEP 5: Approving Purchase Requisition');
    try {
        const response = await apiCall('PUT', `/reorder/purchase-requisitions/${prId}/approve`, {
            approval_remarks: 'Approved for demonstration - Stock critically low'
        });

        log.success(`Purchase Requisition approved`);
        log.info(`PR Number: ${response.data.pr_number}`);
        log.info(`Status: ${response.data.status}`);
        log.info(`Approved Date: ${response.data.approved_date}`);

        return response.data;
    } catch (error) {
        log.error(`Failed to approve PR: ${error.message}`);
        throw error;
    }
};

// Step 6: Get supplier for the item
const getSupplierForItem = async (itemId) => {
    log.step('STEP 6: Finding Supplier');
    try {
        // Get all suppliers
        const response = await apiCall('GET', '/suppliers');

        if (!response.data || response.data.length === 0) {
            log.warning('No suppliers found in the system');
            return null;
        }

        // Find a supplier that has this item or just use the first active supplier
        const activeSupplier = response.data.find(s => s.is_active);

        if (activeSupplier) {
            log.success(`Selected supplier: ${activeSupplier.supplier_name}`);
            log.info(`Supplier ID: ${activeSupplier.supplier_id}`);
            log.info(`Contact: ${activeSupplier.contact_person || 'N/A'}`);
            return activeSupplier;
        }

        log.warning('No active suppliers found');
        return null;
    } catch (error) {
        log.error(`Failed to fetch suppliers: ${error.message}`);
        throw error;
    }
};

// Step 7: Convert PR to PO (THIS IS WHERE THE ISSUE MIGHT BE)
const convertPRtoPO = async (prId, supplierId) => {
    log.step('STEP 7: Converting PR to Purchase Order');

    if (!supplierId) {
        log.error('No supplier available to create PO');
        return null;
    }

    try {
        const expectedDeliveryDate = new Date();
        expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7); // 7 days from now

        const poData = {
            supplier_id: supplierId,
            expected_delivery_date: expectedDeliveryDate.toISOString().split('T')[0]
        };

        log.info(`Creating PO from PR #${prId}`);
        log.info(`Supplier ID: ${supplierId}`);
        log.info(`Expected Delivery: ${poData.expected_delivery_date}`);

        const response = await apiCall('POST', `/reorder/purchase-requisitions/${prId}/create-po`, poData);

        log.success(`Purchase Order created successfully!`);
        log.info(`PO Number: ${response.data.po_number}`);
        log.info(`PO ID: ${response.data.po_id}`);
        log.info(`Status: ${response.data.status}`);
        log.info(`Total Amount: $${response.data.total_amount}`);

        console.log('\nPO Items:');
        response.data.poItems.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.item.item_name}`);
            console.log(`     Ordered Qty: ${item.ordered_qty} units`);
            console.log(`     Unit Price: $${item.unit_price}`);
            console.log(`     Total Price: $${item.total_price}`);
        });

        return response.data;
    } catch (error) {
        log.error(`Failed to convert PR to PO: ${error.message}`);
        log.error('THIS IS THE ISSUE YOU MENTIONED - PR to PO conversion problem');
        throw error;
    }
};

// Step 8: Verify PO status
const verifyPOStatus = async (poId) => {
    log.step('STEP 8: Verifying Purchase Order Status');
    try {
        const response = await apiCall('GET', `/reorder/purchase-orders/${poId}/status`);

        log.success(`PO Status retrieved successfully`);
        log.info(`PO Number: ${response.data.po_number}`);
        log.info(`Status: ${response.data.status}`);
        log.info(`Completion: ${response.data.completion_percentage}%`);
        log.info(`Days Since Created: ${response.data.days_since_created}`);
        log.info(`Days Until Delivery: ${response.data.days_until_expected_delivery}`);

        console.log('\nSupplier Details:');
        console.log(`  Name: ${response.data.supplier.supplier_name}`);
        console.log(`  Contact: ${response.data.supplier.contact_person || 'N/A'}`);
        console.log(`  Email: ${response.data.supplier.email || 'N/A'}`);

        console.log('\nPO Items Status:');
        response.data.items.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.item.item_name}`);
            console.log(`     Ordered: ${item.ordered_qty} | Received: ${item.received_qty} | Pending: ${item.pending_qty}`);
        });

        return response.data;
    } catch (error) {
        log.error(`Failed to verify PO status: ${error.message}`);
        throw error;
    }
};

// Main execution flow
const runDemo = async () => {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   IMRAS REORDER FLOW - PRACTICAL DEMONSTRATION             ║');
    console.log('║   Complete Flow: Alert → PR → Approval → PO                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    try {
        // Step 1: Login
        const user = await login();

        // Step 2: Check reorder points
        const reorderCheck = await checkReorderPoints();

        // Step 3: Get alerts
        const alerts = await getReorderAlerts();

        if (!alerts || alerts.length === 0) {
            log.warning('No alerts found. The demo cannot continue.');
            log.info('Please ensure you have items with stock below reorder point.');
            return;
        }

        // Step 4: Create PR
        const pr = await createPurchaseRequisition(alerts);

        if (!pr) {
            log.error('Failed to create PR. Demo stopped.');
            return;
        }

        // Step 5: Approve PR
        const approvedPR = await approvePurchaseRequisition(pr.pr_id);

        // Step 6: Get supplier
        const supplier = await getSupplierForItem(pr.prItems[0].item_id);

        if (!supplier) {
            log.error('No supplier available. Demo stopped.');
            log.info('Please add at least one active supplier to the system.');
            return;
        }

        // Step 7: Convert PR to PO (CRITICAL STEP - WHERE ISSUE MIGHT OCCUR)
        const po = await convertPRtoPO(approvedPR.pr_id, supplier.supplier_id);

        if (!po) {
            log.error('Failed to create PO. This is the issue you mentioned!');
            return;
        }

        // Step 8: Verify PO
        await verifyPOStatus(po.po_id);

        // Summary
        log.step('DEMONSTRATION SUMMARY');
        log.success('Complete reorder flow executed successfully!');
        console.log('\nFlow Summary:');
        console.log(`  1. ✓ Detected ${reorderCheck.items_needing_reorder} items needing reorder`);
        console.log(`  2. ✓ Created ${reorderCheck.alerts_created} alerts`);
        console.log(`  3. ✓ Created PR: ${pr.pr_number}`);
        console.log(`  4. ✓ Approved PR: ${approvedPR.pr_number}`);
        console.log(`  5. ✓ Created PO: ${po.po_number} from PR`);
        console.log(`  6. ✓ PO Total Amount: $${po.total_amount}`);
        console.log(`  7. ✓ Supplier: ${supplier.supplier_name}`);

        console.log(`\n${colors.green}${colors.bright}All steps completed successfully!${colors.reset}`);

    } catch (error) {
        log.step('DEMONSTRATION FAILED');
        log.error(`Error: ${error.message}`);
        console.log('\nPlease check:');
        console.log('  1. Backend server is running on port 5000');
        console.log('  2. Database is properly configured');
        console.log('  3. Manager account exists with correct credentials');
        console.log('  4. At least one item has stock below reorder point');
        console.log('  5. At least one active supplier exists');
        process.exit(1);
    }
};

// Run the demonstration
runDemo();
