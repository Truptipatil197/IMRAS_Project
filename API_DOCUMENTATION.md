# IMRAS API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Inventory Management](#inventory-management)
   - [GRN (Goods Receipt Note)](#grn-goods-receipt-note)
   - [Stock Management](#stock-management)
   - [Reorder Management](#reorder-management)
   - [Batch Management](#batch-management)
   - [Supplier Management](#supplier-management)
   - [Analytics & Reports](#analytics--reports)
   - [User Management](#user-management)
   - [Settings](#settings)
   - [Search](#search)
   - [Reorder Automation](#reorder-automation)
   - [Scheduler](#scheduler)

---

## Overview

The IMRAS (Inventory Management, Reorder, and Analytics System) API provides a comprehensive RESTful interface for managing inventory, suppliers, purchase orders, stock movements, and analytics.

**API Version:** 1.0  
**Base URL:** `http://localhost:5000/api`  
**Content-Type:** `application/json`

---

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens). Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Format
- Token is obtained via `/api/auth/login`
- Token expires after a set duration (default: 24 hours)
- Include token in all protected requests

### Roles
- **Admin**: Full system access
- **Manager**: Inventory and reorder management
- **Staff**: GRN creation and stock operations

---

## Base URL

```
http://localhost:5000/api
```

Health Check: `GET /api/health`

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (optional)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## API Endpoints

## Authentication Endpoints

### Register User
**POST** `/api/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "Admin" // Optional: Admin, Manager, Staff
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 1
}
```

---

### Login
**POST** `/api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "username": "john_doe", // or email
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "Admin"
  }
}
```

---

### Get Current User
**GET** `/api/auth/me`

**Access:** Private (All roles)

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "Admin"
  }
}
```

---

### Change Password
**PUT** `/api/auth/change-password`

**Access:** Private (All roles)

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Logout
**POST** `/api/auth/logout`

**Access:** Private (All roles)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Inventory Management

### Create Item
**POST** `/api/inventory/items`

**Access:** Admin only

**Request Body:**
```json
{
  "item_name": "Laptop",
  "sku": "LAP-001",
  "description": "Dell Laptop",
  "unit_price": 50000.00,
  "category_id": 1,
  "unit_of_measure": "Unit",
  "reorder_point": 10,
  "safety_stock": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item created successfully",
  "item": { ... }
}
```

---

### Get All Items
**GET** `/api/inventory/items`

**Access:** All authenticated users

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term
- `category_id` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "totalPages": 5,
      "totalItems": 50
    }
  }
}
```

---

### Get Item by ID
**GET** `/api/inventory/items/:id`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "item": { ... },
    "total_stock": 150,
    "stock_by_warehouse": [...]
  }
}
```

---

### Update Item
**PUT** `/api/inventory/items/:id`

**Access:** Admin only

**Request Body:**
```json
{
  "item_name": "Updated Laptop",
  "unit_price": 55000.00,
  "reorder_point": 15
}
```

---

### Delete Item
**DELETE** `/api/inventory/items/:id`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

---

### Get Item Stock
**GET** `/api/inventory/items/:id/stock`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "total_stock": 150,
    "stock_by_warehouse": [
      {
        "warehouse_id": 1,
        "warehouse_name": "Main Warehouse",
        "quantity": 100
      }
    ]
  }
}
```

---

### Categories

#### Create Category
**POST** `/api/inventory/categories`

**Access:** Admin only

**Request Body:**
```json
{
  "category_name": "Electronics"
}
```

#### Get All Categories
**GET** `/api/inventory/categories`

**Access:** All authenticated users

#### Get Category by ID
**GET** `/api/inventory/categories/:id`

**Access:** All authenticated users

#### Update Category
**PUT** `/api/inventory/categories/:id`

**Access:** Admin only

#### Delete Category
**DELETE** `/api/inventory/categories/:id`

**Access:** Admin only

---

### Warehouses

#### Create Warehouse
**POST** `/api/inventory/warehouses`

**Access:** Admin only

**Request Body:**
```json
{
  "warehouse_name": "Main Warehouse",
  "address": "123 Main St",
  "phone": "+1234567890",
  "is_active": true
}
```

#### Get All Warehouses
**GET** `/api/inventory/warehouses`

**Access:** All authenticated users

#### Get Warehouse by ID
**GET** `/api/inventory/warehouses/:id`

**Access:** All authenticated users

#### Update Warehouse
**PUT** `/api/inventory/warehouses/:id`

**Access:** Admin only

#### Delete Warehouse
**DELETE** `/api/inventory/warehouses/:id`

**Access:** Admin only

---

### Locations

#### Create Location
**POST** `/api/inventory/locations`

**Access:** Admin only

**Request Body:**
```json
{
  "warehouse_id": 1,
  "location_code": "A-01-01",
  "description": "Aisle A, Shelf 1",
  "capacity": 100
}
```

#### Get All Locations
**GET** `/api/inventory/locations`

**Access:** All authenticated users

#### Get Locations by Warehouse
**GET** `/api/inventory/locations/warehouse/:warehouseId`

**Access:** All authenticated users

#### Get Location by ID
**GET** `/api/inventory/locations/:id`

**Access:** All authenticated users

#### Update Location
**PUT** `/api/inventory/locations/:id`

**Access:** Admin only

#### Delete Location
**DELETE** `/api/inventory/locations/:id`

**Access:** Admin only

---

## GRN (Goods Receipt Note)

### Get Pending Purchase Orders
**GET** `/api/grn/pending-pos`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "purchase_orders": [...]
  }
}
```

---

### Create GRN
**POST** `/api/grn`

**Access:** Staff only

**Request Body:**
```json
{
  "po_id": 1,
  "warehouse_id": 1,
  "grn_date": "2024-01-15",
  "remarks": "Received in good condition",
  "items": [
    {
      "item_id": 1,
      "received_qty": 100,
      "accepted_qty": 95,
      "rejected_qty": 5,
      "rejection_reason": "Damaged packaging",
      "batch_number": "BATCH-001",
      "lot_number": "LOT-001",
      "manufacturing_date": "2024-01-01",
      "expiry_date": "2025-01-01"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "GRN created successfully",
  "data": {
    "grn": { ... }
  }
}
```

---

### Get All GRNs
**GET** `/api/grn`

**Access:** All authenticated users

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status
- `warehouse_id` (optional): Filter by warehouse

**Response:**
```json
{
  "success": true,
  "data": {
    "grns": [...],
    "pagination": { ... }
  }
}
```

---

### Get GRN by ID
**GET** `/api/grn/:id`

**Access:** All authenticated users

---

### Update GRN
**PUT** `/api/grn/:id`

**Access:** Staff only

**Request Body:**
```json
{
  "grn_date": "2024-01-16",
  "remarks": "Updated remarks"
}
```

---

### Complete GRN
**PUT** `/api/grn/:id/complete`

**Access:** Staff only

**Response:**
```json
{
  "success": true,
  "message": "GRN completed successfully"
}
```

---

## Stock Management

### Get Current Stock Summary
**GET** `/api/stock/summary`

**Access:** All authenticated users

**Query Parameters:**
- `warehouse_id` (optional): Filter by warehouse
- `item_id` (optional): Filter by item

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [...]
  }
}
```

---

### Get Stock Balance by Item
**GET** `/api/stock/item/:itemId`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "total_stock": 150,
    "stock_by_warehouse": [...]
  }
}
```

---

### Get Stock Ledger
**GET** `/api/stock/ledger`

**Access:** All authenticated users

**Query Parameters:**
- `item_id` (optional): Filter by item
- `warehouse_id` (optional): Filter by warehouse
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter
- `transaction_type` (optional): Filter by type

**Response:**
```json
{
  "success": true,
  "data": {
    "ledger_entries": [...]
  }
}
```

---

### Transfer Between Locations
**POST** `/api/stock/transfer/location`

**Access:** Staff only

**Request Body:**
```json
{
  "item_id": 1,
  "from_location_id": 1,
  "to_location_id": 2,
  "quantity": 10,
  "batch_id": 1, // Optional
  "remarks": "Moving to better location"
}
```

---

### Transfer Between Warehouses
**POST** `/api/stock/transfer/warehouse`

**Access:** Staff only

**Request Body:**
```json
{
  "item_id": 1,
  "from_warehouse_id": 1,
  "to_warehouse_id": 2,
  "from_location_id": 1, // Optional
  "to_location_id": 3, // Optional
  "quantity": 50,
  "batch_id": 1, // Optional
  "expected_date": "2024-01-20", // Optional
  "remarks": "Transfer to branch warehouse"
}
```

---

### Issue Stock
**POST** `/api/stock/issue`

**Access:** Staff only

**Request Body:**
```json
{
  "warehouse_id": 1,
  "items": [
    {
      "item_id": 1,
      "quantity": 5,
      "location_id": 1 // Optional
    }
  ],
  "order_reference": "ORD-001", // Optional
  "remarks": "Issued for production"
}
```

---

### Adjust Stock
**POST** `/api/stock/adjust`

**Access:** Staff only

**Request Body:**
```json
{
  "item_id": 1,
  "warehouse_id": 1,
  "location_id": 1, // Optional
  "batch_id": 1, // Optional
  "adjustment_type": "Addition", // or "Reduction"
  "quantity": 10,
  "reason": "Stock count discrepancy correction",
  "remarks": "Found additional stock during count"
}
```

---

### Record Stock Count
**POST** `/api/stock/count`

**Access:** Staff only

**Request Body:**
```json
{
  "warehouse_id": 1,
  "location_id": 1, // Optional
  "counted_items": [
    {
      "item_id": 1,
      "batch_id": 1, // Optional
      "counted_qty": 95
    }
  ],
  "count_date": "2024-01-15",
  "counted_by": "John Doe", // Optional
  "remarks": "Monthly stock count"
}
```

---

### Get Stock Count Tasks
**GET** `/api/stock/count-tasks`

**Access:** Staff only

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [...]
  }
}
```

---

## Reorder Management

### Check Reorder Points
**POST** `/api/reorder/check`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts_generated": 5,
    "items_checked": 100
  }
}
```

---

### Get Reorder Alerts
**GET** `/api/reorder/alerts`

**Access:** All authenticated users

**Query Parameters:**
- `severity` (optional): Filter by severity
- `is_read` (optional): Filter by read status

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [...]
  }
}
```

---

### Mark Alert as Read
**PUT** `/api/reorder/alerts/:id/read`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "message": "Alert marked as read"
}
```

---

### Create Purchase Requisition
**POST** `/api/reorder/pr`

**Access:** Manager only

**Request Body:**
```json
{
  "pr_date": "2024-01-15",
  "items": [
    {
      "item_id": 1,
      "requested_qty": 100
    }
  ],
  "alert_id": 1 // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase requisition created",
  "data": {
    "pr": { ... }
  }
}
```

---

### Get All Purchase Requisitions
**GET** `/api/reorder/pr`

**Access:** All authenticated users

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "prs": [...],
    "pagination": { ... }
  }
}
```

---

### Get Purchase Requisition by ID
**GET** `/api/reorder/pr/:id`

**Access:** All authenticated users

---

### Approve Purchase Requisition
**PUT** `/api/reorder/pr/:id/approve`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "message": "Purchase requisition approved"
}
```

---

### Reject Purchase Requisition
**PUT** `/api/reorder/pr/:id/reject`

**Access:** Manager only

**Request Body:**
```json
{
  "rejection_reason": "Insufficient budget allocation"
}
```

---

### Create Purchase Order from PR
**POST** `/api/reorder/po/from-pr/:prId`

**Access:** Manager only

**Request Body:**
```json
{
  "supplier_id": 1,
  "expected_delivery_date": "2024-02-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order created",
  "data": {
    "po": { ... }
  }
}
```

---

### Get Purchase Order Status
**GET** `/api/reorder/po/:id/status`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Pending",
    "po": { ... }
  }
}
```

