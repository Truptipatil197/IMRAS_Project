# Database Setup Guide

## Table of Contents
1. [MySQL Installation](#1-mysql-installation)
2. [Database Creation](#2-database-creation)
3. [Configuration](#3-configuration)
4. [Backup & Recovery](#4-backup--recovery)
5. [Performance Tuning](#5-performance-tuning)

## 1. MySQL Installation

### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install MySQL Server 8.0
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify installation
mysql --version
```

### CentOS/RHEL
```bash
# Add MySQL repository
sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm

# Install MySQL Server
sudo yum install -y mysql-community-server

# Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Get temporary password
sudo grep 'temporary password' /var/log/mysqld.log

# Secure installation
sudo mysql_secure_installation
```

## 2. Database Creation

### Create Database and User
```sql
-- Connect to MySQL
sudo mysql -u root -p

-- Create database
CREATE DATABASE imras_production 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create database user
CREATE USER 'imras_user'@'localhost' 
IDENTIFIED BY 'STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON imras_production.* 
TO 'imras_user'@'localhost' 
WITH GRANT OPTION;

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT User, Host FROM mysql.user;
```

### Import Schema
```bash
# If you have a schema file
mysql -u imras_user -p imras_production < schema.sql

# Or run migrations if using Sequelize
cd /opt/imras/app/backend
npx sequelize-cli db:migrate
```

## 3. Configuration

### MySQL Configuration
Edit MySQL configuration file:

```bash
# Ubuntu/Debian
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# CentOS/RHEL
sudo nano /etc/my.cnf
```

Add/Modify these settings:
```ini
[mysqld]
# Basic Settings
user                    = mysql
pid-file                = /var/run/mysqld/mysqld.pid
socket                  = /var/run/mysqld/mysqld.sock
port                    = 3306
basedir                 = /usr
datadir                 = /var/lib/mysql
tmpdir                  = /tmp
bind-address            = 127.0.0.1
max_connections         = 200
max_allowed_packet      = 64M

# Character Set
character-set-server    = utf8mb4
collation-server        = utf8mb4_unicode_ci

# InnoDB Settings
innodb_buffer_pool_size = 2G
innodb_log_file_size    = 256M
innodb_flush_method     = O_DIRECT
innodb_file_per_table   = 1
innodb_flush_log_at_trx_commit = 2

# Logging
log_error               = /var/log/mysql/error.log
slow_query_log          = 1
slow_query_log_file     = /var/log/mysql/slow.log
long_query_time         = 2

# Binary Logging
log_bin                 = /var/log/mysql/mysql-bin.log
expire_logs_days        = 7
max_binlog_size         = 100M
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

## 4. Backup & Recovery

### Create Backup Script
```bash
sudo nano /usr/local/bin/backup-imras-db.sh
```

```bash
#!/bin/bash
# IMRAS Database Backup Script

# Configuration
DB_NAME="imras_production"
DB_USER="imras_user"
DB_PASS="STRONG_PASSWORD_HERE"
BACKUP_DIR="/var/backups/imras"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup filename
BACKUP_FILE="$BACKUP_DIR/imras_db_$DATE.sql.gz"

# Perform backup
echo "Starting database backup: $BACKUP_FILE"
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_FILE

# Check if backup successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Delete old backups
    find $BACKUP_DIR -name "imras_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups deleted (older than $RETENTION_DAYS days)"
else
    echo "Backup failed!"
    exit 1
fi
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/backup-imras-db.sh
```

### Schedule Backups
```bash
# Edit crontab
sudo crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-imras-db.sh >> /var/log/imras-backup.log 2>&1
```

### Restore from Backup
```bash
# Decompress and restore
gunzip < /var/backups/imras/imras_db_20231219_020000.sql.gz | mysql -u imras_user -p imras_production
```

## 5. Performance Tuning

### Index Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_stock_ledger_item_date ON stock_ledger(item_id, transaction_date);

-- Analyze tables
ANALYZE TABLE items, stock_ledger, purchase_requisitions;
```

### Query Optimization
```sql
-- Enable query profiling
SET profiling = 1;

-- Run your query
SELECT * FROM items WHERE category_id = 1;

-- Show profile
SHOW PROFILES;
SHOW PROFILE FOR QUERY 1;
```

### Connection Pooling
Configure in your application's database connection settings:
```javascript
// Example for Sequelize
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});
```

### Monitoring
```sql
-- Check current connections
SHOW STATUS WHERE `variable_name` = 'Threads_connected';

-- Show process list
SHOW PROCESSLIST;

-- Check InnoDB status
SHOW ENGINE INNODB STATUS\G
```

## Next Steps

1. Proceed with [Backend Deployment](../deployment/BACKEND_DEPLOYMENT.md)
2. Configure [Web Server & SSL](../deployment/WEBSERVER_CONFIG.md)
3. Review [Security Hardening](../deployment/SECURITY_HARDENING.md) guidelines
