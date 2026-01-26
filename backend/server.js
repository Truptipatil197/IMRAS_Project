const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database connection
const { sequelize } = require('./config/database');

// Import models (this initializes all associations)
const models = require('./models');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const grnRoutes = require('./routes/grnRoutes');
const stockRoutes = require('./routes/stockRoutes');
const reorderRoutes = require('./routes/reorderRoutes');
const batchRoutes = require('./routes/batchRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
require('./utils/scheduledJobs');

// Import new reorder automation routes
const reorderRuleRoutes = require('./routes/reorderRuleRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const reorderAutomationRoutes = require('./routes/reorderAutomationRoutes');

// Import search routes
const searchRoutes = require('./routes/searchRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'IMRAS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reorder', reorderRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// New reorder automation routes
app.use('/api/reorder/rules', reorderRuleRoutes);
app.use('/api/reorder/scheduler', schedulerRoutes);
app.use('/api/reorder/automation', reorderAutomationRoutes); // Mount at /automation to avoid conflicts with existing routes

// Search routes
app.use('/api/search', searchRoutes);

// Test Role-Based Routes (NEW)
app.use("/api/test", require("./routes/testRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection and server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (set to false in production)
    // Uncomment the line below to sync models on startup
    // await models.syncModels({ alter: true });
    // console.log('✅ Database models synchronized.');

    // Initialize reorder scheduler after database connection
    try {
      const reorderScheduler = require('./jobs/reorderScheduler');
      const autoStart = process.env.REORDER_SCHEDULER_AUTO_START !== 'false';

      if (autoStart) {
        reorderScheduler.start();
        console.log('✅ Reorder scheduler initialized and started');
      } else {
        console.log('ℹ️  Reorder scheduler initialized but not started (manual start required)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize reorder scheduler:', error);
      // Don't exit - server can still run without scheduler
    }

    // Initialize alert generation scheduler
    try {
      const alertScheduler = require('./jobs/alertGenerationScheduler');
      const autoStartAlerts = process.env.ALERT_SCHEDULER_AUTO_START !== 'false';

      if (autoStartAlerts) {
        alertScheduler.start();
        console.log('✅ Alert generation scheduler initialized and started');
      } else {
        console.log('ℹ️  Alert generation scheduler initialized but not started (manual start required)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize alert scheduler:', error);
      // Don't exit - server can still run without scheduler
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Shutdown reorder scheduler
    try {
      const reorderScheduler = require('./jobs/reorderScheduler');
      await reorderScheduler.shutdown();
      console.log('✅ Reorder scheduler shutdown complete');
    } catch (error) {
      console.error('Error shutting down reorder scheduler:', error);
    }

    // Shutdown alert scheduler
    try {
      const alertScheduler = require('./jobs/alertGenerationScheduler');
      await alertScheduler.shutdown();
      console.log('✅ Alert scheduler shutdown complete');
    } catch (error) {
      console.error('Error shutting down alert scheduler:', error);
    }

    // Close database connections
    await sequelize.close();
    console.log('✅ Database connections closed');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

module.exports = app;

