/**
 * IMRAS - Automated Test Scenarios
 * 
 * Complete workflow validation tests for:
 * 1. Complete Procurement Workflow
 * 2. Reorder Automation Workflow
 * 3. Expiry Management & FEFO Workflow
 * 4. Stock Reconciliation Workflow
 */

// Ensure API and Notify are available
if (typeof API === 'undefined') {
    console.error('API utility not loaded. Please include js/api-utils.js');
}
if (typeof Notify === 'undefined') {
    console.error('Notification system not loaded. Please include js/notifications.js');
}

/**
 * Helper function to print test results
 */
function printTestResults(testName, results) {
    console.log('\n' + '='.repeat(60));
    console.log(`TEST RESULTS: ${testName}`);
    console.log('='.repeat(60));
    console.log(`Total Steps: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed} ✅`);
    console.log(`Failed: ${results.failed} ❌`);
    const total = results.passed + results.failed;
    const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
    console.log(`Success Rate: ${successRate}%`);
    console.log('\nDetailed Steps:');

    results.steps.forEach((step, index) => {
        const icon = step.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${step.step}: ${step.message}`);
    });

    console.log('='.repeat(60) + '\n');

    return results;
}

/**
 * Helper function to wait/delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEST SCENARIO 1: Complete Procurement Workflow
 * 
 * Tests the complete flow from item creation to stock update:
 * Login → Create Item → Create PR → Approve PR → Create PO → Record GRN → Verify Stock
 */
async function testCompleteProcurementWorkflow() {
    console.log('🧪 Starting Complete Procurement Workflow Test...\n');

    const testData = {
        item: {
            sku: 'TEST-PROC-' + Date.now(),
            item_name: 'Test Item - Laptop',
            category_id: 1,
            unit_of_measure: 'pcs',
            unit_price: 50000,
            reorder_point: 10,
            safety_stock: 5,
            lead_time_days: 7
        },
        supplier: {
            supplier_id: 1
        },
        warehouse: {
            warehouse_id: 1
        }
    };

    const results = {
        passed: 0,
        failed: 0,
        steps: []
    };

    try {
        // STEP 1: Login
        console.log('Step 1: Logging in as admin...');
        const loginResponse = await API.post('/api/auth/login', {
            username: 'admin',
            password: 'password123'
        });

        if (loginResponse.success && loginResponse.token) {
            results.steps.push({ step: 'Login', status: 'PASS', message: 'Logged in successfully' });
            results.passed++;
            API.setToken(loginResponse.token);
        } else {
            throw new Error('Login failed: ' + (loginResponse.message || 'Unknown error'));
        }

        // STEP 2: Create Item
        console.log('Step 2: Creating test item...');
        const itemResponse = await API.post('/api/items', testData.item);

        if (itemResponse.success && itemResponse.item) {
            testData.item.item_id = itemResponse.item.item_id;
            results.steps.push({
                step: 'Create Item',
                status: 'PASS',
                message: `Item created with ID: ${testData.item.item_id}`
            });
            results.passed++;
        } else {
            throw new Error('Item creation failed: ' + (itemResponse.message || 'Unknown error'));
        }

        // STEP 3: Check Initial Stock (should be 0)
        console.log('Step 3: Checking initial stock...');
        await delay(500); // Small delay for database consistency

        const stockCheck1 = await API.get('/api/stock/balance', {
            item_id: testData.item.item_id,
            warehouse_id: testData.warehouse.warehouse_id
        });

        const initialBalance = stockCheck1.balance || stockCheck1.stock_balance || 0;

        if (initialBalance === 0) {
            results.steps.push({
                step: 'Initial Stock Check',
                status: 'PASS',
                message: 'Initial stock is 0'
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Initial Stock Check',
                status: 'FAIL',
                message: `Expected 0, got ${initialBalance}`
            });
            results.failed++;
        }

        // STEP 4: Create Purchase Requisition
        console.log('Step 4: Creating PR...');
        const prResponse = await API.post('/api/reorder/pr', {
            pr_date: new Date().toISOString().split('T')[0],
            items: [{
                item_id: testData.item.item_id,
                requested_qty: 20,
                justification: 'Initial stock purchase - Test'
            }]
        });

        if (prResponse.success && prResponse.pr_id) {
            testData.pr_id = prResponse.pr_id;
            testData.pr_number = prResponse.pr_number || `PR-${prResponse.pr_id}`;
            results.steps.push({
                step: 'Create PR',
                status: 'PASS',
                message: `PR created: ${testData.pr_number}`
            });
            results.passed++;
        } else {
            throw new Error('PR creation failed: ' + (prResponse.message || 'Unknown error'));
        }

        // STEP 5: Approve PR
        console.log('Step 5: Approving PR...');
        const approveResponse = await API.put(`/api/reorder/pr/${testData.pr_id}/approve`, {
            remarks: 'Approved for testing'
        });

        if (approveResponse.success) {
            results.steps.push({
                step: 'Approve PR',
                status: 'PASS',
                message: 'PR approved successfully'
            });
            results.passed++;
        } else {
            throw new Error('PR approval failed: ' + (approveResponse.message || 'Unknown error'));
        }

        // STEP 6: Create Purchase Order from PR
        console.log('Step 6: Creating PO from PR...');
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const poResponse = await API.post(`/api/reorder/po/from-pr/${testData.pr_id}`, {
            supplier_id: testData.supplier.supplier_id,
            expected_delivery_date: futureDate.toISOString().split('T')[0]
        });

        if (poResponse.success && poResponse.po_id) {
            testData.po_id = poResponse.po_id;
            testData.po_number = poResponse.po_number || `PO-${poResponse.po_id}`;
            results.steps.push({
                step: 'Create PO',
                status: 'PASS',
                message: `PO created: ${testData.po_number}`
            });
            results.passed++;
        } else {
            throw new Error('PO creation failed: ' + (poResponse.message || 'Unknown error'));
        }

        // STEP 7: Create GRN (Goods Receipt)
        console.log('Step 7: Creating GRN...');
        const grnResponse = await API.post('/api/grn', {
            po_id: testData.po_id,
            warehouse_id: testData.warehouse.warehouse_id,
            items: [{
                item_id: testData.item.item_id,
                received_qty: 20,
                accepted_qty: 20,
                rejected_qty: 0,
                batch_number: 'BATCH-TEST-' + Date.now(),
                manufacturing_date: new Date().toISOString().split('T')[0],
                expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }]
        });

        if (grnResponse.success && grnResponse.grn_id) {
            testData.grn_id = grnResponse.grn_id;
            testData.grn_number = grnResponse.grn_number || `GRN-${grnResponse.grn_id}`;
            results.steps.push({
                step: 'Create GRN',
                status: 'PASS',
                message: `GRN created: ${testData.grn_number}`
            });
            results.passed++;
        } else {
            throw new Error('GRN creation failed: ' + (grnResponse.message || 'Unknown error'));
        }

        // STEP 8: Complete GRN
        console.log('Step 8: Completing GRN...');
        const completeGrnResponse = await API.put(`/api/grn/${testData.grn_id}/complete`);

        if (completeGrnResponse.success) {
            results.steps.push({
                step: 'Complete GRN',
                status: 'PASS',
                message: 'GRN completed successfully'
            });
            results.passed++;
        } else {
            throw new Error('GRN completion failed: ' + (completeGrnResponse.message || 'Unknown error'));
        }

        // STEP 9: Check Final Stock (should be 20)
        console.log('Step 9: Checking final stock...');
        await delay(2000); // Wait for ledger update

        const stockCheck2 = await API.get('/api/stock/balance', {
            item_id: testData.item.item_id,
            warehouse_id: testData.warehouse.warehouse_id
        });

        const finalBalance = stockCheck2.balance || stockCheck2.stock_balance || 0;

        if (finalBalance === 20) {
            results.steps.push({
                step: 'Final Stock Check',
                status: 'PASS',
                message: 'Stock updated correctly to 20'
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Final Stock Check',
                status: 'FAIL',
                message: `Expected 20, got ${finalBalance}`
            });
            results.failed++;
        }

        // STEP 10: Verify Stock Ledger Entry
        console.log('Step 10: Verifying stock ledger...');
        const ledgerResponse = await API.get(`/api/stock/ledger/${testData.item.item_id}`);

        if (ledgerResponse.ledger || ledgerResponse.transactions) {
            const ledger = ledgerResponse.ledger || ledgerResponse.transactions;
            const grnEntry = ledger.find(entry =>
                (entry.transaction_type === 'GRN' || entry.type === 'GRN') &&
                entry.reference_id == testData.grn_id
            );

            if (grnEntry && (grnEntry.quantity === 20 || grnEntry.qty === 20)) {
                results.steps.push({
                    step: 'Verify Stock Ledger',
                    status: 'PASS',
                    message: 'Ledger entry found and correct'
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Verify Stock Ledger',
                    status: 'FAIL',
                    message: 'Ledger entry not found or incorrect'
                });
                results.failed++;
            }
        } else {
            results.steps.push({
                step: 'Verify Stock Ledger',
                status: 'FAIL',
                message: 'Ledger response format unexpected'
            });
            results.failed++;
        }

    } catch (error) {
        results.steps.push({
            step: 'ERROR',
            status: 'FAIL',
            message: error.message || 'Unknown error occurred'
        });
        results.failed++;
        console.error('Test error:', error);
    }

    return printTestResults('Complete Procurement Workflow', results);
}

/**
 * TEST SCENARIO 2: Reorder Automation Workflow
 * 
 * Tests automatic reorder point detection and alert generation
 */
async function testReorderAutomationWorkflow() {
    console.log('🧪 Starting Reorder Automation Workflow Test...\n');

    const results = { passed: 0, failed: 0, steps: [] };

    try {
        // STEP 1: Create item with low stock
        console.log('Step 1: Creating item with low stock trigger...');
        const itemResponse = await API.post('/api/items', {
            sku: 'REORDER-TEST-' + Date.now(),
            item_name: 'Reorder Test Item',
            category_id: 1,
            unit_of_measure: 'pcs',
            unit_price: 1000,
            reorder_point: 50,
            safety_stock: 20,
            lead_time_days: 5
        });

        const item_id = itemResponse.item?.item_id;
        if (!item_id) {
            throw new Error('Item creation failed');
        }

        results.steps.push({ step: 'Create Item', status: 'PASS', message: `Item ID: ${item_id}` });
        results.passed++;

        // STEP 2: Set stock to below reorder point
        console.log('Step 2: Adjusting stock to trigger reorder...');
        const adjustResponse = await API.post('/api/stock/adjust', {
            item_id: item_id,
            warehouse_id: 1,
            adjustment_qty: 30, // Below reorder point of 50
            reason: 'Set initial low stock for testing',
            notes: 'Automated test'
        });

        if (adjustResponse.success) {
            results.steps.push({
                step: 'Set Low Stock',
                status: 'PASS',
                message: 'Stock set to 30 (below reorder point 50)'
            });
            results.passed++;
        } else {
            throw new Error('Stock adjustment failed');
        }

        // STEP 3: Run reorder check
        console.log('Step 3: Running reorder point check...');
        await delay(1000); // Wait for stock update

        const checkResponse = await API.post('/api/reorder/check');

        if (checkResponse.success && checkResponse.alerts && checkResponse.alerts.length > 0) {
            results.steps.push({
                step: 'Reorder Check',
                status: 'PASS',
                message: `${checkResponse.alerts.length} alerts generated`
            });
            results.passed++;
        } else {
            // Try getting alerts directly
            const alertsResponse = await API.get('/api/reorder/alerts');
            if (alertsResponse.alerts && alertsResponse.alerts.length > 0) {
                results.steps.push({
                    step: 'Reorder Check',
                    status: 'PASS',
                    message: `${alertsResponse.alerts.length} alerts found`
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Reorder Check',
                    status: 'FAIL',
                    message: 'No reorder alerts generated'
                });
                results.failed++;
            }
        }

        // STEP 4: Verify alert exists for our item
        console.log('Step 4: Verifying alert for test item...');
        const alertsResponse = await API.get('/api/reorder/alerts');
        const alerts = alertsResponse.alerts || alertsResponse.data || [];
        const itemAlert = alerts.find(a => a.item_id == item_id);

        if (itemAlert) {
            results.steps.push({
                step: 'Verify Alert',
                status: 'PASS',
                message: 'Alert found for test item'
            });
            results.passed++;

            // STEP 5: Verify recommended quantity calculation
            console.log('Step 5: Verifying recommended quantity calculation...');
            // Formula: (Reorder Point + Safety Stock) - Current Stock
            // Expected: (50 + 20) - 30 = 40
            const expectedQty = (50 + 20) - 30;

            const recommendedQty = itemAlert.recommended_qty || itemAlert.suggested_qty || 0;

            if (recommendedQty === expectedQty) {
                results.steps.push({
                    step: 'Calculate Recommended Qty',
                    status: 'PASS',
                    message: `Correct: ${expectedQty}`
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Calculate Recommended Qty',
                    status: 'FAIL',
                    message: `Expected ${expectedQty}, got ${recommendedQty}`
                });
                results.failed++;
            }
        } else {
            results.steps.push({
                step: 'Verify Alert',
                status: 'FAIL',
                message: 'Alert not found for test item'
            });
            results.failed++;
        }

        // STEP 6: Auto-create PR from alert
        console.log('Step 6: Auto-creating PR from alert...');
        const prResponse = await API.post('/api/reorder/pr', {
            pr_date: new Date().toISOString().split('T')[0],
            items: [{
                item_id: item_id,
                requested_qty: 40,
                justification: 'Automatic reorder - stock below reorder point'
            }],
            alert_id: itemAlert?.alert_id
        });

        if (prResponse.success) {
            results.steps.push({
                step: 'Auto-create PR',
                status: 'PASS',
                message: `PR ${prResponse.pr_number || prResponse.pr_id} created`
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Auto-create PR',
                status: 'FAIL',
                message: 'PR creation failed: ' + (prResponse.message || 'Unknown error')
            });
            results.failed++;
        }

    } catch (error) {
        results.steps.push({
            step: 'ERROR',
            status: 'FAIL',
            message: error.message || 'Unknown error occurred'
        });
        results.failed++;
        console.error('Test error:', error);
    }

    return printTestResults('Reorder Automation Workflow', results);
}

/**
 * TEST SCENARIO 3: Expiry Management & FEFO Workflow
 * 
 * Tests batch expiry tracking and First Expiry First Out (FEFO) logic
 */
async function testExpiryManagementWorkflow() {
    console.log('🧪 Starting Expiry Management & FEFO Workflow Test...\n');

    const results = { passed: 0, failed: 0, steps: [] };

    try {
        // STEP 1: Create item
        console.log('Step 1: Creating test item...');
        const itemResponse = await API.post('/api/items', {
            sku: 'EXPIRY-TEST-' + Date.now(),
            item_name: 'Expiry Test Item',
            category_id: 2, // Assuming category with expiry tracking
            unit_of_measure: 'pcs',
            unit_price: 500,
            reorder_point: 10,
            safety_stock: 5,
            lead_time_days: 3
        });

        const item_id = itemResponse.item?.item_id;
        if (!item_id) {
            throw new Error('Item creation failed');
        }

        results.steps.push({ step: 'Create Item', status: 'PASS', message: `Item ID: ${item_id}` });
        results.passed++;

        // STEP 2: Create GRN with multiple batches (simulating different expiry dates)
        console.log('Step 2: Creating GRN with batches having different expiry dates...');

        // First, create a PO and GRN to get stock
        const prResponse = await API.post('/api/reorder/pr', {
            pr_date: new Date().toISOString().split('T')[0],
            items: [{
                item_id: item_id,
                requested_qty: 300,
                justification: 'Test expiry management'
            }]
        });

        if (!prResponse.success) {
            throw new Error('PR creation failed');
        }

        // Approve PR
        await API.put(`/api/reorder/pr/${prResponse.pr_id}/approve`, { remarks: 'Test approval' });

        // Create PO
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const poResponse = await API.post(`/api/reorder/po/from-pr/${prResponse.pr_id}`, {
            supplier_id: 1,
            expected_delivery_date: futureDate.toISOString().split('T')[0]
        });

        if (!poResponse.success) {
            throw new Error('PO creation failed');
        }

        // Create GRN with multiple batches
        const batches = [
            {
                batch_number: 'BATCH-EXP-1',
                expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
                quantity: 100
            },
            {
                batch_number: 'BATCH-EXP-2',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                quantity: 100
            },
            {
                batch_number: 'BATCH-EXP-3',
                expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                quantity: 100
            }
        ];

        const grnResponse = await API.post('/api/grn', {
            po_id: poResponse.po_id,
            warehouse_id: 1,
            items: batches.map(batch => ({
                item_id: item_id,
                received_qty: batch.quantity,
                accepted_qty: batch.quantity,
                rejected_qty: 0,
                batch_number: batch.batch_number,
                manufacturing_date: new Date().toISOString().split('T')[0],
                expiry_date: batch.expiry_date.toISOString().split('T')[0]
            }))
        });

        if (grnResponse.success) {
            await API.put(`/api/grn/${grnResponse.grn_id}/complete`);
            results.steps.push({
                step: 'Create Batches',
                status: 'PASS',
                message: '3 batches created with different expiry dates'
            });
            results.passed++;
        } else {
            throw new Error('GRN creation failed');
        }

        // STEP 3: Issue stock and verify FEFO (First Expiry First Out)
        console.log('Step 3: Issuing stock with FEFO logic...');
        await delay(2000); // Wait for stock update

        const issueResponse = await API.post('/api/stock/issue', {
            item_id: item_id,
            warehouse_id: 1,
            quantity: 50,
            reference_type: 'Sales Order',
            reference_id: 'SO-TEST-001',
            remarks: 'FEFO test issue'
        });

        if (issueResponse.success) {
            results.steps.push({
                step: 'Issue Stock',
                status: 'PASS',
                message: '50 units issued'
            });
            results.passed++;

            // STEP 4: Verify stock was picked from earliest expiring batch
            console.log('Step 4: Verifying FEFO - stock picked from earliest batch...');
            await delay(1000);

            const batchesResponse = await API.get(`/api/batches?item_id=${item_id}`);
            const batches = batchesResponse.batches || batchesResponse.data || [];
            const earliestBatch = batches.find(b => b.batch_number === 'BATCH-EXP-1');

            if (earliestBatch) {
                const availableQty = earliestBatch.available_qty || earliestBatch.quantity || 0;
                // Should have 50 left (100 - 50)
                if (availableQty === 50) {
                    results.steps.push({
                        step: 'Verify FEFO',
                        status: 'PASS',
                        message: 'Stock correctly picked from earliest expiring batch'
                    });
                    results.passed++;
                } else {
                    results.steps.push({
                        step: 'Verify FEFO',
                        status: 'FAIL',
                        message: `Expected 50 remaining, got ${availableQty}`
                    });
                    results.failed++;
                }
            } else {
                results.steps.push({
                    step: 'Verify FEFO',
                    status: 'FAIL',
                    message: 'Earliest batch not found'
                });
                results.failed++;
            }
        } else {
            results.steps.push({
                step: 'Issue Stock',
                status: 'FAIL',
                message: 'Stock issue failed: ' + (issueResponse.message || 'Unknown error')
            });
            results.failed++;
        }

        // STEP 5: Check expiry alerts
        console.log('Step 5: Checking expiry alerts...');
        const expiringBatches = await API.get('/api/batches/expiring?days=30');

        const batchesList = expiringBatches.batches || expiringBatches.data || [];
        if (batchesList.some(b => b.item_id == item_id)) {
            results.steps.push({
                step: 'Expiry Alerts',
                status: 'PASS',
                message: 'Expiry alert generated for test item'
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Expiry Alerts',
                status: 'FAIL',
                message: 'No expiry alert found'
            });
            results.failed++;
        }

    } catch (error) {
        results.steps.push({
            step: 'ERROR',
            status: 'FAIL',
            message: error.message || 'Unknown error occurred'
        });
        results.failed++;
        console.error('Test error:', error);
    }

    return printTestResults('Expiry Management & FEFO Workflow', results);
}

/**
 * TEST SCENARIO 4: Stock Reconciliation Workflow
 * 
 * Tests physical stock count and reconciliation process
 */
async function testReconciliationWorkflow() {
    console.log('🧪 Starting Stock Reconciliation Workflow Test...\n');

    const results = { passed: 0, failed: 0, steps: [] };

    try {
        // STEP 1: Create test item with known stock
        console.log('Step 1: Creating test item...');
        const itemResponse = await API.post('/api/items', {
            sku: 'RECON-TEST-' + Date.now(),
            item_name: 'Reconciliation Test Item',
            category_id: 1,
            unit_of_measure: 'pcs',
            unit_price: 100,
            reorder_point: 10,
            safety_stock: 5,
            lead_time_days: 3
        });

        const item_id = itemResponse.item?.item_id;
        if (!item_id) {
            throw new Error('Item creation failed');
        }

        results.steps.push({ step: 'Create Item', status: 'PASS', message: `Item ID: ${item_id}` });
        results.passed++;

        // STEP 2: Set initial stock to 100
        console.log('Step 2: Setting initial stock...');
        const adjustResponse = await API.post('/api/stock/adjust', {
            item_id: item_id,
            warehouse_id: 1,
            adjustment_qty: 100,
            reason: 'Initial stock for reconciliation test',
            notes: 'Automated test'
        });

        if (adjustResponse.success) {
            results.steps.push({
                step: 'Set Initial Stock',
                status: 'PASS',
                message: 'System stock set to 100'
            });
            results.passed++;
        } else {
            throw new Error('Stock adjustment failed');
        }

        // STEP 3: Perform physical count (simulate finding 95 units)
        console.log('Step 3: Recording physical count...');
        await delay(1000);

        const physicalCount = 95; // Shortage of 5 units

        const countResponse = await API.post('/api/stock/count', {
            warehouse_id: 1,
            items: [{
                item_id: item_id,
                physical_qty: physicalCount
            }]
        });

        if (countResponse.success) {
            results.steps.push({
                step: 'Physical Count',
                status: 'PASS',
                message: `Physical count recorded: ${physicalCount}`
            });
            results.passed++;
        } else {
            // Try alternative endpoint
            const altResponse = await API.post('/api/stock/record-count', {
                warehouse_id: 1,
                item_id: item_id,
                physical_qty: physicalCount
            });

            if (altResponse.success) {
                results.steps.push({
                    step: 'Physical Count',
                    status: 'PASS',
                    message: `Physical count recorded: ${physicalCount}`
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Physical Count',
                    status: 'FAIL',
                    message: 'Physical count recording failed'
                });
                results.failed++;
            }
        }

        // STEP 4: Calculate and verify variance
        console.log('Step 4: Calculating variance...');
        await delay(1000);

        const systemQty = 100;
        const expectedVariance = physicalCount - systemQty; // -5

        // Get reconciliation report
        const reconciliationResponse = await API.get('/api/reports/reconciliation', {
            item_id: item_id,
            warehouse_id: 1
        });

        const reconData = reconciliationResponse.items || reconciliationResponse.data || [];
        const reconItem = Array.isArray(reconData) 
            ? reconData.find(i => i.item_id == item_id)
            : reconData;

        if (reconItem) {
            const variance = reconItem.variance || reconItem.difference || 0;
            if (variance === expectedVariance) {
                results.steps.push({
                    step: 'Calculate Variance',
                    status: 'PASS',
                    message: `Variance correctly calculated: ${expectedVariance}`
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Calculate Variance',
                    status: 'FAIL',
                    message: `Expected ${expectedVariance}, got ${variance}`
                });
                results.failed++;
            }
        } else {
            // Calculate manually from stock balance
            const stockBalance = await API.get('/api/stock/balance', {
                item_id: item_id,
                warehouse_id: 1
            });
            const balance = stockBalance.balance || stockBalance.stock_balance || 0;
            const variance = physicalCount - balance;

            if (variance === expectedVariance) {
                results.steps.push({
                    step: 'Calculate Variance',
                    status: 'PASS',
                    message: `Variance correctly calculated: ${expectedVariance}`
                });
                results.passed++;
            } else {
                results.steps.push({
                    step: 'Calculate Variance',
                    status: 'FAIL',
                    message: `Expected ${expectedVariance}, got ${variance}`
                });
                results.failed++;
            }
        }

        // STEP 5: Create adjustment to reconcile
        console.log('Step 5: Creating adjustment to reconcile variance...');
        const adjustmentResponse = await API.post('/api/stock/adjust', {
            item_id: item_id,
            warehouse_id: 1,
            adjustment_qty: expectedVariance,
            reason: 'Stock Reconciliation - Physical count variance',
            notes: 'Automated test reconciliation'
        });

        if (adjustmentResponse.success) {
            results.steps.push({
                step: 'Create Adjustment',
                status: 'PASS',
                message: 'Adjustment created successfully'
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Create Adjustment',
                status: 'FAIL',
                message: 'Adjustment creation failed: ' + (adjustmentResponse.message || 'Unknown error')
            });
            results.failed++;
        }

        // STEP 6: Verify stock balance updated
        console.log('Step 6: Verifying stock balance after adjustment...');
        await delay(2000); // Wait for update

        const stockBalance = await API.get('/api/stock/balance', {
            item_id: item_id,
            warehouse_id: 1
        });

        const finalBalance = stockBalance.balance || stockBalance.stock_balance || 0;

        if (finalBalance === physicalCount) {
            results.steps.push({
                step: 'Verify Stock Balance',
                status: 'PASS',
                message: `Stock updated to ${physicalCount}`
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Verify Stock Balance',
                status: 'FAIL',
                message: `Expected ${physicalCount}, got ${finalBalance}`
            });
            results.failed++;
        }

        // STEP 7: Verify ledger entry created
        console.log('Step 7: Verifying ledger entry...');
        const ledgerResponse = await API.get(`/api/stock/ledger/${item_id}`);

        const ledger = ledgerResponse.ledger || ledgerResponse.transactions || [];
        const adjustmentEntry = ledger.find(entry =>
            (entry.transaction_type === 'Adjustment' || entry.type === 'Adjustment') &&
            (entry.quantity === expectedVariance || entry.qty === expectedVariance)
        );

        if (adjustmentEntry) {
            results.steps.push({
                step: 'Verify Ledger Entry',
                status: 'PASS',
                message: 'Adjustment recorded in ledger'
            });
            results.passed++;
        } else {
            results.steps.push({
                step: 'Verify Ledger Entry',
                status: 'FAIL',
                message: 'Ledger entry not found'
            });
            results.failed++;
        }

    } catch (error) {
        results.steps.push({
            step: 'ERROR',
            status: 'FAIL',
            message: error.message || 'Unknown error occurred'
        });
        results.failed++;
        console.error('Test error:', error);
    }

    return printTestResults('Stock Reconciliation Workflow', results);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.testCompleteProcurementWorkflow = testCompleteProcurementWorkflow;
    window.testReorderAutomationWorkflow = testReorderAutomationWorkflow;
    window.testExpiryManagementWorkflow = testExpiryManagementWorkflow;
    window.testReconciliationWorkflow = testReconciliationWorkflow;
}

