/**
 * Diagnosis script for Module Loading
 * Run with: node scripts/diagnose-load.js
 */

const path = require('path');

function tryLoad(name, pathStr) {
    console.log(`\n📦 Attempting to load ${name}...`);
    try {
        const module = require(pathStr);
        console.log(`✅ ${name} loaded successfully.`);
        if (typeof module === 'function') console.log(`   Type: Function`);
        if (typeof module === 'object') console.log(`   Type: Object`);
        return true;
    } catch (err) {
        console.error(`❌ FAILED to load ${name}:`);
        console.error(err);
        return false;
    }
}

async function diagnose() {
    console.log('🔍 Starting Module Load Diagnosis...\n');

    // 1. Models
    tryLoad('Models', '../models');

    // 2. Services
    tryLoad('ReorderService', '../services/reorderService');
    tryLoad('ExpiryAlertService', '../services/expiryAlertService');

    // 3. Schedulers
    tryLoad('ReorderScheduler', '../jobs/reorderScheduler');
    tryLoad('AlertScheduler', '../jobs/alertGenerationScheduler');

    // 4. Controllers
    tryLoad('SchedulerController', '../controllers/schedulerController');
    tryLoad('ReorderController', '../controllers/reorderController');

    // 5. Middleware
    tryLoad('AuthMiddleware', '../middleware/authMiddleware');

    // 6. Routes
    // Note: Routes might fail if they expect 'app' or circular deps, but basic syntax should pass
    tryLoad('ReorderRoutes', '../routes/reorderRoutes');

    console.log('\n🏁 Diagnosis Complete.');
}

diagnose();
