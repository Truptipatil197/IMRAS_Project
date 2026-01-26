const cron = require('node-cron');
const { checkExpiryAlerts } = require('../controllers/batchController');

// Run expiry check daily at 6:00 AM
cron.schedule('0 6 * * *', async () => {
  try {
    await checkExpiryAlerts({ user: { role: 'Manager' } }, { // fake req/res wrappers
      status: () => ({
        json: () => {}
      })
    });
    console.log('Daily expiry check completed');
  } catch (error) {
    console.error('Scheduled expiry check failed:', error);
  }
});

module.exports = {};

