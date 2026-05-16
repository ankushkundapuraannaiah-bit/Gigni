# 🚀 GitHub Push & Vercel Deployment Guide

## Step 1: Push Code to GitHub (5 minutes)

### Open Command Prompt or Git Bash

**Option A: Command Prompt**
```cmd
cd c:\Users\Ankush\OneDrive\Documents\Gigni
```

**Option B: Git Bash**
- Right-click in Gigni folder
- Select "Git Bash Here"

### Add All Changes

```bash
git add .
```

**Output:** Should show nothing (means all files staged)

### Commit Changes

```bash
git commit -m "Security: Implement JWT authentication and password hashing

- Add bcryptjs for password hashing
- Add JWT for stateless authentication
- Add authentication middleware for protected routes
- Add input validation for email and password strength
- Fix Vercel routing with SPA support
- Update .gitignore to exclude .env
- Add comprehensive security documentation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

**Expected Output:**
```
[main abc1234] Security: Implement JWT auth...
 8 files changed, 500 insertions(+), 50 deletions(-)
 create mode 100644 SECURITY_FIXES.md
 create mode 100644 API_AUTHENTICATION_GUIDE.md
 ...
```

### Push to GitHub

```bash
git push origin main
```

**Expected Output:**
```
Enumerating objects: 12, done.
Counting objects: 100% (12/12), done.
Delta compression using up to 8 threads
To github.com:ankushkundapuraannaiah-bit/Gigni.git
   def5678..abc1234  main -> main
```

✅ **Success!** Code is now on GitHub

---

## Step 2: Configure Vercel Environment Variables (3 minutes)

### Go to Vercel Dashboard

1. Open browser: https://vercel.com/app-weave/gigni
2. Login if needed

### Access Environment Variables

1. Click **Settings** (top menu)
2. Click **Environment Variables** (left sidebar)

### Add Variable 1: JWT_SECRET

1. Click **Add New**
2. Fill in:
   - **Name:** JWT_SECRET
   - **Value:** `aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4c5dE6fG`
   - **Environments:** Check all (Production, Preview, Development)
3. Click **Save**

### Add Variable 2: GMAIL_USER

1. Click **Add New**
2. Fill in:
   - **Name:** GMAIL_USER
   - **Value:** `ankushka2089@gmail.com`
   - **Environments:** Check all
3. Click **Save**

### Add Variable 3: GMAIL_APP_PASSWORD

1. Click **Add New**
2. Fill in:
   - **Name:** GMAIL_APP_PASSWORD
   - **Value:** `eeuo bbnv dwof vmnm`
   - **Environments:** Check all
3. Click **Save**

✅ **Success!** Environment variables configured

---

## Step 3: Trigger Vercel Deployment (2 minutes)

### Option A: Automatic Deployment (Recommended)

Since you already pushed to GitHub, Vercel will auto-deploy automatically within 30-60 seconds.

**Check status:**
1. Go to https://vercel.com/app-weave/gigni/deployments
2. Look for latest deployment
3. Wait for status to change from "Building" to "Ready"

### Option B: Manual Redeploy

If you want to manually trigger:

1. Go to https://vercel.com/app-weave/gigni/deployments
2. Find the latest deployment (top of list)
3. Click **... (three dots)**
4. Select **Redeploy**
5. Confirm

---

## Step 4: Initialize Database (1 minute)

After deployment shows "Ready", initialize the database:

### Option A: Using curl

```bash
curl https://www.gigniconnect.space/api/init
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized and admin checked"
}
```

### Option B: Using Browser

1. Open: https://www.gigniconnect.space/api/init
2. You should see JSON response

✅ **Success!** Database is initialized

---

## Step 5: Test the API (3 minutes)

### Test Registration

**Copy this entire command and run in terminal:**

```bash
curl -X POST https://www.gigniconnect.space/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fname\": \"Test\", \"lname\": \"User\", \"email\": \"test@example.com\", \"password\": \"TestPassword123\", \"college\": \"MIT\"}"
```

**Expected Response:**
```json
{"success": true, "id": 1}
```

### Test Login

```bash
curl -X POST https://www.gigniconnect.space/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"test@example.com\", \"password\": \"TestPassword123\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "fname": "Test",
    "lname": "User",
    "email": "test@example.com",
    "college": "MIT"
  }
}
```

✅ **Success!** API is working!

---

## Troubleshooting

### Issue: Git push fails with "permission denied"

**Cause:** Git credentials not configured
**Fix:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@gmail.com"
git push origin main
```

### Issue: Vercel deployment shows error

**Cause:** Environment variables not set or wrong value
**Fix:**
1. Double-check environment variables in Vercel
2. Verify values match exactly (no spaces)
3. Redeploy after setting variables

### Issue: "/api/init" returns 403 error

**Cause:** Deployment still in progress
**Fix:**
1. Wait 2-3 minutes
2. Try again
3. Check Vercel deployment status

### Issue: Registration returns "No token provided"

**Cause:** JWT_SECRET environment variable not set
**Fix:**
1. Add JWT_SECRET to Vercel environment variables
2. Wait for deployment to complete
3. Try again

### Issue: Emails not sending

**Cause:** Gmail credentials incorrect
**Fix:**
1. Verify GMAIL_USER is: `ankushka2089@gmail.com`
2. Verify GMAIL_APP_PASSWORD is: `eeuo bbnv dwof vmnm`
3. Ensure 2FA is enabled on Gmail
4. Generate new app password if needed

---

## ✅ Complete Checklist

### GitHub Push
- [ ] Opened terminal in Gigni folder
- [ ] Ran `git add .`
- [ ] Ran `git commit` with message
- [ ] Ran `git push origin main`
- [ ] Confirmed code appears on GitHub

### Vercel Configuration
- [ ] Added JWT_SECRET environment variable
- [ ] Added GMAIL_USER environment variable
- [ ] Added GMAIL_APP_PASSWORD environment variable
- [ ] All set to "All" environments

### Deployment
- [ ] Vercel deployment shows "Ready" status
- [ ] Ran `/api/init` and got success response
- [ ] Tested registration (got token)
- [ ] Tested login (got token)
- [ ] Verified API is working

### Success!
- [ ] Website loads: https://www.gigniconnect.space
- [ ] Registration works
- [ ] Login works
- [ ] Protected endpoints require token

---

## 📞 Quick Reference

**GitHub Repository:**
https://github.com/ankushkundapuraannaiah-bit/Gigni

**Vercel Dashboard:**
https://vercel.com/app-weave/gigni

**Vercel Settings:**
https://vercel.com/app-weave/gigni/settings/environment-variables

**Live Website:**
https://www.gigniconnect.space

**Deployments:**
https://vercel.com/app-weave/gigni/deployments

---

## ⏱️ Timeline

```
Step 1: GitHub Push         ~5 minutes
Step 2: Vercel Config      ~3 minutes
Step 3: Deployment         ~2 minutes (auto or manual)
Step 4: Database Init      ~1 minute
Step 5: Testing            ~3 minutes
                           ─────────────
TOTAL                      ~14 minutes
```

---

## 🎯 Next Steps After Deployment

1. ✅ **Backend deployed and tested**
2. ⏳ **Frontend updates** (required - separate task)
   - Update dashboard.html to use JWT
   - Update admin.html to use JWT
   - Add logout functionality
   - Handle authentication errors

3. ⏳ **Production sign-off**
   - Full end-to-end testing
   - User acceptance testing
   - Go live!

---

**Status:** Ready to deploy! Follow steps above.
**Time to completion:** ~14 minutes
**Difficulty:** Easy (mostly copy-paste commands)

Good luck! 🚀
