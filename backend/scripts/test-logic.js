const axios = require('axios');
const fs = require('fs');

async function test() {
    const baseUrl = 'http://localhost:5000/api';
    let output = '=== API FINAL TRUTH TEST ===\n\n';

    try {
        // Need a token - let's try to find one or hit a public health check first
        console.log('Testing Health...');
        const health = await axios.get(`${baseUrl}/health`);
        output += `Health: ${JSON.stringify(health.data)}\n\n`;

        // We can't easily get a token here without user creds, 
        // lets create a bypass script that just calls the controller functions directly
        output += '--- DIRECT CONTROLLER TESTS ---\n';

    } catch (err) {
        output += `Error: ${err.message}\n`;
    }

    fs.writeFileSync('scripts/api_test_results.log', output);
    console.log('Results written to scripts/api_test_results.log');
}

// Switching to a direct internal test script to bypass Auth requirements
const { getAllItems } = require('../controllers/inventoryController');
const reorderService = require('../services/reorderService');

async function internalTest() {
    let log = '=== INTERNAL LOGIC TEST ===\n\n';
    try {
        console.log('Testing Inventory Logic...');
        const mockRes = {
            status: function (s) { this.statusCode = s; return this; },
            json: function (j) { this.data = j; return this; }
        };
        await getAllItems({ query: {} }, mockRes);
        log += `Inventory Result (Sample Item 0 Stock): ${mockRes.data.data.items[0].current_stock}\n`;
        log += `Inventory Raw Item 0: ${JSON.stringify(mockRes.data.data.items[0])}\n\n`;

        console.log('Testing Automation Logic (dry run)...');
        const stats = await reorderService.checkAllItems();
        log += `Automation Stats: ${JSON.stringify(stats)}\n`;

    } catch (err) {
        log += `Internal Error: ${err.stack}\n`;
    }
    fs.writeFileSync('scripts/internal_test.log', log);
    console.log('Internal results written to scripts/internal_test.log');
    process.exit();
}

internalTest();