---

### Get Reorder Dashboard
**GET** `/api/reorder/dashboard`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": { ... },
    "alerts": [...],
    "recent_prs": [...]
  }
}
```

---

## Batch Management

### Get All Batches
**GET** `/api/batches`

**Access:** All authenticated users

**Query Parameters:**
- `item_id` (optional): Filter by item
- `warehouse_id` (optional): Filter by warehouse
- `status` (optional): Active, Expired, Disposed
- `expiry_status` (optional): valid, expiring_30, expiring_7, expired
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "batches": [...],
    "pagination": { ... }
  }
}
```

---

### Get Batch by ID
**GET** `/api/batches/:id`

**Access:** All authenticated users

---

### Get Batches by Item
**GET** `/api/batches/item/:itemId`

**Access:** All authenticated users

---

### Check Expiry Alerts
**POST** `/api/batches/check-expiry`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts_generated": 3
  }
}
```

---

### Get Expiry Alerts
**GET** `/api/batches/expiry-alerts`

**Access:** All authenticated users

**Query Parameters:**
- `severity` (optional): Medium, High, Critical
- `alert_type` (optional): Expiry Warning - 30 Days, Expiry Warning - 7 Days, Expired
- `warehouse_id` (optional): Filter by warehouse
- `is_read` (optional): Filter by read status

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [...]
  }
}
```

