# IMRAS Backend Setup Guide

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Environment Configuration for IMRAS
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=imras_db
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@imras.com
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # Sequelize database configuration
├── controllers/             # Route controllers (MVC pattern)
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── errorHandler.js     # Global error handling middleware
│   └── validator.js        # Request validation middleware
├── models/                  # Sequelize models
├── routes/                  # Express routes
├── utils/
│   ├── logger.js           # Logging utility
│   └── response.js         # Standardized response utility
├── server.js                # Main Express server file
└── package.json            # Dependencies and scripts
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your configuration

3. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE imras_db;
```

2. Update `.env` with your database credentials

3. The server will automatically test the connection on startup

