#!/bin/bash
# ============================================
# IMRAS - Automated Setup Script
# For Linux/Mac
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "IMRAS - Inventory Management System"
echo "Automated Setup Script"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed"
    echo "Please install Node.js 18.x or higher from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Node.js found: $(node --version)"
echo ""

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not installed"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} npm found: $(npm --version)"
echo ""

# Check MySQL
if command -v mysql &> /dev/null; then
    if ! pgrep -x "mysqld" > /dev/null; then
        echo -e "${YELLOW}[WARNING]${NC} MySQL service is not running"
        echo "Starting MySQL service..."
        sudo service mysql start 2>/dev/null || brew services start mysql 2>/dev/null
        sleep 2
    fi
    echo -e "${GREEN}[INFO]${NC} MySQL is running"
else
    echo -e "${YELLOW}[WARNING]${NC} MySQL not found in PATH"
    echo "Make sure MySQL is installed and running"
fi
echo ""

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env file not found"
    if [ -f ".env.example" ]; then
        echo -e "${GREEN}[INFO]${NC} Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${GREEN}[SUCCESS]${NC} .env file created"
        echo -e "${YELLOW}[IMPORTANT]${NC} Please edit .env file with your database credentials"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to exit and configure .env first..."
    else
        echo -e "${RED}[ERROR]${NC} .env.example file not found"
        exit 1
    fi
fi

# Install dependencies
echo -e "${GREEN}[INFO]${NC} Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install dependencies"
    exit 1
fi
echo -e "${GREEN}[SUCCESS]${NC} Dependencies installed"
echo ""

# Create necessary directories
echo -e "${GREEN}[INFO]${NC} Creating necessary directories..."
mkdir -p logs uploads reports backups
echo -e "${GREEN}[SUCCESS]${NC} Directories created"
echo ""

# Database setup
echo -e "${BLUE}[INFO]${NC} Database Setup"
echo "---------------------------------------------"
read -p "Do you want to create/setup the database now? (y/n): " setup_db

if [ "$setup_db" = "y" ] || [ "$setup_db" = "Y" ]; then
    # Load .env variables
    export $(cat .env | grep -v '^#' | xargs)
    
    echo -e "${GREEN}[INFO]${NC} Creating database if not exists..."
    mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[SUCCESS]${NC} Database ready"
        
        echo -e "${GREEN}[INFO]${NC} Running database migrations..."
        npm run migrate
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[SUCCESS]${NC} Migrations completed"
            
            read -p "Do you want to seed initial data (users, categories, etc.)? (y/n): " seed_db
            
            if [ "$seed_db" = "y" ] || [ "$seed_db" = "Y" ]; then
                echo -e "${GREEN}[INFO]${NC} Seeding database..."
                npm run seed
                echo -e "${GREEN}[SUCCESS]${NC} Database seeded"
            fi
        else
            echo -e "${RED}[ERROR]${NC} Migration failed"
            exit 1
        fi
    else
        echo -e "${RED}[ERROR]${NC} Failed to create database"
        echo "Please check your database credentials in .env file"
        exit 1
    fi
fi
echo ""

echo "============================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "============================================"
echo ""
echo "To start the application:"
echo "  Development mode: npm run dev"
echo "  Production mode:  npm start"
echo ""
echo "Default Login Credentials:"
echo "  Admin:   username: admin    password: newpassword456"
echo "  Manager: username: manager1  password: password123"
echo "  Staff:   username: staff1    password: password123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change these passwords after first login!${NC}"
echo ""
echo "Application will be available at: http://localhost:${PORT:-3000}"
echo "============================================"