---

### Dispose Expired Batch
**POST** `/api/batches/:id/dispose`

**Access:** Manager only

**Request Body:**
```json
{
  "disposal_qty": 10,
  "disposal_reason": "Expired and unsafe for use",
  "disposal_date": "2024-01-15",
  "disposal_cost": 500.00 // Optional
}
```

---

### Get Expiry Summary Report
**GET** `/api/batches/reports/expiry-summary`

**Access:** All authenticated users

**Query Parameters:**
- `warehouse_id` (optional)
- `category_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

---

### Get Batch Usage Analysis
**GET** `/api/batches/reports/usage-analysis`

**Access:** All authenticated users

**Query Parameters:**
- `warehouse_id` (optional)
- `min_age_days` (optional)

---

## Supplier Management

### Create Supplier
**POST** `/api/suppliers`

**Access:** Admin only

**Request Body:**
```json
{
  "supplier_name": "ABC Suppliers",
  "contact_person": "John Smith",
  "email": "contact@abcsuppliers.com",
  "phone": "+1234567890",
  "address": "123 Supplier St",
  "payment_terms_days": 30,
  "avg_lead_time_days": 7
}
```

---

### Get All Suppliers
**GET** `/api/suppliers`

**Access:** All authenticated users

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search term
- `is_active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [...],
    "pagination": { ... }
  }
}
```

---

### Get Supplier by ID
**GET** `/api/suppliers/:id`

**Access:** All authenticated users

---

### Update Supplier
**PUT** `/api/suppliers/:id`

**Access:** Admin only

**Request Body:**
```json
{
  "supplier_name": "Updated Supplier Name",
  "email": "newemail@supplier.com",
  "payment_terms_days": 45
}
```

---

### Deactivate Supplier
**DELETE** `/api/suppliers/:id`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Supplier deactivated successfully"
}
```

