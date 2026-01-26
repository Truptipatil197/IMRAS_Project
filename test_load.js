try {
    const models = require('./backend/models');
    console.log('Models loaded:', Object.keys(models));
} catch (e) {
    console.error(e);
}
