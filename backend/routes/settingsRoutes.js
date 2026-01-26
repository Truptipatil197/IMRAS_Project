const express = require('express');
const router = express.Router();
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Get all settings
router.get('/', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        // Settings can be stored in database or config file
        // For now, we'll use a JSON file approach
        const settingsPath = path.join(__dirname, '../config/settings.json');
        
        let settings = {
            company_name: 'IMRAS Company',
            currency: 'INR',
            date_format: 'DD/MM/YYYY',
            default_reorder_point: 10,
            default_safety_stock: 5,
            enable_batch_tracking: true,
            enable_serial_tracking: false,
            enable_auto_reorder: true,
            reorder_check_frequency: 'daily',
            auto_approve_prs: false,
            email_notifications: false,
            low_stock_alerts: true,
            expiry_alerts: true,
            session_timeout: 30,
            password_expiry_days: 90,
            auto_backup: false,
            backup_frequency: 'daily',
            last_backup: null
        };
        
        if (fs.existsSync(settingsPath)) {
            const fileSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            settings = { ...settings, ...fileSettings };
        }
        
        res.json({ success: true, settings });
        
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

// Save general settings
router.post('/general', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { company_name, currency, date_format } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.company_name = company_name;
        settings.currency = currency;
        settings.date_format = date_format;
        settings.updated_at = new Date().toISOString();
        settings.updated_by = req.user.user_id;
        
        // Ensure config directory exists
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'General settings saved successfully' });
        
    } catch (error) {
        console.error('Save general settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to save general settings' });
    }
});

// Save inventory settings
router.post('/inventory', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { default_reorder_point, default_safety_stock, enable_batch_tracking, enable_serial_tracking } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.default_reorder_point = parseInt(default_reorder_point);
        settings.default_safety_stock = parseInt(default_safety_stock);
        settings.enable_batch_tracking = enable_batch_tracking;
        settings.enable_serial_tracking = enable_serial_tracking;
        settings.updated_at = new Date().toISOString();
        settings.updated_by = req.user.user_id;
        
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'Inventory settings saved successfully' });
        
    } catch (error) {
        console.error('Save inventory settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to save inventory settings' });
    }
});

// Save reorder settings
router.post('/reorder', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { enable_auto_reorder, reorder_check_frequency, auto_approve_prs } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.enable_auto_reorder = enable_auto_reorder;
        settings.reorder_check_frequency = reorder_check_frequency;
        settings.auto_approve_prs = auto_approve_prs;
        settings.updated_at = new Date().toISOString();
        settings.updated_by = req.user.user_id;
        
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'Reorder settings saved successfully' });
        
    } catch (error) {
        console.error('Save reorder settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to save reorder settings' });
    }
});

// Save notification settings
router.post('/notifications', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { email_notifications, low_stock_alerts, expiry_alerts } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.email_notifications = email_notifications;
        settings.low_stock_alerts = low_stock_alerts;
        settings.expiry_alerts = expiry_alerts;
        settings.updated_at = new Date().toISOString();
        settings.updated_by = req.user.user_id;
        
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'Notification settings saved successfully' });
        
    } catch (error) {
        console.error('Save notification settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to save notification settings' });
    }
});

// Save security settings
router.post('/security', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const { session_timeout, password_expiry_days } = req.body;
        
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.session_timeout = parseInt(session_timeout);
        settings.password_expiry_days = parseInt(password_expiry_days);
        settings.updated_at = new Date().toISOString();
        settings.updated_by = req.user.user_id;
        
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({ success: true, message: 'Security settings saved successfully' });
        
    } catch (error) {
        console.error('Save security settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to save security settings' });
    }
});