---

### Add Supplier Item Pricing
**POST** `/api/suppliers/:id/items`

**Access:** Manager only

**Request Body:**
```json
{
  "items": [
    {
      "item_id": 1,
      "unit_price": 100.00,
      "min_order_qty": 10,
      "max_order_qty": 1000,
      "discount_percentage": 5.0,
      "is_preferred": true
    }
  ]
}
```

---

### Get Supplier Pricing
**GET** `/api/suppliers/:id/pricing`

**Access:** All authenticated users

---

### Compare Supplier Pricing
**GET** `/api/suppliers/pricing/compare`

**Access:** Manager only

**Query Parameters:**
- `item_id` (optional): Single item comparison
- `item_ids` (optional): Array of item IDs for bulk comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "comparisons": [...]
  }
}
```

---

### Rate Supplier Performance
**POST** `/api/suppliers/:id/rate`

**Access:** Manager only

**Request Body:**
```json
{
  "rating_type": "Overall", // Overall, Delivery, Quality, Pricing, Communication
  "rating": 4.5, // 1-5
  "comments": "Excellent service"
}
```

---

### Get Supplier Performance History
**GET** `/api/suppliers/:id/performance`

**Access:** All authenticated users

---

### Get Supplier Comparison Report
**GET** `/api/suppliers/reports/comparison`

**Access:** Manager only

---

### Set Preferred Supplier
**PUT** `/api/suppliers/:id/preferred`

**Access:** Admin only

**Request Body:**
```json
{
  "item_ids": [1, 2, 3],
  "is_preferred": true
}
```

---

## Analytics & Reports

### ABC Analysis
**GET** `/api/analytics/abc-analysis`

**Access:** All authenticated users

**Query Parameters:**
- `warehouse_id` (optional)
- `category_id` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "category_a": [...],
    "category_b": [...],
    "category_c": [...]
  }
}
```

