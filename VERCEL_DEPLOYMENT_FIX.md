# Vercel Deployment Issue - Quick Fix

## ⚠️ Problem

The Vercel deployment at https://vercel.com/app-weave/gigni/2acAgERLjNwrEfscjfsv3Ucy7SNg may be failing because **environment variables are not configured**.

## ✅ Solution

### Step 1: Set Environment Variables in Vercel

1. Go to https://vercel.com/app-weave/gigni
2. Click **Settings** (top menu)
3. Click **Environment Variables** (left sidebar)
4. Add these 3 variables:

```
Variable Name: JWT_SECRET
Value: aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4c5dE6fG7h
Environments: Production, Preview, Development
```

```
Variable Name: GMAIL_USER
Value: ankushka2089@gmail.com
Environments: Production, Preview, Development
```

```
Variable Name: GMAIL_APP_PASSWORD
Value: eeuo bbnv dwof vmnm
Environments: Production, Preview, Development
```

### Step 2: Redeploy

After adding variables, you have two options:

**Option A: Automatic (Recommended)**
1. Make a small change to code (e.g., add a comment)
2. `git push` to trigger auto-deploy
3. New deployment will use the env variables

**Option B: Manual Redeploy**
1. Go to Vercel dashboard
2. Click **Deployments** tab
3. Find the failed deployment
4. Click **... > Redeploy** button
5. Confirm redeployment

### Step 3: Initialize Database

After deployment succeeds, run:
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

### Step 4: Test the API

```bash
# Test registration
curl -X POST https://www.gigniconnect.space/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "Test",
    "lname": "User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "college": "MIT"
  }'

# Should return: {"success": true, "id": 1}
```

---

## 🔍 Troubleshooting

### Issue: Still Getting 403 Error
**Cause:** Environment variables not refreshed
**Fix:** 
1. Wait 5-10 seconds after setting variables
2. Force redeploy (make git commit and push)
3. Check Vercel logs for actual error

### Issue: "Error: Unauthorized" from JWT
**Cause:** JWT_SECRET not set correctly
**Fix:**
1. Copy exact value from .env
2. Set in Vercel env vars
3. Redeploy

### Issue: Emails not sending
**Cause:** Gmail credentials wrong
**Fix:**
1. Verify GMAIL_USER matches .env
2. Verify GMAIL_APP_PASSWORD matches .env (should be 16 characters with spaces)
3. Ensure 2FA is enabled on Gmail account

---

## 📋 Verification Checklist

- [ ] All 3 environment variables added in Vercel
- [ ] Deployment triggered and completed successfully
- [ ] `/api/init` returns success
- [ ] Registration endpoint works
- [ ] Login endpoint works
- [ ] Website loads without 403 error

---

## 💡 Quick Reference

**Vercel Settings URL:**
https://vercel.com/app-weave/gigni/settings/environment-variables

**Deployment Dashboard:**
https://vercel.com/app-weave/gigni/deployments

**Current Website:**
https://www.gigniconnect.space

---

If issues persist, check Vercel logs:
1. Go to https://vercel.com/app-weave/gigni/deployments
2. Click on latest deployment
3. View "Runtime Logs" tab for errors
