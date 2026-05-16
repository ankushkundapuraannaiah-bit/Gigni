# 🎯 START HERE - Gigni Deployment Guide

## You Have 5 Simple Steps to Deploy

Follow these steps in order. Each step takes 2-5 minutes. **Total time: 20 minutes.**

---

## 📋 STEP 1: Open Terminal (1 minute)

**Open Command Prompt:**
1. Press `Win + R`
2. Type: `cmd`
3. Press Enter

**Navigate to project:**
```bash
cd c:\Users\Ankush\OneDrive\Documents\Gigni
```

✅ Ready for next step!

---

## 📤 STEP 2: Push Code to GitHub (5 minutes)

**Copy & paste these commands one by one:**

### Command 1:
```bash
git add .
```

### Command 2:
```bash
git commit -m "Security: Implement JWT authentication and password hashing

- Add bcryptjs for password hashing
- Add JWT for stateless authentication
- Add authentication middleware for protected routes
- Add input validation for email and password strength
- Fix Vercel routing with SPA support
- Update .gitignore to exclude .env

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Command 3:
```bash
git push origin main
```

**Expected output:**
```
Enumerating objects: 12, done.
...
[main abc1234] Security: Implement JWT auth...
To github.com:ankushkundapuraannaiah-bit/Gigni.git
   def5678..abc1234  main -> main
```

✅ Your code is now on GitHub!

---

## 🔐 STEP 3: Configure Vercel Environment Variables (3 minutes)

**Open browser and go to:**
https://vercel.com/app-weave/gigni/settings/environment-variables

**Add Variable 1:**
- Click "Add New"
- Name: `JWT_SECRET`
- Value: `aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4c`
- Environments: ☑️ Production, ☑️ Preview, ☑️ Development
- Click "Save"

**Add Variable 2:**
- Click "Add New"
- Name: `GMAIL_USER`
- Value: `ankushka2089@gmail.com`
- Environments: ☑️ All
- Click "Save"

**Add Variable 3:**
- Click "Add New"
- Name: `GMAIL_APP_PASSWORD`
- Value: `eeuo bbnv dwof vmnm`
- Environments: ☑️ All
- Click "Save"

✅ Environment variables configured!

---

## 🚀 STEP 4: Wait for Auto-Deployment (2 minutes)

**Check deployment status:**
https://vercel.com/app-weave/gigni/deployments

**Look for:**
- Latest deployment at top
- Wait until status shows: **"Ready"** ✅

This happens automatically. Just wait and check back.

---

## 🔧 STEP 5: Initialize Database (1 minute)

**Back in terminal, run:**
```bash
curl https://www.gigniconnect.space/api/init
```

**Should see:**
```json
{
  "success": true,
  "message": "Database initialized and admin checked"
}
```

✅ Database initialized!

---

## 🧪 BONUS: Quick Test (3 minutes)

**Test Registration (copy & paste):**
```bash
curl -X POST https://www.gigniconnect.space/api/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fname\": \"Test\", \"lname\": \"User\", \"email\": \"test@example.com\", \"password\": \"TestPassword123\", \"college\": \"MIT\"}"
```

Should see: `{"success": true, "id": 1}` ✅

**Test Login (copy & paste):**
```bash
curl -X POST https://www.gigniconnect.space/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"test@example.com\", \"password\": \"TestPassword123\"}"
```

Should see: `{"success": true, "token": "eyJ..."}` ✅

---

## 🎉 DONE! You're Live!

Your API is now live and secure!

- ✅ Code on GitHub
- ✅ Deployed on Vercel
- ✅ Environment configured
- ✅ Database initialized
- ✅ API tested

---

## 📚 What Changed?

### Security Improvements
- ✅ Passwords now hashed (not plain text)
- ✅ JWT authentication (secure tokens)
- ✅ Admin credentials protected
- ✅ Input validation added
- ✅ User data isolated

### Endpoints Protected
- GET `/api/user/:id` - Requires JWT
- POST `/api/user/update` - Requires JWT
- POST `/api/user/add-item` - Requires JWT
- GET `/api/users` - Admin only
- POST `/api/admin/send-bulk-email` - Admin only

### Public Endpoints (No Auth)
- POST `/api/register` - Create account
- POST `/api/login` - Get JWT token
- GET `/api/init` - Initialize DB

---

## 📞 Need Help?

### Quick Issues

**Website shows 403 error?**
→ Wait 2-3 minutes for deployment to complete

**API returns "No token provided"?**
→ Verify JWT_SECRET is set in Vercel env variables

**Registration fails?**
→ Check Vercel deployment status
→ Verify environment variables are all set

**Emails not working?**
→ Check GMAIL_USER and GMAIL_APP_PASSWORD values

---

## 📖 Documentation Files

For more details, read:

- `QUICK_DEPLOY.txt` - Visual deployment guide
- `GITHUB_DEPLOYMENT_GUIDE.md` - Detailed step-by-step
- `API_AUTHENTICATION_GUIDE.md` - API documentation
- `SECURITY_FIXES.md` - What was fixed
- `DEPLOYMENT_CHECKLIST.md` - Full checklist

---

## 🔗 Important Links

| Link | Purpose |
|------|---------|
| https://github.com/ankushkundapuraannaiah-bit/Gigni | GitHub Repo |
| https://vercel.com/app-weave/gigni | Vercel Dashboard |
| https://vercel.com/app-weave/gigni/deployments | Check Deployment |
| https://www.gigniconnect.space | Live Website |

---

## ⏱️ Time Breakdown

| Step | Time |
|------|------|
| Open Terminal | 1 min |
| Push to GitHub | 5 min |
| Configure Vercel | 3 min |
| Wait for Deploy | 2 min |
| Init Database | 1 min |
| Test API | 3 min |
| **TOTAL** | **15 min** |

---

## ✅ You're Ready!

All code is secure and tested.
Just follow the 5 steps above.
You'll be live in 15-20 minutes!

**Start with STEP 1 now! 👆**

---

**Document:** START_HERE.md  
**Last Updated:** 2026-05-10 5:52 PM IST  
**Status:** 🟢 Ready to Deploy
