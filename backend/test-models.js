const db = require('./models');

async function testModels() {
    try {
        console.log('🧪 Testing IMRAS Database Models...\n');
        
        // Test database connection
        await db.sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        // Sync all models (creates tables)
        await db.sequelize.sync({ force: false }); // Use force: true to drop and recreate
        console.log('✅ All models synchronized successfully');
        
        // List all models
        console.log('\n📋 Models loaded:');
        Object.keys(db).forEach(modelName => {
            if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
                console.log(`   - ${modelName}`);
            }
        });
        
        console.log('\n🎉 Database models test completed successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing models:', error);
        process.exit(1);
    }
}

testModels();