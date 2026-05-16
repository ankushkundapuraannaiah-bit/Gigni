# Gigni API Authentication Guide

## Overview

The Gigni API now uses JWT (JSON Web Tokens) for authentication and bcryptjs for password hashing. All sensitive endpoints require authentication.

## Authentication Flow

```
1. User registers with email & password
2. Password is hashed with bcrypt (10 rounds)
3. User logs in with credentials
4. Server validates and returns JWT token
5. Client stores token and includes in Authorization header
6. Server validates token on each request
```

## Setup

### Environment Variables (Required)

Add these to your `.env` file locally or Vercel environment variables in production:

```env
JWT_SECRET=your-super-secret-key-minimum-32-chars-recommended
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
DATABASE_URL=your-vercel-postgres-connection-string
```

### Install Dependencies

```bash
npm install
```

Required packages added:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation and verification

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Register User
```http
POST /api/register
Content-Type: application/json

{
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "college": "MIT",
  "year": "2nd Year",
  "field": "Computer Science",
  "interest": "AI/ML",
  "intro": "Passionate about AI",
  "linkedin": "linkedin.com/in/johndoe",
  "github": "github.com/johndoe"
}
```

**Response:** 
```json
{
  "success": true,
  "id": 1
}
```

**Validation:**
- Email must be valid format
- Password minimum 8 characters
- fname, lname, email, password, college are required

#### 2. Login & Get Token
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "college": "MIT"
  }
}
```

**Token Details:**
- Expires in 24 hours
- Include in Authorization header as: `Bearer <token>`

#### 3. Initialize Database (Development Only)
```http
GET /api/init
```

Creates tables and ensures admin user exists. Run once during setup.

---

### Protected Endpoints (Authentication Required)

All protected endpoints require the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1. Get User Profile
```http
GET /api/user/:id
Authorization: Bearer <TOKEN>
```

**Notes:** Users can only view their own profile. Admin can view any profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "college": "MIT",
    "year": "2nd Year",
    "field": "Computer Science",
    "interest": "AI/ML",
    "intro": "Passionate about AI",
    "linkedin": "linkedin.com/in/johndoe",
    "github": "github.com/johndoe",
    "projects": [],
    "certificates": [],
    "hackathons": []
  }
}
```

#### 2. Update User Profile
```http
POST /api/user/update
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "userId": 1,
  "fname": "John",
  "lname": "Doe",
  "college": "MIT",
  "year": "3rd Year",
  "field": "AI & Machine Learning",
  "interest": "Deep Learning",
  "intro": "AI researcher and developer",
  "linkedin": "linkedin.com/in/johndoe",
  "github": "github.com/johndoe"
}
```

**Notes:** Users can only update their own profile.

#### 3. Add Portfolio Item (Project/Certificate/Hackathon)
```http
POST /api/user/add-item
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "userId": 1,
  "type": "projects",
  "item": {
    "title": "AI Chatbot",
    "description": "Built a chatbot using transformers",
    "url": "github.com/project",
    "date": "2026-05-10"
  }
}
```

**Types:** `projects`, `certificates`, `hackathons`

#### 4. Apply for Zorus Internship
```http
POST /api/zorus-apply
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "userId": 1,
  "email": "john@example.com",
  "fname": "John",
  "lname": "Doe"
}
```

**Response:**
```json
{
  "success": true
}
```

**Notes:**
- Users can only apply once
- Sends assessment invitation email

#### 5. Submit Zorus Test Score
```http
POST /api/zorus-submit-score
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "userId": 1,
  "score": 92
}
```

---

### Admin-Only Endpoints

These require admin authentication (email must be `ankushka2089@gmail.com`).

#### 1. Get All Users
```http
GET /api/users
Authorization: Bearer <ADMIN_TOKEN>
```

Returns list of all users (basic info only, no passwords).

#### 2. Get Zorus Applications
```http
GET /api/zorus-applications
Authorization: Bearer <ADMIN_TOKEN>
```

Returns all Zorus internship applications with scores.

#### 3. Send Bulk Email
```http
POST /api/admin/send-bulk-email
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "emails": ["user1@example.com", "user2@example.com"],
  "subject": "Important Announcement",
  "htmlBody": "<h1>Hello</h1><p>This is an important message</p>"
}
```

**Response:** NDJSON stream with progress updates

```
{"type":"sent","email":"user1@example.com","index":0,"total":2}
{"type":"waiting","index":1,"secondsLeft":20}
...
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```
or
```json
{
  "error": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "error": "Invalid token"
}
```
or
```json
{
  "error": "Unauthorized"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid email format"
}
```
or
```json
{
  "error": "Password must be at least 8 characters"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Server Error
```json
{
  "error": "Database connection failed"
}
```

---

## Client Implementation Examples

### JavaScript/Fetch

```javascript
// Login
const response = await fetch('https://www.gigniconnect.space/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePassword123'
  })
});

const data = await response.json();
const token = data.token;

// Store token (use secure method in production)
localStorage.setItem('auth_token', token);

// Make authenticated request
const userResponse = await fetch('https://www.gigniconnect.space/api/user/1', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const user = await userResponse.json();
```

### React Hook
```javascript
const useGigniAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  
  const login = async (email, password) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
    }
    return data;
  };
  
  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
  };
  
  const fetchProtected = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };
  
  return { token, login, logout, fetchProtected };
};
```

---

## Security Notes

✅ **Passwords:** Hashed with bcrypt (10 rounds salt)
✅ **Tokens:** JWT signed with secret key, 24-hour expiration
✅ **HTTPS Only:** Always use HTTPS in production
✅ **Validation:** Email format and password strength validated
✅ **Authorization:** Users can only access their own data
✅ **SQL Injection:** Protected with parameterized queries

⚠️ **Remember:**
- Keep JWT_SECRET secure and long (32+ characters recommended)
- Never hardcode tokens in frontend
- Store tokens securely (HttpOnly cookies in production)
- Implement token refresh for long-lived sessions
- Add rate limiting for production

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"fname":"John","lname":"Doe","email":"john@example.com","password":"SecurePass123","college":"MIT"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# Get Token from response and use below

# Get User Profile
curl -X GET http://localhost:3000/api/user/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

**Q: "No token provided" error**
A: Add Authorization header with Bearer token

**Q: "Invalid token" error**
A: Token may have expired (24h limit). Login again to get new token.

**Q: "Invalid email or password" error**
A: Check email and password are correct. Passwords are case-sensitive.

**Q: "Password must be at least 8 characters" error**
A: Password must be 8+ characters long.

**Q: "Email already exists" error**
A: Use a different email address for registration.

---

**Last Updated:** 2026-05-10
**Version:** 2.0 (With JWT Authentication)
