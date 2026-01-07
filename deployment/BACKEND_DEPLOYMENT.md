# Backend Deployment Guide

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Node.js Installation](#2-nodejs-installation)
3. [Application Setup](#3-application-setup)
4. [Process Management with PM2](#4-process-management-with-pm2)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Migrations](#6-database-migrations)
7. [Testing](#7-testing)
8. [Maintenance](#8-maintenance)

## 1. Prerequisites

- Server with SSH access
- Node.js v16.x or higher
- MySQL 8.0+ or MariaDB 10.5+
- Git
- PM2 (will be installed in this guide)

## 2. Node.js Installation

### Ubuntu/Debian
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### CentOS/RHEL
```bash
# Using NodeSource
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

## 3. Application Setup

### Create Application User
```bash
# Create system user for the application
sudo useradd -r -s /bin/bash -d /opt/imras -m imras

# Set password for the user
sudo passwd imras

# Add to necessary groups (e.g., www-data for web server access)
sudo usermod -aG www-data imras
```

### Clone Repository
```bash
# Switch to imras user
sudo su - imras

# Clone the repository
git clone https://github.com/your-org/imras.git /opt/imras/app
cd /opt/imras/app

# Install dependencies
npm install --production

# Set proper permissions
chmod -R 750 /opt/imras
chown -R imras:imras /opt/imras
```

## 4. Process Management with PM2

### Install PM2 Globally
```bash
sudo npm install -g pm2
```

### Create PM2 Ecosystem File
Create `ecosystem.config.js` in your application root:

```javascript
module.exports = {
  apps: [{
    name: 'imras-backend',
    script: './app.js',
    cwd: '/opt/imras/app/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/imras/pm2-error.log',
    out_file: '/var/log/imras/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git']
  }]
};
```

### Create Log Directory
```bash
sudo mkdir -p /var/log/imras
sudo chown -R imras:imras /var/log/imras
```

### Start Application with PM2
```bash
# As imras user
cd /opt/imras/app/backend
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Set up PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u imras --hp /opt/imras
```

## 5. Environment Configuration

Create a `.env` file in your backend directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=imras_production
DB_USER=imras_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# JWT Configuration
JWT_SECRET=your_very_strong_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=30d

# Reorder Scheduler
REORDER_SCHEDULER_ENABLED=true
REORDER_SCHEDULER_AUTO_START=true
REORDER_SCHEDULE=0 * * * *
REORDER_BATCH_SIZE=50

# Alerts
ALERT_ESCALATION_THRESHOLD_HOURS=24
ALERT_CRITICAL_THRESHOLD_HOURS=6

# Email (if configured)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourcompany.com
EMAIL_PASSWORD=email_app_password
EMAIL_FROM=IMRAS Alerts <noreply@yourcompany.com>

# Timezone
TZ=Asia/Kolkata

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIRECTORY=/var/log/imras

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=15*60*1000  // 15 minutes
RATE_LIMIT_MAX=100  // limit each IP to 100 requests per windowMs
```

Set proper permissions for the .env file:
```bash
chmod 600 /opt/imras/app/backend/.env
```

## 6. Database Migrations

### Run Migrations
```bash
# Navigate to backend directory
cd /opt/imras/app/backend

# Install Sequelize CLI if not already installed
npm install --save-dev sequelize-cli

# Run migrations
npx sequelize-cli db:migrate

# If you need to rollback
# npx sequelize-cli db:migrate:undo
# npx sequelize-cli db:migrate:undo:all
```

### Seed Initial Data (Optional)
```bash
# Run seeders
npx sequelize-cli db:seed:all

# Or run specific seeder
# npx sequelize-cli db:seed --seed 20231201000000-admin-user.js
```

## 7. Testing

### Test API Endpoints
```bash
# Test API is running
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"2023-12-19T17:45:00.000Z"}

# Test database connection
curl http://localhost:5000/api/health/db

# Test authentication (if applicable)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Check Logs
```bash
# View PM2 logs
pm2 logs imras-backend

# View error logs
tail -f /var/log/imras/error.log

# View application logs
tail -f /var/log/imras/application.log
```

## 8. Maintenance

### Common PM2 Commands
```bash
# List all applications
pm2 list

# Monitor resources
pm2 monit

# View logs in real-time
pm2 logs imras-backend --lines 100

# Restart application
pm2 restart imras-backend

# Stop application
pm2 stop imras-backend

# Delete application from PM2
pm2 delete imras-backend
```

### Updating the Application
```bash
# As imras user
cd /opt/imras/app

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Run database migrations (if any)
npx sequelize-cli db:migrate

# Restart the application
pm2 restart imras-backend
```

### Monitoring
```bash
# Check application status
pm2 status

# Check server resources
top
htop

# Check disk space
df -h

# Check memory usage
free -m
```

## Next Steps

1. Proceed with [Frontend Deployment](../deployment/FRONTEND_DEPLOYMENT.md)
2. Configure [Web Server & SSL](../deployment/WEBSERVER_CONFIG.md)
3. Review [Security Hardening](../deployment/SECURITY_HARDENING.md) guidelines
