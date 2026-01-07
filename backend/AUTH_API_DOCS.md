# IMRAS Authentication API Documentation

## Base URL
```
http://localhost:5000/api/auth
```

## Endpoints

### 1. Register User
**POST** `/api/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "Staff"
}
```

**Validation Rules:**
- `username`: 3-50 characters, alphanumeric and underscores only
- `email`: Valid email format
- `password`: Minimum 6 characters
- `full_name`: 2-100 characters, required
- `role`: Optional, must be 'Admin', 'Manager', or 'Staff' (default: 'Staff')

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "role": "Staff",
    "is_active": true,
    "createdAt": "2024-12-01T10:00:00.000Z",
    "updatedAt": "2024-12-01T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Username or email already exists"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "role": "Staff"
  }'
```

---

### 2. Login
**POST** `/api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Note:** `username` can be either username or email

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": 1,
      "username": "john_doe",
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "role": "Staff",
      "is_active": true
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123"
  }'
```

---

### 3. Get Current User
**GET** `/api/auth/me`

**Access:** Private (requires token)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "User retrieved successfully",
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "role": "Staff",
    "is_active": true,
    "createdAt": "2024-12-01T10:00:00.000Z",
    "updatedAt": "2024-12-01T10:00:00.000Z"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4. Change Password
**PUT** `/api/auth/change-password`

**Access:** Private (requires token)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "password123",
  "new_password": "newpassword456"
}
```

**Validation Rules:**
- `current_password`: Required
- `new_password`: Minimum 6 characters

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password changed successfully",
  "data": null
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Current password is incorrect"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "password123",
    "new_password": "newpassword456"
  }'
```

---

### 5. Logout
**POST** `/api/auth/logout`

**Access:** Private (requires token)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logout successful",
  "data": null
}
```

**Note:** Since JWT is stateless, logout is handled client-side by removing the token. This endpoint just confirms the action.

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Testing Protected Routes

### Example: Access Protected Route with Role Middleware

**Route requiring Admin role:**
```javascript
router.get('/admin-only', verifyToken, isAdmin, adminController.getData);
```

**Request:**
```bash
curl -X GET http://localhost:5000/api/admin-only \
  -H "Authorization: Bearer <admin_token>"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response (403) - Non-admin user:**
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (wrong credentials, no token, invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Server Error |

---

## Security Features

1. **Password Hashing:** All passwords are hashed using bcryptjs (10 salt rounds)
2. **JWT Tokens:** Tokens expire in 24 hours (configurable via `JWT_EXPIRE`)
3. **Token Verification:** Tokens are verified on every protected route
4. **User Status Check:** Inactive users cannot login or access protected routes
5. **Input Validation:** All inputs are validated using express-validator
6. **Password Never Returned:** Password hash is never included in API responses

---

## Environment Variables Required

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h
```

---

## Complete Testing Flow

1. **Register a new user:**
```bash
POST /api/auth/register
```

2. **Login to get token:**
```bash
POST /api/auth/login
# Save the token from response
```

3. **Access protected route:**
```bash
GET /api/auth/me
# Include token in Authorization header
```

4. **Change password:**
```bash
PUT /api/auth/change-password
# Include token and provide current/new passwords
```

5. **Logout (client-side):**
```bash
POST /api/auth/logout
# Remove token from client storage
```

