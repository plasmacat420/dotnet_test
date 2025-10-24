# 🧪 TESTING GUIDE - All Improvements

All improvements have been built and are ready for testing. **DO NOT START THE CONTAINER YET** - follow this guide to test everything systematically.

---

## 📋 **WHAT WAS IMPROVED**

### ✅ **1. Email Functionality Fixed**
- Email credentials loaded from `.env` file
- Contact form now sends emails to `faiz.corsair@gmail.com`
- Sender receives automatic confirmation email
- Beautiful HTML email templates

### ✅ **2. Rate Limiting Added**
- Contact form limited to **5 requests per hour per IP**
- Prevents spam attacks
- Returns HTTP 429 (Too Many Requests) when limit exceeded

### ✅ **3. Debug Logging Disabled**
- Production-ready: No console spam
- Cleaner browser console
- Slight performance improvement

### ✅ **4. Particle Effects Enhanced**
- Particle limit increased: **200 → 400**
- More epic explosion effects
- Still maintains 60fps with MAX_ZOMBIES=50

---

## 🚀 **START TESTING**

### **Step 1: Start the Container**
```bash
cd C:\Users\faiz0\Downloads\codes\dotnet_test
docker-compose up -d api
```

### **Step 2: Verify Container is Healthy**
```bash
docker ps
```
You should see: `Up X seconds (healthy)`

---

## 🧪 **TEST SCENARIOS**

### **TEST 1: Contact Form Email (Main Feature)**

**Send a test contact message:**
```bash
curl -X POST http://localhost:5264/api/contact ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"your-personal-email@gmail.com\",\"subject\":\"Testing Contact Form\",\"message\":\"This is a test message to verify email functionality works!\"}"
```

**Expected Results:**
1. ✅ API responds with success message
2. ✅ You receive email at `faiz.corsair@gmail.com` with:
   - Purple gradient header
   - Sender's name, email, subject
   - Full message content
   - Timestamp
3. ✅ Sender (`your-personal-email@gmail.com`) receives confirmation email with:
   - Green checkmark emoji
   - Message summary
   - Your contact info

**If emails don't arrive:**
- Check Gmail spam folder
- Wait 1-2 minutes (SMTP can be slow)
- Check Docker logs: `docker logs voiceagent-api`

---

### **TEST 2: Rate Limiting**

**Test 1 - Normal Request (Should Work):**
```bash
curl -X POST http://localhost:5264/api/contact ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test 1\",\"email\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"First request\"}"
```
✅ Should return: `"success": true`

**Test 2 - Spam Attack (Should Block):**

Run this 6 times rapidly:
```bash
for /L %i in (1,1,6) do @(
  curl -X POST http://localhost:5264/api/contact ^
    -H "Content-Type: application/json" ^
    -d "{\"name\":\"Spam %i\",\"email\":\"spam@example.com\",\"subject\":\"Spam\",\"message\":\"Spam message\"}"
  && echo.
)
```

**Expected Results:**
- First 5 requests: ✅ Success (HTTP 200)
- 6th request: ❌ **Rate limit exceeded** (HTTP 429)
- Response: `"message": "Rate limit exceeded"`

---

### **TEST 3: Game Performance**

**Test the zombie game:**
1. Open browser: http://localhost:5264
2. Click **"Play Game"** button
3. Play for 2-3 minutes

**What to Check:**
- ✅ No console errors (debug logging disabled)
- ✅ Game runs smoothly at 60fps
- ✅ Zombies spawn up to max 50
- ✅ Orb throws create massive particle explosions (400 particles!)
- ✅ Explosion shockwave rings appear
- ✅ Camera shake on impact
- ✅ Colored screen flashes (ice=cyan, fire=orange, electric=purple)

**Performance Expectations:**
- FPS: 60 (consistent)
- Zombie Count: Up to 50 max
- Particle Count: Up to 400 active particles
- No lag or stuttering

---

### **TEST 4: Transcript Email (Already Working)**

This feature sends AI conversation summaries after voice calls end.

