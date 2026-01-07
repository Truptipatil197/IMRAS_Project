IMRAS - Inventory Management & Reorder Automation System
📋 Overview

IMRAS (Inventory Management & Reorder Automation System) is a comprehensive web-based inventory management solution designed to streamline warehouse operations, automate reordering processes, and provide real-time insights into stock levels.

Key Features

✅ Real-time Inventory Tracking – Monitor stock levels across multiple warehouses

🤖 Automated Reordering – Intelligent system automatically generates purchase requisitions

🏭 Multi-warehouse Support – Manage multiple locations with hierarchical storage

📦 Batch & Expiry Management – Track batches, lot numbers, and expiration dates

🔄 FEFO Logic – First-Expired-First-Out for expiry-sensitive items

📊 Comprehensive Reports – 15+ built-in reports and analytics with Chart.js

👥 Role-based Access – Three user levels (Admin, Manager, Staff)

🔍 Complete Audit Trail – Every transaction logged with timestamp and user

📧 Email Notifications – Automated alerts for low stock, expiring items

🚀 Quick Start
Prerequisites

Node.js 18.x or higher (LTS recommended)

npm 9.x or higher

MySQL 8.0 or higher

Git

Installation
Option 1: Automated Setup (Recommended)

Windows:

git clone https://github.com/Truptipatil197/imras-project.git
cd imras-project

# Run setup script (installs backend dependencies)
setup.bat

# Start backend
cd backend
npm run dev

# Start frontend (static HTML/JS/React/Vite)
cd ../frontend

#  static frontend:
npx http-server -p 3000


Linux/Mac:

git clone https://github.com/Truptipatil197/imras-project.git
cd imras-project

# Make setup script executable
chmod +x setup.sh
./setup.sh

# Start backend
cd backend
npm run dev

# Start frontend (static HTML/JS/React/Vite)
cd ../frontend

# static frontend:
npx http-server -p 3000


Option 2: Manual Setup

Clone the repository

git clone https://github.com/Truptipatil197/imras-project.git
cd imras-project


Install dependencies

cd backend
npm install


Setup environment variables

# Copy example env file
cp .env.example .env

# Edit .env to update database credentials, JWT secret, email settings, etc.


Create MySQL database

mysql -u root -p
CREATE DATABASE imras_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;


Run database migrations

npm run migrate


Seed initial data (optional)

npm run seed


Start the backend

npm run dev          # development mode with auto-reload
# or
npm start            # production mode


Start the frontend

cd ../frontend
# Static frontend:
npx http-server -p 3000

Access the application

Open your browser and navigate to: http://localhost:3000

🔐 Default Login Credentials

Admin

Username: admin
Password: newpassword456

Manager

Username: manager1
Password: password123

Staff

Username: staff1
Password: password123

⚠️ Important: Change these passwords immediately after first login!

📁 Project Structure (imras-project/)
imras-project/
│
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   ├── auth.js
│   │   └── email.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── inventoryController.js
│   │   ├── procurementController.js
│   │   ├── warehouseController.js
│   │   ├── reorderController.js
│   │   └── reportController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Item.js
│   │   ├── Warehouse.js
│   │   ├── Category.js
│   │   ├── Batch.js
│   │   ├── PurchaseRequisition.js
│   │   ├── PurchaseOrder.js
│   │   ├── GRN.js
│   │   ├── Supplier.js
│   │   └── index.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── procurementRoutes.js
│   │   ├── warehouseRoutes.js
│   │   ├── reorderRoutes.js
│   │   └── reportRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── services/
│   │   ├── reorderService.js
│   │   ├── alertService.js
│   │   ├── emailService.js
│   │   └── reportService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── helpers.js
│   │   └── constants.js
│   ├── migrations/
│   ├── seeders/
│   └── server.js
│
├── frontend/
│   ├── css/
│   │   ├── main.css
│   │   └── dashboard.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── inventory.js
│   │   ├── procurement.js
│   │   ├── warehouse.js
│   │   ├── reports.js
│   │   └── charts.js
│   ├── pages/
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── inventory.html
│   │   ├── procurement.html
│   │   ├── warehouse.html
│   │   └── reports.html
│   └── assets/images/
│
├── docs/
├── tests/
├── logs/
├── uploads/
├── reports/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── setup.sh
├── setup.bat
├── README.md
└── LICENSE

🔧 Configuration
Environment Variables
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=imras_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM=noreply@imras.com

# Reorder Automation
REORDER_SCHEDULER_ENABLED=true
REORDER_CHECK_INTERVAL=3600000 # 1 hour in milliseconds

# File Upload
MAX_FILE_SIZE=10485760 # 10MB
UPLOAD_DIR=uploads

📖 Available Scripts
Development
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start production server

Database
npm run migrate         # Run migrations
npm run migrate:undo    # Undo last migration
npm run seed            # Seed database
npm run seed:undo       # Undo all seeds

Testing
npm test                # Run all tests
npm run test:unit       # Run unit tests
npm run test:api        # Run API tests
npm run test:coverage   # Coverage report

Code Quality
npm run lint            # Check style
npm run lint:fix        # Fix style issues
npm run format          # Format code with Prettier

Setup
npm run setup           # Automated setup (install + migrate + seed)

Utilities
npm run logs            # View logs
npm run clean           # Clean temp files

🔌 API Documentation

Base URL: http://localhost:3000/api/v1

(Tables for Authentication, Inventory, Procurement endpoints as described before)

See API_DOCUMENTATION.md
 for full details

🧪 Testing
npm install
npm test
npm test -- inventory.test.js
npm run test:coverage
npm test -- --watch

🐛 Troubleshooting

Database Connection Error → Ensure MySQL is running

Port Already in Use → Change port or kill process using port

JWT Secret Missing → Ensure .env has JWT_SECRET

Module Not Found → Run npm install

Migration Errors → Run npm run migrate:undo:all then npm run migrate

Deployment
Production
export NODE_ENV=production
npm ci --production
npm install -g pm2
pm2 start server.js --name imras-api
pm2 save
pm2 startup

Docker
docker build -t imras:latest .
docker-compose up -d

Contributing

Fork repository

Create feature branch

Commit changes

Push branch

Open Pull Request

Code Style: ESLint, Airbnb JS Guide, Prettier

📄 License

MIT License – see LICENSE

Authors

Trupti Patil – Initial work – GitHub

Acknowledgments

Express.js | Sequelize | Chart.js | Bootstrap / Tailwind | All contributors

Version: 1.0.0
Last Updated: January 2026
