@echo off
REM ============================================
REM IMRAS - Automated Setup Script
REM For Windows
REM ============================================

echo ============================================
echo IMRAS - Inventory Management System
echo Automated Setup Script
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18.x or higher from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js found:
node --version
echo.

REM Check npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [INFO] npm found:
npm --version
echo.

REM Check MySQL
sc query MySQL80 | find "RUNNING" >nul
if errorlevel 1 (
    echo [WARNING] MySQL service is not running
    echo Starting MySQL service...
    net start MySQL80
    timeout /t 2 /nobreak >nul
)
echo [INFO] MySQL is running
echo.

REM Create .env if not exists
if not exist ".env" (
    echo [WARNING] .env file not found
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy .env.example .env
        echo [SUCCESS] .env file created
        echo [IMPORTANT] Please edit .env file with your database credentials
        echo.
        pause
    ) else (
        echo [ERROR] .env.example file not found
        pause
        exit /b 1
    )
)

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed
echo.

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "reports" mkdir reports
if not exist "backups" mkdir backups
echo [SUCCESS] Directories created
echo.

REM Database setup
echo [INFO] Database Setup
echo ---------------------------------------------
set /p setup_db="Do you want to create/setup the database now? (y/n): "

if /i "%setup_db%"=="y" (
    echo [INFO] Creating database if not exists...
    
    REM Load environment variables
    for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#"') do set %%a=%%b
    
    REM Create database
    mysql -h%DB_HOST% -P%DB_PORT% -u%DB_USER% -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    
    if errorlevel 0 (
        echo [SUCCESS] Database ready
        
        echo [INFO] Running database migrations...
        call npm run migrate
        
        if errorlevel 0 (
            echo [SUCCESS] Migrations completed
            
            set /p seed_db="Do you want to seed initial data (users, categories, etc.)? (y/n): "
            
            if /i "!seed_db!"=="y" (
                echo [INFO] Seeding database...
                call npm run seed
                echo [SUCCESS] Database seeded
            )
        ) else (
            echo [ERROR] Migration failed
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Failed to create database
        echo Please check your database credentials in .env file
        pause
        exit /b 1
    )
)
echo.

echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo To start the application:
echo   Development mode: npm run dev
echo   Production mode:  npm start
echo.
echo Default Login Credentials:
echo   Admin:   username: admin    password: newpassword123
echo   Manager: username: manager1  password: password123
echo   Staff:   username: staff1    password: password123
echo.
echo [IMPORTANT] Change these passwords after first login!
echo.
echo Application will be available at: http://localhost:3000
echo ============================================
pause