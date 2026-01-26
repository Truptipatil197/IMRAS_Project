/**
 * VERIFICATION SCRIPT: PR to PO Conversion Logic
 * This script specifically tests and verifies the PR to PO conversion process
 * to identify any issues in the flow
 */

const {
    sequelize,
    PurchaseRequisition,
    PRItem,
    PurchaseOrder,
    POItem,
    Item,
    Supplier,
    SupplierItem,
    User
} = require('../models');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const log = {
    step: (msg) => console.log(`\n${colors.bright}${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`)
};

const verifyPRtoPOConversion = async () => {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   PR to PO CONVERSION VERIFICATION                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);

    try {
        // Test 1: Check if there are any approved PRs
        log.step('TEST 1: Checking for Approved PRs');
        const approvedPRs = await PurchaseRequisition.findAll({
            where: { status: 'Approved' },
            include: [
                { model: PRItem, as: 'prItems', include: [{ model: Item, as: 'item' }] },
                { model: PurchaseOrder, as: 'purchaseOrders', required: false }
            ],
            limit: 5
        });

        log.info(`Found ${approvedPRs.length} approved PRs`);

        if (approvedPRs.length === 0) {
            log.warning('No approved PRs found. Cannot test PR to PO conversion.');
            log.info('Please create and approve a PR first.');
            return;
        }

        // Display approved PRs
        console.log('\nApproved PRs:');
        approvedPRs.forEach((pr, idx) => {
            const hasPO = pr.purchaseOrders && pr.purchaseOrders.length > 0;
            console.log(`  ${idx + 1}. PR #${pr.pr_number} (ID: ${pr.pr_id})`);
            console.log(`     Status: ${pr.status}`);
            console.log(`     Items: ${pr.prItems.length}`);
            console.log(`     Has PO: ${hasPO ? 'Yes - PO #' + pr.purchaseOrders[0].po_number : 'No'}`);
        });

        // Test 2: Check for PRs without POs
        log.step('TEST 2: Finding PRs Without POs');
        const prsWithoutPO = approvedPRs.filter(pr => !pr.purchaseOrders || pr.purchaseOrders.length === 0);

        log.info(`Found ${prsWithoutPO.length} approved PRs without POs`);

        if (prsWithoutPO.length === 0) {
            log.success('All approved PRs have been converted to POs');
        } else {
            log.warning(`${prsWithoutPO.length} approved PRs are waiting for PO conversion`);
            console.log('\nPRs Awaiting PO Conversion:');
            prsWithoutPO.forEach((pr, idx) => {
                console.log(`  ${idx + 1}. PR #${pr.pr_number} (ID: ${pr.pr_id})`);
                console.log(`     Approved Date: ${pr.approved_date}`);
                console.log(`     Items Count: ${pr.prItems.length}`);
            });
        }

        // Test 3: Verify PR-PO relationship integrity
        log.step('TEST 3: Verifying PR-PO Relationship Integrity');
        const allPOs = await PurchaseOrder.findAll({
            include: [
                { model: PurchaseRequisition, as: 'purchaseRequisition', required: false },
                { model: POItem, as: 'poItems', include: [{ model: Item, as: 'item' }] }
            ],
            limit: 10
        });

        log.info(`Found ${allPOs.length} total POs in the system`);

        let posWithPR = 0;
        let posWithoutPR = 0;
        let itemMismatch = 0;

        console.log('\nPO Analysis:');
        for (const po of allPOs) {
            if (po.pr_id) {
                posWithPR++;
                const pr = po.purchaseRequisition;

                if (pr) {
                    // Check if PR items match PO items
                    const prItems = await PRItem.findAll({ where: { pr_id: pr.pr_id } });
                    const poItemCount = po.poItems.length;
                    const prItemCount = prItems.length;

                    if (poItemCount !== prItemCount) {
                        itemMismatch++;
                        log.warning(`PO #${po.po_number}: Item count mismatch (PO: ${poItemCount}, PR: ${prItemCount})`);
                    }
                } else {
                    log.error(`PO #${po.po_number}: Has pr_id ${po.pr_id} but PR not found!`);
                }
            } else {
                posWithoutPR++;
            }
        }

        console.log(`\n  POs linked to PR: ${posWithPR}`);
        console.log(`  POs without PR: ${posWithoutPR}`);
        console.log(`  Item mismatches: ${itemMismatch}`);

        if (itemMismatch > 0) {
            log.error('Found item count mismatches between PRs and POs!');
        } else {
            log.success('All POs have correct item counts matching their PRs');
        }

        // Test 4: Check supplier availability
        log.step('TEST 4: Verifying Supplier Availability');
        const activeSuppliers = await Supplier.findAll({ where: { is_active: true } });

        log.info(`Found ${activeSuppliers.length} active suppliers`);

        if (activeSuppliers.length === 0) {
            log.error('No active suppliers found! This will prevent PO creation.');
            log.warning('Please add at least one active supplier to the system.');
        } else {
            log.success('Active suppliers available for PO creation');
            console.log('\nActive Suppliers:');
            activeSuppliers.slice(0, 5).forEach((supplier, idx) => {
                console.log(`  ${idx + 1}. ${supplier.supplier_name} (ID: ${supplier.supplier_id})`);
                console.log(`     Contact: ${supplier.contact_person || 'N/A'}`);
                console.log(`     Email: ${supplier.email || 'N/A'}`);
            });
        }

        // Test 5: Check supplier-item pricing
        log.step('TEST 5: Verifying Supplier-Item Pricing');
        if (prsWithoutPO.length > 0 && activeSuppliers.length > 0) {
            const testPR = prsWithoutPO[0];
            const testSupplier = activeSuppliers[0];

            log.info(`Testing pricing for PR #${testPR.pr_number} with supplier ${testSupplier.supplier_name}`);

            let itemsWithPricing = 0;
            let itemsWithoutPricing = 0;

            for (const prItem of testPR.prItems) {
                const supplierItem = await SupplierItem.findOne({
                    where: {
                        supplier_id: testSupplier.supplier_id,
                        item_id: prItem.item_id
                    }
                });

                if (supplierItem) {
                    itemsWithPricing++;
                    console.log(`  ✓ ${prItem.item.item_name}: $${supplierItem.unit_price}`);
                } else {
                    itemsWithoutPricing++;
                    const fallbackPrice = prItem.item.unit_price || 0;
                    console.log(`  ⚠ ${prItem.item.item_name}: No supplier pricing (fallback: $${fallbackPrice})`);
                }
            }

            log.info(`Items with supplier pricing: ${itemsWithPricing}`);
            log.info(`Items using fallback pricing: ${itemsWithoutPricing}`);

            if (itemsWithoutPricing > 0) {
                log.warning('Some items lack supplier-specific pricing. Will use item base price.');
            }
        }

        // Test 6: Simulate PR to PO conversion logic
        log.step('TEST 6: Simulating PR to PO Conversion Logic');
        if (prsWithoutPO.length > 0 && activeSuppliers.length > 0) {
            const testPR = prsWithoutPO[0];
            const testSupplier = activeSuppliers[0];

            log.info(`Simulating conversion of PR #${testPR.pr_number}`);
            log.info(`Using supplier: ${testSupplier.supplier_name}`);

            // Check all prerequisites
            const checks = {
                prExists: !!testPR,
                prApproved: testPR.status === 'Approved',
                supplierActive: testSupplier.is_active,
                hasItems: testPR.prItems.length > 0,
                noPOExists: !testPR.purchaseOrders || testPR.purchaseOrders.length === 0
            };

            console.log('\nPrerequisite Checks:');
            console.log(`  PR Exists: ${checks.prExists ? '✓' : '✗'}`);
            console.log(`  PR Approved: ${checks.prApproved ? '✓' : '✗'}`);
            console.log(`  Supplier Active: ${checks.supplierActive ? '✓' : '✗'}`);
            console.log(`  Has Items: ${checks.hasItems ? '✓' : '✗'}`);
            console.log(`  No PO Exists: ${checks.noPOExists ? '✓' : '✗'}`);

            const allChecksPassed = Object.values(checks).every(check => check === true);

            if (allChecksPassed) {
                log.success('All prerequisites passed! PR can be converted to PO.');

                // Calculate expected PO details
                let totalAmount = 0;
                console.log('\nExpected PO Items:');
                for (const prItem of testPR.prItems) {
                    const supplierItem = await SupplierItem.findOne({
                        where: {
                            supplier_id: testSupplier.supplier_id,
                            item_id: prItem.item_id
                        }
                    });

                    const unitPrice = supplierItem ? supplierItem.unit_price : (prItem.item.unit_price || 0);
                    const lineTotal = unitPrice * prItem.requested_qty;
                    totalAmount += lineTotal;

                    console.log(`  - ${prItem.item.item_name}`);
                    console.log(`    Qty: ${prItem.requested_qty} × $${unitPrice} = $${lineTotal}`);
                }

                console.log(`\nExpected Total Amount: $${totalAmount.toFixed(2)}`);

            } else {
                log.error('Prerequisites failed! Cannot convert PR to PO.');
                const failedChecks = Object.entries(checks)
                    .filter(([_, passed]) => !passed)
                    .map(([check, _]) => check);
                log.error(`Failed checks: ${failedChecks.join(', ')}`);
            }
        }

        // Test 7: Check for common issues
        log.step('TEST 7: Checking for Common Issues');
        const issues = [];

        // Issue 1: PRs stuck in Pending
        const pendingPRs = await PurchaseRequisition.count({ where: { status: 'Pending' } });
        if (pendingPRs > 0) {
            issues.push(`${pendingPRs} PRs stuck in Pending status`);
        }

        // Issue 2: Approved PRs without POs (older than 1 day)
        const oldApprovedPRs = await PurchaseRequisition.count({
            where: {
                status: 'Approved',
                approved_date: {
                    [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                '$purchaseOrders.po_id$': null
            },
            include: [{ model: PurchaseOrder, as: 'purchaseOrders', attributes: [], required: false }],
            distinct: true
        });

        if (oldApprovedPRs > 0) {
            issues.push(`${oldApprovedPRs} approved PRs older than 1 day without POs`);
        }

        // Issue 3: POs without items
        const posWithoutItems = await PurchaseOrder.count({
            where: {
                '$poItems.po_item_id$': null
            },
            include: [{ model: POItem, as: 'poItems', attributes: [], required: false }],
            distinct: true
        });

        if (posWithoutItems > 0) {
            issues.push(`${posWithoutItems} POs without any items`);
        }

        if (issues.length > 0) {
            log.warning('Found potential issues:');
            issues.forEach((issue, idx) => {
                console.log(`  ${idx + 1}. ${issue}`);
            });
        } else {
            log.success('No common issues detected');
        }

        // Final Summary
        log.step('VERIFICATION SUMMARY');
        console.log('\nSystem Status:');
        console.log(`  Total Approved PRs: ${approvedPRs.length}`);
        console.log(`  PRs Without POs: ${prsWithoutPO.length}`);
        console.log(`  Total POs: ${allPOs.length}`);
        console.log(`  Active Suppliers: ${activeSuppliers.length}`);
        console.log(`  Issues Found: ${issues.length}`);

        if (issues.length === 0 && activeSuppliers.length > 0) {
            log.success('PR to PO conversion system is working correctly!');
        } else {
            log.warning('Some issues detected. Please review the findings above.');
        }

    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        console.error(error);
    } finally {
        await sequelize.close();
    }
};

// Run verification
verifyPRtoPOConversion();