---

### Stock Aging Report
**GET** `/api/analytics/stock-aging`

**Access:** All authenticated users

**Query Parameters:**
- `warehouse_id` (optional)
- `min_age_days` (optional)
- `category_id` (optional)

---

### Stock Turnover Analysis
**GET** `/api/analytics/turnover`

**Access:** Manager only

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)
- `warehouse_id` (optional)
- `category_id` (optional)

---

### Consumption Trends
**GET** `/api/analytics/consumption-trends`

**Access:** Manager only

**Query Parameters:**
- `item_id` (optional)
- `period` (optional): daily, weekly, monthly
- `months` (optional): 1-24

---

### Supplier Performance
**GET** `/api/analytics/supplier-performance`

**Access:** Manager only

**Query Parameters:**
- `supplier_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

---

### Warehouse Performance
**GET** `/api/analytics/warehouse-performance`

**Access:** Manager only

---

### Financial Impact Report
**GET** `/api/analytics/financial-impact`

**Access:** Admin only

---

### Executive Dashboard
**GET** `/api/analytics/executive-dashboard`

**Access:** Manager only

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": { ... },
    "charts": { ... },
    "alerts": [...]
  }
}
```

---

## User Management

### Get All Users
**GET** `/api/users`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "users": [...]
}
```

---

### Get User Stats
**GET** `/api/users/stats`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "active": 45,
    "admins": 5,
    "managers": 10,
    "staff": 35
  }
}
```

---

### Get User by ID
**GET** `/api/users/:id`

**Access:** Admin only

---

### Create User
**POST** `/api/users`

**Access:** Admin only

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "New User",
  "role": "Staff",
  "phone": "+1234567890", // Optional
  "department": "Warehouse", // Optional
  "is_active": true
}
```

---

### Update User
**PUT** `/api/users/:id`

**Access:** Admin only

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "role": "Manager",
  "is_active": true
}
```

---

### Delete User
**DELETE** `/api/users/:id`

**Access:** Admin only

**Note:** Cannot delete your own account

---

### Reset User Password
**PUT** `/api/users/:id/reset-password`

**Access:** Admin only

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

---

## Settings

### Get All Settings
**GET** `/api/settings`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "settings": {
    "company_name": "IMRAS Company",
    "currency": "INR",
    "date_format": "DD/MM/YYYY",
    "default_reorder_point": 10,
    "default_safety_stock": 5,
    "enable_batch_tracking": true,
    "enable_auto_reorder": true,
    "reorder_check_frequency": "daily",
    "auto_approve_prs": false,
    "email_notifications": false,
    "low_stock_alerts": true,
    "expiry_alerts": true,
    "session_timeout": 30,
    "password_expiry_days": 90
  }
}
```

---

### Save General Settings
**POST** `/api/settings/general`

**Access:** Admin only

**Request Body:**
```json
{
  "company_name": "My Company",
  "currency": "USD",
  "date_format": "MM/DD/YYYY"
}
```

---

### Save Inventory Settings
**POST** `/api/settings/inventory`

**Access:** Admin only

**Request Body:**
```json
{
  "default_reorder_point": 15,
  "default_safety_stock": 8,
  "enable_batch_tracking": true,
  "enable_serial_tracking": false
}
```

---

### Save Reorder Settings
**POST** `/api/settings/reorder`

**Access:** Admin only

**Request Body:**
```json
{
  "enable_auto_reorder": true,
  "reorder_check_frequency": "daily",
  "auto_approve_prs": false
}
```

---

### Save Notification Settings
**POST** `/api/settings/notifications`

**Access:** Admin only

**Request Body:**
```json
{
  "email_notifications": true,
  "low_stock_alerts": true,
  "expiry_alerts": true
}
```

---

### Save Security Settings
**POST** `/api/settings/security`

**Access:** Admin only

**Request Body:**
```json
{
  "session_timeout": 60,
  "password_expiry_days": 90
}
```

---

### Create Backup
**POST** `/api/settings/backup`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "filename": "imras_backup_2024-01-15.sql",
  "backup_url": "/api/settings/download-backup/imras_backup_2024-01-15.sql"
}
```

---

### Download Backup
**GET** `/api/settings/download-backup/:filename`

