# IMRAS Backend API

Inventory Management & Reorder Automation System - Backend API

## Project Structure

```
backend/
├── config/
│   └── database.js          # Sequelize database configuration
├── controllers/             # Request handlers (business logic)
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── errorHandler.js     # Global error handler
│   └── validator.js        # Request validation middleware
├── models/                  # Sequelize models
├── routes/                  # API route definitions
├── utils/
│   ├── logger.js           # Logging utility
│   └── response.js         # Standardized response helpers
├── server.js                # Main application entry point
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Environment variables template
├── .gitignore
└── package.json
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update database credentials and other settings

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## Environment Variables

See `.env.example` for all required environment variables.

## API Endpoints

- `GET /api/health` - Health check endpoint

## Database

The application uses Sequelize ORM with MySQL. Configure your database connection in `.env`.

