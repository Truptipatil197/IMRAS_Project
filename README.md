\# IMRAS - Inventory Management \& Reorder Automation System



\[!\[Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)

\[!\[Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)

\[!\[MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)

\[!\[License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)



\## 📋 Overview



IMRAS (Inventory Management \& Reorder Automation System) is a comprehensive web-based inventory management solution designed to streamline warehouse operations, automate reordering processes, and provide real-time insights into stock levels.



\### Key Features



\- ✅ \*\*Real-time Inventory Tracking\*\* - Monitor stock levels across multiple warehouses

\- 🤖 \*\*Automated Reordering\*\* - Intelligent system automatically generates purchase requisitions

\- 🏭 \*\*Multi-warehouse Support\*\* - Manage multiple locations with hierarchical storage

\- 📦 \*\*Batch \& Expiry Management\*\* - Track batches, lot numbers, and expiration dates

\- 🔄 \*\*FEFO Logic\*\* - First-Expired-First-Out for expiry-sensitive items

\- 📊 \*\*Comprehensive Reports\*\* - 15+ built-in reports and analytics with Chart.js

\- 👥 \*\*Role-based Access\*\* - Three user levels (Admin, Manager, Staff)

\- 🔍 \*\*Complete Audit Trail\*\* - Every transaction logged with timestamp and user

\- 📧 \*\*Email Notifications\*\* - Automated alerts for low stock, expiring items



\## 🚀 Quick Start



\### Prerequisites



\- \*\*Node.js\*\* 18.x or higher (LTS recommended)

\- \*\*npm\*\* 9.x or higher

\- \*\*MySQL\*\* 8.0 or higher

\- \*\*Git\*\*



\### Installation



\#### Option 1: Automated Setup (Recommended)



\*\*Windows:\*\*

```bash

git clone https://github.com/yourusername/imras.git

cd imras

npm run setup

npm start

```



\*\*Linux/Mac:\*\*

```bash

git clone https://github.com/yourusername/imras.git

cd imras

chmod +x setup.sh

./setup.sh

npm start

```



\#### Option 2: Manual Setup



1\. \*\*Clone the repository\*\*

```bash

&nbsp;  git clone https://github.com/yourusername/imras.git

&nbsp;  cd imras

```



2\. \*\*Install dependencies\*\*

```bash

&nbsp;  npm install

```



3\. \*\*Setup environment variables\*\*

```bash

&nbsp;  # Copy the example environment file

&nbsp;  cp .env.example .env

&nbsp;  

&nbsp;  # Edit .env with your configuration

&nbsp;  # Update database credentials, JWT secret, email settings, etc.

```



4\. \*\*Create MySQL database\*\*

```sql

&nbsp;  mysql -u root -p

&nbsp;  CREATE DATABASE imras\_db CHARACTER SET utf8mb4 COLLATE utf8mb4\_unicode\_ci;

&nbsp;  EXIT;

```



5\. \*\*Run database migrations\*\*

```bash

&nbsp;  npm run migrate

```



6\. \*\*Seed initial data (optional)\*\*

```bash

&nbsp;  npm run seed

```



7\. \*\*Start the application\*\*

```bash

&nbsp;  # Development mode with auto-reload

&nbsp;  npm run dev

&nbsp;  

&nbsp;  # Production mode

&nbsp;  npm start

```



8\. \*\*Access the application\*\*
Open your browser and navigate to: http://localhost:3000

\## 🔐 Default Login Credentials



After initial setup, use these credentials:



\- \*\*Admin\*\*

&nbsp; - Username: `admin`

&nbsp; - Password: `newpassword456`



\- \*\*Manager\*\*

&nbsp; - Username: `manager1`

&nbsp; - Password: `password123`



\- \*\*Staff\*\*

&nbsp; - Username: `staff1`

&nbsp; - Password: `password123`



⚠️ \*\*Important:\*\* Change these passwords immediately after first login!



\## 📁 Project Structure
imras/

│

├── backend/

│   ├── config/

│   │   ├── database.js         # Database configuration

│   │   ├── auth.js             # JWT configuration

│   │   └── email.js            # Email configuration

│   │

│   ├── controllers/

│   │   ├── authController.js

│   │   ├── inventoryController.js

│   │   ├── procurementController.js

│   │   ├── warehouseController.js

│   │   ├── reorderController.js

│   │   └── reportController.js

│   │

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

│   │   └── index.js            # Model associations

│   │

│   ├── routes/

│   │   ├── authRoutes.js

│   │   ├── inventoryRoutes.js

│   │   ├── procurementRoutes.js

│   │   ├── warehouseRoutes.js

│   │   ├── reorderRoutes.js

│   │   └── reportRoutes.js

│   │

│   ├── middleware/

│   │   ├── authMiddleware.js   # JWT verification

│   │   ├── roleMiddleware.js   # Role-based access control

│   │   ├── errorHandler.js     # Error handling

│   │   └── validator.js        # Input validation

│   │

│   ├── services/

│   │   ├── reorderService.js   # Reorder automation logic

│   │   ├── alertService.js     # Alert generation

│   │   ├── emailService.js     # Email notifications

│   │   └── reportService.js    # Report generation

│   │

│   ├── utils/

│   │   ├── logger.js           # Logging utility

│   │   ├── helpers.js          # Helper functions

│   │   └── constants.js        # Application constants

│   │

│   ├── migrations/             # Database migrations

│   ├── seeders/                # Database seeders

│   └── server.js               # Main server file

│

├── frontend/

│   ├── css/

│   │   ├── main.css

│   │   └── dashboard.css

│   │

│   ├── js/

│   │   ├── app.js

│   │   ├── auth.js

│   │   ├── inventory.js

│   │   ├── procurement.js

│   │   ├── warehouse.js

│   │   ├── reports.js

│   │   └── charts.js           # Chart.js visualizations

│   │

│   ├── pages/

│   │   ├── index.html

│   │   ├── login.html

│   │   ├── dashboard.html

│   │   ├── inventory.html

│   │   ├── procurement.html

│   │   ├── warehouse.html

│   │   └── reports.html

│   │

│   └── assets/

│       └── images/

│

├── docs/

│   ├── USER\_MANUAL.md

│   ├── API\_DOCUMENTATION.md

│   ├── DATABASE\_SCHEMA.md

│   └── DEPLOYMENT\_GUIDE.md

│

├── tests/

│   ├── unit/

│   ├── integration/

│   └── api/

│

├── logs/                       # Application logs

├── uploads/                    # File uploads

├── reports/                    # Generated reports

│

├── .env.example               # Example environment variables

├── .gitignore                 # Git ignore file

├── package.json               # Node.js dependencies

├── package-lock.json

├── server.js                  # Application entry point

├── setup.sh                   # Linux/Mac setup script

├── setup.bat                  # Windows setup script

├── README.md                  # This file

└── LICENSE                    # License file



\## 🔧 Configuration



\### Environment Variables



Edit the `.env` file with your configuration:

```env

\# Server Configuration

NODE\_ENV=development

PORT=3000

API\_PREFIX=/api/v1



\# Database Configuration

DB\_HOST=localhost

DB\_PORT=3306

DB\_NAME=imras\_db

DB\_USER=root

DB\_PASSWORD=your\_password



\# JWT Configuration

JWT\_SECRET=your-super-secret-jwt-key-change-this

JWT\_EXPIRES\_IN=24h

JWT\_REFRESH\_EXPIRES\_IN=7d



\# Email Configuration

SMTP\_HOST=smtp.gmail.com

SMTP\_PORT=587

SMTP\_SECURE=false

SMTP\_USER=your-email@gmail.com

SMTP\_PASSWORD=your-email-password

EMAIL\_FROM=noreply@imras.com



\# Reorder Automation

REORDER\_SCHEDULER\_ENABLED=true

REORDER\_CHECK\_INTERVAL=3600000  # 1 hour in milliseconds



\# File Upload

MAX\_FILE\_SIZE=10485760  # 10MB

UPLOAD\_DIR=uploads

```



\## 📖 Available Scripts

```bash

\# Development

npm run dev              # Start with nodemon (auto-reload)

npm start               # Start production server



\# Database

npm run migrate         # Run database migrations

npm run migrate:undo    # Undo last migration

npm run seed            # Seed database with initial data

npm run seed:undo       # Undo all seeds



\# Testing

npm test               # Run all tests

npm run test:unit      # Run unit tests

npm run test:api       # Run API tests

npm run test:coverage  # Generate coverage report



\# Code Quality

npm run lint           # Check code style

npm run lint:fix       # Fix code style issues

npm run format         # Format code with Prettier



\# Setup

npm run setup          # Automated setup (install + migrate + seed)



\# Utilities

npm run logs           # View application logs

npm run clean          # Clean temporary files

```



\## 🔌 API Documentation



\### Base URL

http://localhost:3000/api/v1



\### Authentication Endpoints

POST   /api/v1/auth/register      # Register new user

POST   /api/v1/auth/login         # User login

POST   /api/v1/auth/logout        # User logout

POST   /api/v1/auth/refresh       # Refresh JWT token

GET    /api/v1/auth/me            # Get current user

PUT    /api/v1/auth/password      # Change password



\### Inventory Endpoints

GET    /api/v1/inventory          # Get all items

POST   /api/v1/inventory          # Create new item

GET    /api/v1/inventory/:id      # Get item by ID

PUT    /api/v1/inventory/:id      # Update item

DELETE /api/v1/inventory/:id      # Delete item

GET    /api/v1/inventory/low-stock     # Get low stock items

GET    /api/v1/inventory/expiring      # Get expiring items

POST   /api/v1/inventory/adjust        # Stock adjustment

POST   /api/v1/inventory/transfer      # Stock transfer



\### Procurement Endpoints

GET    /api/v1/procurement/pr          # Get all PRs

POST   /api/v1/procurement/pr          # Create PR

PUT    /api/v1/procurement/pr/:id      # Update PR

DELETE /api/v1/procurement/pr/:id      # Delete PR

GET    /api/v1/procurement/po          # Get all POs

POST   /api/v1/procurement/po          # Create PO

PUT    /api/v1/procurement/po/:id      # Update PO

GET    /api/v1/procurement/grn         # Get all GRNs

POST   /api/v1/procurement/grn         # Create GRN

PUT    /api/v1/procurement/grn/:id     # Complete GRN



For complete API documentation, see \[API\_DOCUMENTATION.md](docs/API\_DOCUMENTATION.md)



\## 🧪 Testing



Run tests using Jest:

```bash

\# Install test dependencies (already in package.json)

npm install



\# Run all tests

npm test



\# Run specific test suite

npm test -- inventory.test.js



\# Run with coverage

npm run test:coverage



\# Watch mode for development

npm test -- --watch

```



\## 🐛 Troubleshooting



\### Common Issues



\*\*1. Database Connection Error\*\*

Error: connect ECONNREFUSED 127.0.0.1:3306

\*\*Solution:\*\* Ensure MySQL is running and credentials in `.env` are correct.

```bash

\# Start MySQL

sudo service mysql start   # Linux

brew services start mysql  # Mac

net start MySQL80          # Windows

```



\*\*2. Port Already in Use\*\*

Error: listen EADDRINUSE: address already in use :::3000

\*\*Solution:\*\* Change port in `.env` or kill process using port 3000:

```bash

\# Linux/Mac

lsof -ti:3000 | xargs kill -9



\# Windows

netstat -ano | findstr :3000

taskkill /PID <PID> /F

```



\*\*3. JWT Secret Missing\*\*

Error: JWT\_SECRET is not defined

\*\*Solution:\*\* Make sure `.env` file exists with JWT\_SECRET defined.



\*\*4. Module Not Found\*\*

Error: Cannot find module 'express'

\*\*Solution:\*\* Install dependencies:

```bash

npm install

```



\*\*5. Migration Errors\*\*

Error: Table 'users' already exists

\*\*Solution:\*\* Reset database:

```bash

npm run migrate:undo:all

npm run migrate

```



\##  Deployment



\### Production Deployment



For production deployment, see \[DEPLOYMENT\_GUIDE.md](docs/DEPLOYMENT\_GUIDE.md).



Quick production setup:

```bash

\# Set production environment

export NODE\_ENV=production



\# Install production dependencies only

npm ci --production



\# Run with PM2 (Process Manager)

npm install -g pm2

pm2 start server.js --name imras-api

pm2 save

pm2 startup

```



\### Docker Deployment

```bash

\# Build Docker image

docker build -t imras:latest .



\# Run with Docker Compose

docker-compose up -d

```



\##  Contributing



Contributions are welcome! Please follow these steps:



1\. Fork the repository

2\. Create a feature branch (`git checkout -b feature/AmazingFeature`)

3\. Commit your changes (`git commit -m 'Add some AmazingFeature'`)

4\. Push to the branch (`git push origin feature/AmazingFeature`)

5\. Open a Pull Request



\### Code Style



\- Use ESLint for JavaScript linting

\- Follow Airbnb JavaScript Style Guide

\- Use Prettier for code formatting

\- Write meaningful commit messages



\## 📄 License



This project is licensed under the MIT License - see the \[LICENSE](LICENSE) file for details.



\##  Authors



\- \*\*Trupti Patil\*\* - \*Initial work\* - \[YourGitHub](https://github.com/Truptipatil197)



\##  Acknowledgments



\- Express.js for the backend framework

\- Sequelize for ORM

\- Chart.js for data visualization

\- Bootstrap/Tailwind for UI components

\- All contributors who helped with this project



\*\*Version:\*\* 1.0.0  

\*\*Last Updated:\*\* January 2026