**Access:** Admin only

**Response:** File download

---

### Restore Backup
**POST** `/api/settings/restore`

**Access:** Admin only

**Request:** Multipart form data with `backup` file

---

## Search

### Global Search
**GET** `/api/search`

**Access:** All authenticated users

**Query Parameters:**
- `q` (required): Search term (minimum 2 characters)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "type": "Items",
      "title": "Laptop",
      "subtitle": "SKU: LAP-001 | Electronics",
      "url": "pages/inventory.html?item_id=1",
      "icon": "fa-box"
    }
  ],
  "grouped": {
    "Items": [...],
    "Suppliers": [...],
    "Purchase Requisitions": [...]
  },
  "count": 25
}
```

**Searches:**
- Items (SKU, name, description)
- Suppliers (name, contact person, email)
- Purchase Requisitions (PR number)
- Purchase Orders (PO number)
- GRNs (GRN number)

---

## Reorder Automation

### Get Reorder Statistics
**GET** `/api/reorder/statistics`

**Access:** Admin, Manager

**Response:**
```json
{
  "success": true,
  "stats": {
    "critical": 5,
    "urgent": 10,
    "auto_prs_created": 15,
    "estimated_savings": 75000
  }
}
```

---

### Get Reorder Alerts (Automation)
**GET** `/api/reorder/alerts`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "item_id": 1,
      "sku": "LAP-001",
      "item_name": "Laptop",
      "current_stock": 5,
      "reorder_point": 10,
      "safety_stock": 5,
      "lead_time_days": 7,
      "preferred_supplier": "ABC Suppliers",
      "supplier_id": 1,
      "supplier_unit_price": 50000,
      "min_order_qty": 10
    }
  ]
}
```

---

### Run Reorder Automation
**POST** `/api/reorder/run`

**Access:** Admin, Manager

**Response:**
```json
{
  "success": true,
  "items_checked": 100,
  "alerts_generated": 5,
  "prs_created": 3,
  "duration_seconds": 2
}
```

---

### Create Bulk PRs
**POST** `/api/reorder/bulk-pr`

**Access:** Admin, Manager

**Request Body:**
```json
{
  "item_ids": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "prs_created": 5,
  "message": "5 PRs created successfully"
}
```

---

### Get Automation Rules
**GET** `/api/reorder/rules`

**Access:** Admin, Manager

**Response:**
```json
{
  "success": true,
  "rules": [...]
}
```

---

### Create Automation Rule
**POST** `/api/reorder/rules`

**Access:** Admin only

**Request Body:**
```json
{
  "rule_name": "Auto-reorder for critical items",
  "condition": "stock_below_reorder",
  "action": "auto_pr",
  "is_enabled": true,
  "custom_threshold": 5
}
```

---

### Toggle Rule
**PUT** `/api/reorder/rules/:id/toggle`

**Access:** Admin only

**Request Body:**
```json
{
  "is_enabled": false
}
```

---

### Delete Rule
**DELETE** `/api/reorder/rules/:id`

**Access:** Admin only

---

### Get Execution History
**GET** `/api/reorder/history`

**Access:** Admin, Manager

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "run_id": 1,
      "run_timestamp": "2024-01-15T10:00:00Z",
      "status": "Success",
      "items_checked": 100,
      "alerts_generated": 5,
      "prs_created": 3,
      "duration_seconds": 2
    }
  ]
}
```

---

### Get Single Run Details
**GET** `/api/reorder/history/:id`

**Access:** Admin, Manager

---

### Get Schedule
**GET** `/api/reorder/schedule`

**Access:** Admin, Manager

**Response:**
```json
{
  "success": true,
  "schedule": {
    "frequency": "daily", // daily, weekly, monthly, disabled
    "run_time": "09:00",
    "auto_create_prs": false,
    "email_notifications": false,
    "exclude_weekends": false,
    "next_run": "2024-01-16T09:00:00Z"
  }
}
```

---

### Save Schedule
**POST** `/api/reorder/schedule`

**Access:** Admin only

**Request Body:**
```json
{
  "frequency": "daily",
  "run_time": "09:00",
  "auto_create_prs": true,
  "email_notifications": true,
  "exclude_weekends": false
}
```

---

### Get System Status
**GET** `/api/reorder/status`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "last_run": "2024-01-15T09:00:00Z"
  }
}
```