**To test (if you have voice agent running):**
1. Start a voice conversation
2. Talk for a bit
3. End the conversation
4. Check email for conversation summary

---

## 📊 **VERIFICATION CHECKLIST**

Use this checklist to verify everything works:

### **Email System**
- [ ] Contact form sends email to `faiz.corsair@gmail.com`
- [ ] Email has purple gradient header and proper formatting
- [ ] Sender receives confirmation email
- [ ] Confirmation email has checkmark emoji and proper formatting
- [ ] Both emails arrive within 1-2 minutes

### **Rate Limiting**
- [ ] First 5 requests succeed
- [ ] 6th request returns HTTP 429
- [ ] Error message says "Rate limit exceeded"
- [ ] After 1 hour, requests work again

### **Game Performance**
- [ ] Browser console is clean (no spam)
- [ ] Game runs at 60fps
- [ ] Up to 50 zombies spawn
- [ ] Epic particle explosions (visibly more than before)
- [ ] Explosion rings expand on impact
- [ ] Camera shakes on hit
- [ ] Screen flashes with orb color

### **General**
- [ ] No errors in Docker logs
- [ ] API responds to all endpoints
- [ ] Container stays healthy

---

## 🐛 **TROUBLESHOOTING**

### **Emails Not Sending**

**Check Gmail App Password:**
```bash
# Verify .env has correct password
type .env | findstr "Email__SenderPassword"
```

**Check Docker Logs:**
```bash
docker logs voiceagent-api | findstr /C:"email" /C:"Email" /C:"smtp"
```

**Common Issues:**
1. Gmail app password expired → Generate new one
2. SMTP blocked by firewall → Check network settings
3. Wrong email in .env → Verify credentials

### **Rate Limiting Not Working**

**Verify Service Registered:**
```bash
docker logs voiceagent-api | findstr "RateLimitingService"
```

Should see no errors about missing service.

### **Game Performance Issues**

**Check FPS Counter:**
Press F12 → Look for performance stats in top-left

**If FPS < 60:**
- Lower particle count back to 200
- Reduce MAX_ZOMBIES to 30
- Check GPU usage

---

## 📝 **TEST RESULTS FORMAT**

**When reporting test results, use this format:**

```
TEST 1: Contact Form Email
Status: ✅ PASS / ❌ FAIL
Details: [What happened]
Screenshot: [Optional]

TEST 2: Rate Limiting
Status: ✅ PASS / ❌ FAIL
Details: [What happened]

TEST 3: Game Performance
Status: ✅ PASS / ❌ FAIL
FPS: [number]
Max Zombies: [number]
Issues: [Any lag or problems]
```

---

## 🎯 **READY FOR PRODUCTION?**

### **Before Deploying to Azure:**

1. ✅ All tests pass locally
2. ✅ Emails sending correctly
3. ✅ Rate limiting working
4. ✅ Game performance good
5. ✅ No errors in logs

### **Azure Environment Variables to Set:**

Make sure these are in Azure App Service Configuration:

```bash
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SenderEmail=faiz.corsair@gmail.com
Email__SenderPassword=REDACTED_GMAIL_APP_PASSWORD
Email__SenderName=Prepreater & Co. Voice Agent

Groq__ApiKey=REDACTED_GROQ_API_KEY

LiveKit__Url=wss://faizlive-l9i6nt8n.livekit.cloud
LiveKit__ApiKey=REDACTED_LIVEKIT_API_KEY
LiveKit__ApiSecret=REDACTED_LIVEKIT_API_SECRET
```

---

## 🚀 **AFTER TESTING**

Once all tests pass, you're ready to deploy!

**To deploy to Azure:**
```bash
# Stop local container
docker-compose down

# Deploy to Azure (your existing process)
# The Docker image is already built and ready
```

---

## 📞 **NEED HELP?**

If any test fails:
1. Check the specific troubleshooting section above
2. Check Docker logs: `docker logs voiceagent-api`
3. Verify .env file has all credentials
4. Report the exact error message

---

**Happy Testing! 🎉**
