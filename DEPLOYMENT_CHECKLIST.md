# Gigni Deployment Checklist - Security Updates

## Pre-Deployment (Local Testing)

- [ ] Run `npm install` to install new dependencies (bcryptjs, jsonwebtoken)
- [ ] Update `.env` with test credentials
- [ ] Test register endpoint with new validation
- [ ] Test login endpoint returns JWT token
- [ ] Test protected endpoints with token
- [ ] Verify password hashing works
- [ ] Test that users can only access their own data
- [ ] Verify admin-only endpoints work

### Test Commands
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Test registration
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "Test",
    "lname": "User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "college": "MIT"
  }'

# Copy user ID from response, then test login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Copy token from response, then test protected endpoint
curl -X GET http://localhost:3000/api/user/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Vercel Deployment

### Step 1: Push Code to Git
```bash
git add .
git commit -m "Security: Implement JWT authentication and password hashing

- Add bcryptjs for password hashing
- Add JWT for stateless authentication
- Add authentication middleware for protected routes
- Add input validation for email and password strength
- Fix Vercel routing with SPA support
- Update .gitignore to exclude .env

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin main
```

### Step 2: Set Environment Variables in Vercel

1. Go to https://vercel.com/app-weave/gigni
2. Click **Settings** tab
3. Click **Environment Variables** in left sidebar
4. Add these variables:

```
JWT_SECRET = <generate-a-random-string-of-32+ chars>
  Example: "aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4c"

GMAIL_USER = ankushka2089@gmail.com

GMAIL_APP_PASSWORD = eeuo bbnv dwof vmnm
```

### Step 3: Deploy to Vercel

**Option A: Automatic (Recommended)**
- Push to main branch → Vercel auto-deploys
- Monitor deployment at https://vercel.com/app-weave/gigni/deployments

**Option B: Manual**
1. In Vercel project dashboard
2. Click **Deployments** tab
3. Find recent commit
4. Click **... > Redeploy**
5. Confirm and wait for build to complete

### Step 4: Verify Deployment

After deployment completes:

```bash
# Test registration on production
curl -X POST https://www.gigniconnect.space/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "Prod",
    "lname": "Test",
    "email": "prodtest@example.com",
    "password": "ProdPassword123",
    "college": "MIT"
  }'

# Should return: {"success": true, "id": X}

# Test login
curl -X POST https://www.gigniconnect.space/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prodtest@example.com",
    "password": "ProdPassword123"
  }'

# Should return token
```

### Step 5: Initialize Database (First Time Only)

After first deployment, initialize the database:
```bash
curl https://www.gigniconnect.space/api/init
```

Response should be:
```json
{
  "success": true,
  "message": "Database initialized and admin checked"
}
```

## Post-Deployment Verification

- [ ] Website loads without "403 Forbidden" error
- [ ] Landing page displays correctly (gigniconnect.space)
- [ ] Dashboard loads (gigniconnect.space/dashboard.html)
- [ ] Registration endpoint works
- [ ] Login endpoint returns JWT token
- [ ] Protected endpoints require valid token
- [ ] Admin endpoints require admin token
- [ ] User data isolation working (users see only their data)
- [ ] Database initialized with admin user
- [ ] Email sending working (check Gmail for welcome emails)

## Frontend Updates Needed

The frontend needs to be updated to:

1. **Store JWT Token:**
```javascript
// After login
localStorage.setItem('auth_token', data.token);
```

2. **Send Token in Requests:**
```javascript
// For all API calls to protected endpoints
fetch('/api/user/' + userId, {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
});
```

3. **Handle 401/403 Errors:**
```javascript
if (response.status === 401 || response.status === 403) {
  localStorage.removeItem('auth_token');
  // Redirect to login
}
```

4. **Display Login Page:**
- Create login page that calls POST `/api/login`
- Store returned token
- Redirect to dashboard on success

## Rollback Plan (If Issues)

If deployment causes problems:

1. Go to Vercel dashboard
2. Click **Deployments** tab
3. Find previous working deployment
4. Click **... > Redeploy** on that version
5. Wait for rollback to complete

This will revert to the previous code and environment variables.

## Monitoring & Maintenance

### Daily
- [ ] Check Vercel Logs for errors
- [ ] Verify website loads without errors
- [ ] Spot check user registrations working

### Weekly
- [ ] Review failed authentication attempts
- [ ] Check database health
- [ ] Monitor email sending (Gmail)

### Monthly
- [ ] Update JWT_SECRET (rotate keys)
- [ ] Review security logs
- [ ] Update dependencies (`npm update`)

## Known Issues & Workarounds

### Issue 1: Email Sending Fails
**Cause:** Gmail credentials incorrect
**Fix:** 
- Verify Gmail app password in .env
- Log into Gmail and check 2FA is enabled
- Generate new app password if needed

### Issue 2: Token Expires Before User Completes Action
**Cause:** 24-hour token expiration
**Fix:**
- Implement token refresh endpoint
- Or increase expiration to 7 days (less secure)

### Issue 3: Users Losing Login on Page Refresh
**Cause:** Token only stored in memory
**Fix:**
- Store token in localStorage (current)
- Or use secure HttpOnly cookies
- Implement "Remember Me" feature

## Quick Fixes for Common Issues

### Restart Vercel Build
```bash
# Forces a complete rebuild
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Clear Vercel Cache
1. Vercel Dashboard > Settings > Git
2. Click "Disconnect Git"
3. Click "Connect Git" again
4. Select repository and redeploy

### Update Database Schema
Visit endpoint to re-run migrations:
```bash
curl https://www.gigniconnect.space/api/init
```

## Support & Troubleshooting

**Check Logs:**
1. Vercel Dashboard > Deployments > Click recent build
2. View **Logs** tab for errors
3. Check **Runtime Logs** for server errors

**Test API Directly:**
Use the curl commands above to test each endpoint independently.

**Enable Debug Mode:**
In Vercel settings, set:
```
DEBUG=gigni:*
NODE_ENV=development
```

---

**Last Updated:** 2026-05-10
**Deployment Ready:** ✅ YES
**Testing Status:** ⏳ PENDING (Local tests needed)