---

### Get Logs
**GET** `/api/reorder/logs`

**Access:** Admin, Manager

**Query Parameters:**
- `limit` (optional): Number of records (default: 100)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "log_id": 1,
      "run_id": 1,
      "level": "WARNING",
      "message": "Item LAP-001 is below reorder point",
      "item_id": 1,
      "timestamp": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

### Check and Create PRs
**POST** `/api/reorder/check-and-create`

**Access:** Admin only

**Response:**
```json
{
  "success": true,
  "items_checked": 100,
  "alerts_generated": 5,
  "prs_created": 3,
  "duration_seconds": 2
}
```

---

## Reorder Rules

### Get All Rules
**GET** `/api/reorder/rules`

**Access:** Manager, Admin

---

### Get Rule by ID
**GET** `/api/reorder/rules/:id`

**Access:** Manager, Admin

---

### Create Rule
**POST** `/api/reorder/rules`

**Access:** Manager, Admin

---

### Update Rule
**PUT** `/api/reorder/rules/:id`

**Access:** Manager, Admin

---

### Delete Rule
**DELETE** `/api/reorder/rules/:id`

**Access:** Admin only

---

### Bulk Create Rules
**POST** `/api/reorder/rules/bulk`

**Access:** Admin only

---

### Get Rules by Category
**GET** `/api/reorder/rules/category/:categoryId`

**Access:** Manager, Admin

---

## Reorder Automation (Dashboard)

### Get Reorder Dashboard
**GET** `/api/reorder/automation/dashboard`

**Access:** Manager only

---

### Check Item Reorder Status
**GET** `/api/reorder/automation/check/:itemId`

**Access:** Staff only

---

### Get Demand Forecast
**GET** `/api/reorder/automation/forecast/:itemId`

**Access:** Manager only

---

### Get Stockout Prediction
**GET** `/api/reorder/automation/stockout-prediction`

**Access:** Manager only

---

### Get Reorder Queue
**GET** `/api/reorder/automation/queue`

**Access:** Manager only

---

## Scheduler

### Get Scheduler Status
**GET** `/api/reorder/scheduler/status`

**Access:** Manager, Admin

**Response:**
```json
{
  "success": true,
  "status": {
    "is_running": true,
    "last_run": "2024-01-15T09:00:00Z",
    "next_run": "2024-01-16T09:00:00Z",
    "frequency": "daily"
  }
}
```

---

### Start Scheduler
**POST** `/api/reorder/scheduler/start`

**Access:** Admin only

---

### Stop Scheduler
**POST** `/api/reorder/scheduler/stop`

**Access:** Admin only

---

### Trigger Manual Run
**POST** `/api/reorder/scheduler/run-now`

**Access:** Manager, Admin

---

### Update Configuration
**PUT** `/api/reorder/scheduler/config`

**Access:** Admin only

**Request Body:**
```json
{
  "frequency": "daily",
  "run_time": "09:00",
  "auto_create_prs": true
}
```

---

### Get Execution Logs
**GET** `/api/reorder/scheduler/logs`

**Access:** Manager, Admin

---

### Get Metrics
**GET** `/api/reorder/scheduler/metrics`

**Access:** Manager, Admin

**Response:**
```json
{
  "success": true,
  "metrics": {
    "total_runs": 100,
    "successful_runs": 95,
    "failed_runs": 5,
    "average_duration_seconds": 2.5,
    "last_run_status": "Success"
  }
}
```

---

## Notes

### Pagination
Most list endpoints support pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Date Formats
- Dates should be in ISO 8601 format: `YYYY-MM-DD`
- Date-time should be: `YYYY-MM-DDTHH:mm:ssZ`

### Validation
- All endpoints validate input data
- Validation errors return `400 Bad Request` with error details
- Required fields are marked in request body examples

### Rate Limiting
- Currently no rate limiting implemented
- Consider implementing for production use

### CORS
- CORS is enabled for frontend URL (default: `http://localhost:3000`)
- Configure in `server.js` for production

---

## Support

For issues or questions:
1. Check the error message in the response
2. Verify authentication token is valid
3. Ensure user has required role permissions
4. Review request body format matches documentation

---

**Last Updated:** January 2024  
**API Version:** 1.0

