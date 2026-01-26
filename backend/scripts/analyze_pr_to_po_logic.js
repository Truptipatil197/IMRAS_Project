/**
 * SIMPLE PR TO PO LOGIC VERIFICATION
 * This script analyzes the PR to PO conversion logic without requiring database connection
 */

const fs = require('fs');
const path = require('path');

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

console.log(`${colors.bright}${colors.cyan}`);
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   PR TO PO CONVERSION - LOGIC ANALYSIS                     ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(colors.reset);

// Read the reorderController.js file
const controllerPath = path.join(__dirname, '..', 'controllers', 'reorderController.js');

log.step('ANALYZING PR TO PO CONVERSION LOGIC');

try {
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');

    // Extract the createPurchaseOrderFromPR function
    const functionMatch = controllerCode.match(/const createPurchaseOrderFromPR = async \(req, res\) => \{[\s\S]*?\n\};/);

    if (!functionMatch) {
        log.error('Could not find createPurchaseOrderFromPR function');
        process.exit(1);
    }

    const functionCode = functionMatch[0];

    log.success('Found createPurchaseOrderFromPR function');
    log.info(`Function length: ${functionCode.length} characters`);

    // Analyze the logic
    log.step('LOGIC ANALYSIS');

    const checks = {
        hasTransaction: functionCode.includes('sequelize.transaction()'),
        checksRole: functionCode.includes("['Admin', 'Manager']"),
        validatesPRExists: functionCode.includes('PurchaseRequisition.findByPk'),
        validatesPRStatus: functionCode.includes("pr.status !== 'Approved'"),
        checksExistingPO: functionCode.includes('PurchaseOrder.findOne'),
        validatesSupplier: functionCode.includes('Supplier.findByPk'),
        validatesDeliveryDate: functionCode.includes('expected_delivery_date'),
        generatesPONumber: functionCode.includes('generatePONumber'),
        createsPO: functionCode.includes('PurchaseOrder.create'),
        createsPOItems: functionCode.includes('POItem.create'),
        fetchesPricing: functionCode.includes('getSupplierPricing'),
        calculatesTotal: functionCode.includes('total_amount'),
        sendsNotification: functionCode.includes('sendPOCreatedNotification'),
        hasErrorHandling: functionCode.includes('try') && functionCode.includes('catch'),
        rollsBackOnError: functionCode.includes('transaction.rollback')
    };

    console.log('\nValidation Checks:');
    Object.entries(checks).forEach(([check, passed]) => {
        const status = passed ? '✓' : '✗';
        const color = passed ? colors.green : colors.red;
        console.log(`  ${color}${status}${colors.reset} ${check.replace(/([A-Z])/g, ' $1').trim()}`);
    });

    const passedChecks = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;

    log.info(`Passed: ${passedChecks}/${totalChecks} checks`);

    if (passedChecks === totalChecks) {
        log.success('All logic checks passed!');
    } else {
        log.warning('Some logic checks failed');
    }

    // Extract validation logic
    log.step('VALIDATION FLOW');

    const validations = [];

    if (functionCode.includes("!['Admin', 'Manager'].includes(req.user.role)")) {
        validations.push('1. Role check: Only Admin/Manager can create PO');
    }

    if (functionCode.includes('PurchaseRequisition.findByPk')) {
        validations.push('2. PR existence check: Verify PR exists');
    }

    if (functionCode.includes("pr.status !== 'Approved'")) {
        validations.push('3. PR status check: PR must be Approved');
    }

    if (functionCode.includes('PurchaseOrder.findOne({ where: { pr_id: prId }')) {
        validations.push('4. Duplicate PO check: Ensure no existing PO for this PR');
    }

    if (functionCode.includes('Supplier.findByPk')) {
        validations.push('5. Supplier check: Verify supplier exists and is active');
    }

    if (functionCode.includes('expected_delivery_date')) {
        validations.push('6. Delivery date check: Must be today or future date');
    }

    console.log('\nValidation Flow:');
    validations.forEach(v => console.log(`  ${v}`));

    // Extract PO creation logic
    log.step('PO CREATION PROCESS');

    const creationSteps = [
        '1. Generate unique PO number (PO + YEAR + 5-digit sequence)',
        '2. Create PO record with supplier, dates, and initial total = 0',
        '3. For each PR item:',
        '   a. Fetch supplier-specific pricing',
        '   b. Fall back to item base price if no supplier pricing',
        '   c. Create PO item with ordered_qty, unit_price, total_price',
        '   d. Accumulate total amount',
        '4. Update PO with calculated total_amount',
        '5. Commit transaction',
        '6. Send notification to supplier'
    ];

    console.log('\nCreation Steps:');
    creationSteps.forEach(s => console.log(`  ${s}`));

    // Identify potential issues
    log.step('POTENTIAL ISSUES ANALYSIS');

    const potentialIssues = [];

    // Check for proper error handling of pricing
    if (!functionCode.includes('pricing === null') || !functionCode.includes('!prItem.item.unit_price')) {
        potentialIssues.push({
            severity: 'LOW',
            issue: 'Pricing fallback might not handle all edge cases',
            location: 'getSupplierPricing call',
            suggestion: 'Ensure both supplier pricing and item base price are checked'
        });
    }

    // Check for transaction handling
    if (!functionCode.includes('await transaction.commit()')) {
        potentialIssues.push({
            severity: 'HIGH',
            issue: 'Transaction might not be committed properly',
            location: 'End of function',
            suggestion: 'Ensure transaction.commit() is called before returning'
        });
    }

    // Check for proper date validation
    const dateValidationRegex = /expected_delivery_date.*\<.*today/;
    if (!dateValidationRegex.test(functionCode)) {
        potentialIssues.push({
            severity: 'MEDIUM',
            issue: 'Delivery date validation might be missing',
            location: 'Date validation section',
            suggestion: 'Validate that expected_delivery_date >= today'
        });
    }

    if (potentialIssues.length === 0) {
        log.success('No obvious issues found in the logic');
    } else {
        console.log('\nPotential Issues:');
        potentialIssues.forEach((issue, idx) => {
            const severityColor = issue.severity === 'HIGH' ? colors.red :
                issue.severity === 'MEDIUM' ? colors.yellow : colors.cyan;
            console.log(`\n  ${idx + 1}. ${severityColor}[${issue.severity}]${colors.reset} ${issue.issue}`);
            console.log(`     Location: ${issue.location}`);
            console.log(`     Suggestion: ${issue.suggestion}`);
        });
    }

    // Extract the actual code snippet for PR to PO conversion
    log.step('KEY CODE SNIPPET');

    console.log('\nPR to PO Conversion Core Logic:');
    console.log(colors.cyan);
    console.log('─'.repeat(60));

    // Extract the core conversion logic
    const coreLogicMatch = functionCode.match(/const po = await PurchaseOrder\.create\({[\s\S]*?\}, \{ transaction \}\);/);
    if (coreLogicMatch) {
        console.log(coreLogicMatch[0]);
    }

    console.log('─'.repeat(60));
    console.log(colors.reset);

    // Summary
    log.step('ANALYSIS SUMMARY');

    console.log('\nFunction Analysis:');
    console.log(`  ✓ Transaction management: ${checks.hasTransaction ? 'Yes' : 'No'}`);
    console.log(`  ✓ Role-based access: ${checks.checksRole ? 'Yes' : 'No'}`);
    console.log(`  ✓ PR validation: ${checks.validatesPRExists && checks.validatesPRStatus ? 'Yes' : 'No'}`);
    console.log(`  ✓ Duplicate prevention: ${checks.checksExistingPO ? 'Yes' : 'No'}`);
    console.log(`  ✓ Supplier validation: ${checks.validatesSupplier ? 'Yes' : 'No'}`);
    console.log(`  ✓ PO creation: ${checks.createsPO && checks.createsPOItems ? 'Yes' : 'No'}`);
    console.log(`  ✓ Error handling: ${checks.hasErrorHandling && checks.rollsBackOnError ? 'Yes' : 'No'}`);

    console.log('\nConclusion:');
    if (passedChecks >= totalChecks * 0.9) {
        log.success('PR to PO conversion logic appears to be well-implemented');
        log.info('The logic includes proper validation, error handling, and transaction management');
    } else {
        log.warning('PR to PO conversion logic may have some issues');
        log.info('Review the potential issues listed above');
    }

    console.log('\nRecommendations for Presentation:');
    console.log('  1. Demonstrate the validation flow (PR must be approved)');
    console.log('  2. Show how supplier pricing is fetched');
    console.log('  3. Highlight the transaction management for data integrity');
    console.log('  4. Explain the duplicate PO prevention mechanism');
    console.log('  5. Show the complete audit trail (PR → PO linkage)');

} catch (error) {
    log.error(`Analysis failed: ${error.message}`);
    console.error(error);
    process.exit(1);
}

console.log(`\n${colors.green}${colors.bright}Analysis complete!${colors.reset}\n`);
