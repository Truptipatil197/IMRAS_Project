# IMRAS Testing Guide

## Comprehensive Testing Documentation

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Target Audience:** QA Engineers, Developers, System Administrators

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Testing Environment Setup](#testing-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [API Testing](#api-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Security Testing](#security-testing)
8. [Performance Testing](#performance-testing)
9. [Reorder Automation Testing](#reorder-automation-testing)
10. [User Acceptance Testing (UAT)](#user-acceptance-testing-uat)
11. [Test Data Management](#test-data-management)
12. [Bug Reporting](#bug-reporting)
13. [Test Automation](#test-automation)

---

## 1. Testing Overview

### 1.1 Testing Strategy

**Testing Pyramid:**

```
       /\
      /  \
     /E2E \          10% - End-to-End Tests
    /______\
   /        \
  /Integration\       30% - Integration Tests
 /____________\
/              \
/   Unit Tests   \     60% - Unit Tests
/__________________\
```

**Testing Types:**
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Module interactions
- **API Tests**: Backend endpoints
- **E2E Tests**: Complete user workflows
- **Security Tests**: Vulnerabilities and exploits
- **Performance Tests**: Load and stress testing
- **UAT**: Real user scenarios

### 1.2 Test Coverage Goals

| Component | Target Coverage |
|-----------|-----------------|
| Backend Services | 80%+ |
| API Endpoints | 90%+ |
| Database Models | 85%+ |
| Critical Workflows | 100% |
| Authentication | 100% |
| Reorder Automation | 95%+ |

### 1.3 Testing Tools

**Backend Testing:**
- Jest (Unit & Integration)
- Supertest (API Testing)
- Sequelize Test Utils

**Frontend Testing:**
- Jest (Unit Tests)
- Selenium/Puppeteer (E2E)
- Cypress (Alternative E2E)

**API Testing:**
- Postman/Newman
- Thunder Client
- curl

**Load Testing:**
- Apache JMeter
- Artillery
- k6

**Security Testing:**
- OWASP ZAP
- Burp Suite
- npm audit

---

## 2. Testing Environment Setup

### 2.1 Test Database Setup

**Create Test Database:**
```bash
# Login to MySQL
mysql -u root -p
```

```sql
-- Create test database
CREATE DATABASE imras_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create test user
CREATE USER 'imras_test'@'localhost' IDENTIFIED BY 'test_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON imras_test.* TO 'imras_test'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE 'imras_test';
EXIT;
```

### 2.2 Test Environment Configuration

**Create Test .env File:**
```bash
cd backend
cp .env.example .env.test
nano .env.test
```

```bash
# Test Environment Configuration
NODE_ENV=test
PORT=5001

# Test Database
DB_HOST=localhost
DB_USER=imras_test
DB_PASSWORD=test_password_123
DB_NAME=imras_test
DB_PORT=3306
DB_DIALECT=mysql

# JWT (use different secret for test)
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_EXPIRE=1h

# Reorder Scheduler (disabled for most tests)
REORDER_SCHEDULER_ENABLED=false
REORDER_SCHEDULER_AUTO_START=false

# Logging
LOG_LEVEL=error
LOG_FILE_PATH=./tests/logs/test.log
```

### 2.3 Install Testing Dependencies

```bash
cd backend

# Install test dependencies
npm install --save-dev \
  jest \
  supertest \
  @faker-js/faker \
  cross-env
```

**Update package.json:**

```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test jest --coverage",
    "test:watch": "cross-env NODE_ENV=test jest --watch",
    "test:unit": "cross-env NODE_ENV=test jest --testMatch='**/*.test.js'",
    "test:integration": "cross-env NODE_ENV=test jest --testMatch='**/*.integration.test.js'",
    "test:api": "newman run tests/postman/IMRAS-API-Tests.json"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "./tests/coverage",
    "collectCoverageFrom": [
      "**/*.js",
      "!node_modules/**",
      "!tests/**",
      "!coverage/**"
    ],
    "testMatch": [
      "**/tests/**/*.test.js",
      "**/tests/**/*.integration.test.js"
    ],
    "setupFilesAfterEnv": ["./tests/setup.js"]
  }
}
```

### 2.4 Test Setup File

**Create tests/setup.js:**

```javascript
const { sequelize } = require('../models');

// Setup before all tests
beforeAll(async () => {
  // Connect to test database
  await sequelize.authenticate();
  
  // Sync database (force: true drops tables)
  await sequelize.sync({ force: true });
  
  console.log('Test database connected and synchronized');
});

// Cleanup after all tests
afterAll(async () => {
  await sequelize.close();
  console.log('Test database connection closed');
});

// Clear data between tests
afterEach(async () => {
  // Truncate all tables except migrations
  const models = Object.keys(sequelize.models);
  for (const modelName of models) {
    await sequelize.models[modelName].destroy({ where: {}, truncate: true });
  }
});

// Global test timeout
jest.setTimeout(30000);
```

---

## 3. Unit Testing

### 3.1 Model Testing

**Example: tests/unit/models/item.test.js**

```javascript
const { Item, Category } = require('../../../models');
const { faker } = require('@faker-js/faker');

describe('Item Model', () => {
  let testCategory;

  beforeEach(async () => {
    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test description'
    });
  });

  describe('Validation', () => {
    test('should create item with valid data', async () => {
      const itemData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: testCategory.id,
        uom: 'Pcs',
        price: 100.00,
        reorderPoint: 50,
        safetyStock: 20,
        leadTime: 7,
        status: 'Active'
      };

      const item = await Item.create(itemData);

      expect(item.id).toBeDefined();
      expect(item.name).toBe(itemData.name);
      expect(item.sku).toBe(itemData.sku);
      expect(item.status).toBe('Active');
    });

    test('should fail without required fields', async () => {
      await expect(Item.create({
        name: 'Test Item'
        // Missing required fields
      })).rejects.toThrow();
    });

    test('should enforce unique SKU', async () => {
      await Item.create({
        name: 'Item 1',
        sku: 'DUPLICATE-SKU',
        categoryId: testCategory.id,
        uom: 'Pcs',
        price: 100,
        reorderPoint: 50,
        safetyStock: 20
      });

      await expect(Item.create({
        name: 'Item 2',
        sku: 'DUPLICATE-SKU',
        categoryId: testCategory.id,
        uom: 'Pcs',
        price: 150,
        reorderPoint: 50,
        safetyStock: 20
      })).rejects.toThrow();
    });
  });
});
```

### 3.2 Service Testing

**Example: tests/unit/services/demandAnalysis.test.js**

```javascript
const demandAnalysisService = require('../../../services/demandAnalysisService');
const { Item, StockLedger, Warehouse } = require('../../../models');

describe('Demand Analysis Service', () => {
  let testItem, testWarehouse;

  beforeEach(async () => {
    // Create test data
    testWarehouse = await Warehouse.create({
      name: 'Test Warehouse',
      code: 'WH-TEST',
      address: 'Test Address'
    });

    testItem = await Item.create({
      name: 'Test Item',
      sku: 'TEST-DEMAND-001',
      categoryId: 1,
      uom: 'Pcs',
      price: 100,
      reorderPoint: 50,
      safetyStock: 20,
      leadTime: 7
    });

    // Create historical stock data...
  });

  describe('calculateAverageDailyConsumption', () => {
    test('should calculate average daily consumption correctly', async () => {
      const avgConsumption = await demandAnalysisService.calculateAverageDailyConsumption(
        testItem.id,
        testWarehouse.id,
        30
      );

      expect(avgConsumption).toBeGreaterThan(0);
    });
  });
});
```

### 3.3 Controller Testing

**Example: tests/unit/controllers/inventoryController.test.js**

```javascript
const request = require('supertest');
const app = require('../../../app');
const { Item, Category, User } = require('../../../models');
const jwt = require('jsonwebtoken');

describe('Inventory Controller', () => {
  let authToken, testUser, testCategory;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testadmin',
      email: 'testadmin@test.com',
      password: 'hashedpassword',
      role: 'Admin',
      status: 'Active'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test'
    });
  });

  describe('GET /api/inventory', () => {
    test('should return all items for authenticated user', async () => {
      // Create test items
      await Item.bulkCreate([
        {
          name: 'Item 1',
          sku: 'ITM-001',
          categoryId: testCategory.id,
          uom: 'Pcs',
          price: 100,
          reorderPoint: 50,
          safetyStock: 20,
          status: 'Active'
        },
        {
          name: 'Item 2',
          sku: 'ITM-002',
          categoryId: testCategory.id,
          uom: 'Kg',
          price: 150,
          reorderPoint: 30,
          safetyStock: 10,
          status: 'Active'
        }
      ]);

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});
```

---

## 4. Integration Testing

### 4.1 Database Integration Tests

**Example: tests/integration/dbIntegration.test.js**

```javascript
const { sequelize, Item, Category, Warehouse } = require('../../models');

describe('Database Integration', () => {
  let testCategory, testWarehouse;

  beforeAll(async () => {
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Test'
    });

    testWarehouse = await Warehouse.create({
      name: 'Test Warehouse',
      code: 'WH-TEST'
    });
  });

  test('should maintain referential integrity', async () => {
    // Test foreign key constraints
    await expect(
      Item.create({
        name: 'Invalid Item',
        sku: 'INVALID-001',
        categoryId: 9999, // Non-existent category
        uom: 'Pcs',
        price: 100,
        reorderPoint: 50,
        safetyStock: 20
      })
    ).rejects.toThrow();
  });
});
```

### 4.2 API Integration Tests

**Example: tests/integration/api/inventoryApi.test.js**

```javascript
const request = require('supertest');
const app = require('../../../app');
const { Item, Category, User } = require('../../../models');
const jwt = require('jsonwebtoken');

let authToken, testUser;

describe('Inventory API Integration', () => {
  beforeAll(async () => {
    // Setup test user and token
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password',
      role: 'Admin',
      status: 'Active'
    });

    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  test('should create and retrieve an item', async () => {
    const category = await Category.create({
      name: 'Test Category',
      description: 'Test'
    });

    const itemData = {
      name: 'Test Item',
      sku: 'TEST-001',
      categoryId: category.id,
      uom: 'Pcs',
      price: 100,
      reorderPoint: 50,
      safetyStock: 20
    };

    // Create item
    const createResponse = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${authToken}`)
      .send(itemData)
      .expect(201);

    // Retrieve item
    const getResponse = await request(app)
      .get(`/api/inventory/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getResponse.body.data.name).toBe(itemData.name);
    expect(getResponse.body.data.sku).toBe(itemData.sku);
  });
});
```

---

## 5. API Testing

### 5.1 Postman Collection

**Example: tests/postman/IMRAS-API-Tests.json**

```json
{
  "info": {
    "name": "IMRAS API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login - Success",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function() {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test(\"Response has token\", function() {",
                  "    var jsonData = pm.response.json();",
                  "    pm.expect(jsonData).to.have.property('token');",
                  "    pm.environment.set('authToken', jsonData.token);",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"username\": \"admin\",\n    \"password\": \"admin123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          },
          "response": []
        }
      ]
    },
    {
      "name": "Inventory",
      "item": [
        {
          "name": "Get All Items",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{authToken}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/inventory",
              "host": ["{{base_url}}"],
              "path": ["api", "inventory"]
            }
          },
          "response": []
        }
      ]
    }
  ]
}
```

### 5.2 API Test Scenarios

| Test Case | Endpoint | Method | Expected Status | Description |
|-----------|----------|--------|-----------------|-------------|
| Login Success | /api/auth/login | POST | 200 | Valid credentials |
| Login Failed | /api/auth/login | POST | 401 | Invalid credentials |
| Get All Items | /api/inventory | GET | 200 | Returns all items |
| Create Item | /api/inventory | POST | 201 | Creates new item |
| Get Item | /api/inventory/:id | GET | 200 | Returns item details |
| Update Item | /api/inventory/:id | PUT | 200 | Updates item |
| Delete Item | /api/inventory/:id | DELETE | 204 | Deletes item |

---

## 6. End-to-End Testing

### 6.1 Test Scenarios

#### E2E-001: Complete Reorder Workflow

**Objective:** Test the complete reorder automation workflow

**Steps:**
1. Item stock falls below reorder point
2. System detects low stock
3. System generates purchase requisition
4. Manager approves PR
5. PR converted to PO
6. PO sent to supplier
7. Goods received
8. Stock updated

**Verification:**
- [ ] Low stock alert generated
- [ ] PR created with correct items/quantities
- [ ] Approval workflow followed
- [ ] PO matches PR details
- [ ] Stock updated on GRN

#### E2E-002: Batch Expiry Management

**Objective:** Test batch expiry and FEFO workflow

**Steps:**
1. Create items with batch/expiry
2. Run expiry check
3. View expiry report
4. Process expired items

**Verification:**
- [ ] Expiry alerts generated
- [ ] FEFO picking works
- [ ] Expired items blocked
- [ ] Disposal workflow works

---

## 7. Security Testing

### 7.1 OWASP Top 10 Tests

| Test | Description | Tool | Expected |
|------|-------------|------|----------|
| Injection | SQL, NoSQL, OS commands | OWASP ZAP | No injection possible |
| Broken Auth | Session management, JWT | Burp Suite | Secure auth required |
| Sensitive Data | Encryption, logging | Manual | No sensitive data exposed |
| XXE | XML parsing | OWASP ZAP | XXE prevented |
| Broken Access Control | Unauthorized access | Manual | Proper access control |
| Security Misconfig | Headers, CORS | OWASP ZAP | Secure defaults |
| XSS | Cross-site scripting | OWASP ZAP | Input sanitized |
| Insecure Deserialization | Object injection | Manual | Safe deserialization |
| Known Vulnerabilities | Dependencies | npm audit | No critical vulnerabilities |
| Insufficient Logging | Security events | Manual | Adequate logging |

### 7.2 Authentication Tests

- [ ] Password policy enforcement
- [ ] Account lockout after failed attempts
- [ ] Session timeout
- [ ] JWT token expiration
- [ ] Role-based access control
- [ ] API key security
- [ ] CORS configuration
- [ ] Rate limiting

---

## 8. Performance Testing

### 8.1 Load Test Scenarios

| Scenario | Virtual Users | Duration | Ramp-up | Expected RPS |
|----------|---------------|----------|---------|--------------|
| Normal Load | 100 | 5m | 1m | >50 |
| Peak Load | 500 | 10m | 2m | >100 |
| Stress Test | 1000 | 15m | 5m | Monitor |

### 8.2 Performance Metrics

| Metric | Target |
|--------|--------|
| Response Time (p95) | < 2s |
| Error Rate | < 1% |
| CPU Usage | < 70% |
| Memory Usage | < 80% |
| Database Queries | < 100ms |

---

## 9. Reorder Automation Testing

### 9.1 Test Cases

| ID | Description | Steps | Expected Result |
|----|-------------|-------|-----------------|
| RA-001 | Stock below reorder point | 1. Reduce stock below reorder point<br>2. Run reorder check | PR generated |
| RA-002 | Stock above reorder point | 1. Ensure stock above reorder point<br>2. Run reorder check | No PR generated |
| RA-003 | Stock at reorder point | 1. Set stock to reorder point<br>2. Run reorder check | PR generated |
| RA-004 | Multiple items below threshold | 1. Multiple items below threshold<br>2. Run reorder check | Single PR with all items |
| RA-005 | Supplier lead time | 1. Set long lead time<br>2. Run reorder check | Order quantity accounts for lead time |

### 9.2 Test Data

```javascript
// Test data for reorder automation
describe('Reorder Automation', () => {
  test('should generate PR when stock below reorder point', async () => {
    // Setup test item with low stock
    const item = await Item.create({
      name: 'Reorder Test Item',
      sku: 'REORDER-TEST-001',
      categoryId: testCategory.id,
      uom: 'Pcs',
      price: 100,
      currentStock: 10,
      reorderPoint: 50,
      safetyStock: 20,
      leadTime: 7,
      status: 'Active'
    });

    // Run reorder check
    await reorderService.checkAndGenerateOrders();

    // Verify PR was created
    const pr = await PurchaseRequisition.findOne({
      where: { status: 'Pending' },
      include: [{ model: PurchaseRequisitionItem }]
    });

    expect(pr).toBeDefined();
    expect(pr.items).toHaveLength(1);
    expect(pr.items[0].itemId).toBe(item.id);
  });
});
```

---

## 10. User Acceptance Testing (UAT)

### 10.1 UAT Test Cases

#### UAT-001: Inventory Management

| Step | Action | Expected Result | Pass/Fail | Comments |
|------|--------|-----------------|-----------|----------|
| 1 | Add new item | Item added successfully | | |
| 2 | Edit item | Changes saved | | |
| 3 | View item details | All details displayed | | |
| 4 | Delete item | Item removed | | |
| 5 | Search items | Correct results | | |
| 6 | Filter items | Correct filtering | | |
| 7 | Export items | File downloaded | | |

#### UAT-002: Stock Operations

| Step | Action | Expected Result | Pass/Fail | Comments |
|------|--------|-----------------|-----------|----------|
| 1 | Receive stock | Stock updated | | |
| 2 | Issue stock | Stock reduced | | |
| 3 | Adjust stock | Adjustment recorded | | |
| 4 | View stock history | All transactions shown | | |
| 5 | Stock count | Variance reported | | |

### 10.2 UAT Sign-Off

```
UAT Sign-Off Form
Project: IMRAS
Version: 1.0.0
Date: [Date]

Tested By: ___________________
Role: _______________________

Test Results:
- [ ] All test cases passed
- [ ] Critical issues resolved
- [ ] Performance acceptable
- [ ] Documentation reviewed

Approval:
___________________________
Signature

Date: _____________________
```

---

## 11. Test Data Management

### 11.1 Test Data Generation

```bash
# Generate test data
node tests/seeders/generateTestData.js

# Clean test data
node tests/seeders/generateTestData.js clean
```

### 11.2 Test Data Scenarios

| Scenario | Description | Test Data |
|----------|-------------|-----------|
| Normal | Typical usage | Standard items, normal stock levels |
| Low Stock | Items below reorder point | Stock < reorderPoint |
| Critical | Items below safety stock | Stock < safetyStock |
| Expired | Items with expired batches | expiryDate < today |
| No Movement | Items with no transactions | No stock movements |

---

## 12. Bug Reporting

### 12.1 Bug Report Template

```
Title: [Brief description]

Environment:
- Version: [e.g., 1.0.0]
- Browser/OS: [e.g., Chrome 98/Windows 10]
- Database: [e.g., MySQL 8.0]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Screenshots/Logs:
[Attach relevant files]

Severity: [Critical/High/Medium/Low]
Priority: [P0/P1/P2/P3]
```

### 12.2 Bug Triage

| Severity | Priority | Response Time | Resolution Time |
|----------|----------|---------------|-----------------|
| Critical | P0 | 1 hour | 4 hours |
| High | P1 | 4 hours | 1 day |
| Medium | P2 | 1 day | 3 days |
| Low | P3 | 3 days | Next release |

---

## 13. Test Automation

### 13.1 Test Automation Framework

**Structure:**
```
tests/
  ├── e2e/
  │   ├── pages/
  │   ├── specs/
  │   └── support/
  ├── integration/
  ├── unit/
  └── utils/
```

### 13.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: imras_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd "mysqladmin ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 3
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      env:
        NODE_ENV: test
        DB_HOST: 127.0.0.1
        DB_USER: root
        DB_PASSWORD: root
        DB_NAME: imras_test
      run: |
        npm test
        npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        file: ./coverage/lcov.info
        fail_ci_if_error: true
```

---

## Conclusion

This testing guide provides a comprehensive approach to ensure the quality and reliability of the IMRAS system. By following these testing practices, we can maintain high standards of quality and deliver a robust inventory management solution.

**Key Success Metrics:**
- Test coverage > 80%
- Critical bug fix rate > 95%
- Test automation rate > 70%
- UAT pass rate > 90%

**Next Steps:**
1. Review and update test cases regularly
2. Increase test automation coverage
3. Perform regular security audits
4. Monitor production metrics
5. Gather user feedback for improvements