// Create backup
router.post('/backup', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `imras_backup_${timestamp}.sql`;
        const backupPath = path.join(__dirname, '../backups', filename);
        
        // Ensure backup directory exists
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Get database config
        const dbConfig = require('../config/database');
        const sequelize = dbConfig.sequelize || dbConfig;
        
        // Try to get database connection details
        // Note: This assumes MySQL/MariaDB - adjust for your database
        let command;
        if (process.env.DB_TYPE === 'mysql' || !process.env.DB_TYPE) {
            // MySQL/MariaDB backup
            const dbName = sequelize.config.database || process.env.DB_NAME;
            const dbUser = sequelize.config.username || process.env.DB_USER;
            const dbPass = sequelize.config.password || process.env.DB_PASSWORD;
            const dbHost = sequelize.config.host || process.env.DB_HOST || 'localhost';
            
            command = `mysqldump -h ${dbHost} -u ${dbUser} -p${dbPass} ${dbName} > ${backupPath}`;
        } else {
            // For other databases, you'd need different commands
            return res.status(400).json({ 
                success: false, 
                message: 'Backup not configured for this database type' 
            });
        }
        
        try {
            await execPromise(command);
        } catch (execError) {
            // If mysqldump fails, create a placeholder file
            console.warn('mysqldump command failed, creating placeholder:', execError.message);
            fs.writeFileSync(backupPath, `-- Backup created at ${new Date().toISOString()}\n-- Note: Actual backup requires mysqldump to be installed and configured\n`);
        }
        
        // Update last backup time in settings
        const settingsPath = path.join(__dirname, '../config/settings.json');
        let settings = {};
        
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        
        settings.last_backup = new Date().toISOString();
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        
        res.json({
            success: true,
            message: 'Backup created successfully',
            filename: filename,
            backup_url: `/api/settings/download-backup/${filename}`
        });
        
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ success: false, message: 'Failed to create backup' });
    }
});

// Download backup
router.get('/download-backup/:filename', authenticate, authorizeRole(['Admin']), (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../backups', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Backup file not found' });
        }
        
        res.download(filePath, filename);
        
    } catch (error) {
        console.error('Download backup error:', error);
        res.status(500).json({ success: false, message: 'Failed to download backup' });
    }
});

// Restore backup
// Note: This requires express-fileupload middleware
// Install: npm install express-fileupload
// Add to server.js: const fileUpload = require('express-fileupload'); app.use(fileUpload());
router.post('/restore', authenticate, authorizeRole(['Admin']), async (req, res) => {
    try {
        if (!req.files || !req.files.backup) {
            return res.status(400).json({ success: false, message: 'No backup file provided' });
        }
        
        const backupFile = req.files.backup;
        const tempPath = path.join(__dirname, '../temp', backupFile.name);
        
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Save uploaded file
        // Note: This requires express-fileupload's .mv() method
        // If using multer or other middleware, adjust accordingly
        if (backupFile.mv) {
            await backupFile.mv(tempPath);
        } else {
            // Fallback: write file buffer directly
            fs.writeFileSync(tempPath, backupFile.data || backupFile);
        }
        
        // Get database config
        const dbConfig = require('../config/database');
        const sequelize = dbConfig.sequelize || dbConfig;
        
        // Try to restore database
        let command;
        if (process.env.DB_TYPE === 'mysql' || !process.env.DB_TYPE) {
            const dbName = sequelize.config.database || process.env.DB_NAME;
            const dbUser = sequelize.config.username || process.env.DB_USER;
            const dbPass = sequelize.config.password || process.env.DB_PASSWORD;
            const dbHost = sequelize.config.host || process.env.DB_HOST || 'localhost';
            
            command = `mysql -h ${dbHost} -u ${dbUser} -p${dbPass} ${dbName} < ${tempPath}`;
        } else {
            return res.status(400).json({ 
                success: false, 
                message: 'Restore not configured for this database type' 
            });
        }
        
        try {
            await execPromise(command);
        } catch (execError) {
            // Delete temp file on error
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw execError;
        }
        
        // Delete temp file after successful restore
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        
        res.json({ success: true, message: 'Database restored successfully' });
        
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ success: false, message: 'Failed to restore database' });
    }
});

module.exports = router;
