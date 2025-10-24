# 🔧 FIX: Agent Not Speaking - LiveKit Cloud Redeploy

## ❌ **ISSUE IDENTIFIED**

The voice agent connects successfully but doesn't speak because:
- **Wrong TTS Voice ID**: Agent was using "Jessica" or "Rachel" (invalid)
- **Correct TTS Voice ID**: Should be `cgSgspJ2msm6clMCkdW9` (ElevenLabs voice ID)

## ✅ **FIXES APPLIED**

1. ✅ Updated `modular/config.py` - Changed default TTS_VOICE from "Jessica" to "cgSgspJ2msm6clMCkdW9"
2. ✅ Updated `.env` - Removed quotes from TTS_VOICE and TTS_MODEL
3. ✅ Updated `DEPLOY.md` - Corrected deployment documentation

## 🚀 **REDEPLOY TO LIVEKIT CLOUD**

### **Step 1: Verify Changes**

Check that these files have the correct voice ID:

```bash
# Check config.py
grep "TTS_VOICE" voice-agent-py/modular/config.py
# Should show: TTS_VOICE = os.getenv("TTS_VOICE", "cgSgspJ2msm6clMCkdW9")

# Check .env
grep "TTS_VOICE" .env
# Should show: TTS_VOICE=cgSgspJ2msm6clMCkdW9 (NO QUOTES!)
```

### **Step 2: Commit Changes**

```bash
cd C:\Users\faiz0\Downloads\codes\dotnet_test

git add voice-agent-py/modular/config.py
git add .env
git add voice-agent-py/DEPLOY.md
git commit -m "fix: Correct TTS voice ID for ElevenLabs"
git push origin master
```

### **Step 3: Redeploy to LiveKit Cloud**

```bash
cd voice-agent-py

# Set environment variables for LiveKit CLI (if not already set)
set LIVEKIT_URL=wss://faizlive-l9i6nt8n.livekit.cloud
set LIVEKIT_API_KEY=REDACTED_LIVEKIT_API_KEY
set LIVEKIT_API_SECRET=REDACTED_LIVEKIT_API_SECRET

# Deploy agent to LiveKit Cloud
lk agent deploy

# Or if you want to specify the agent file explicitly:
lk agent deploy agent.py
```

### **Step 4: Set Environment Variables on LiveKit Cloud**

The LiveKit Cloud agent needs these environment variables. You may need to set them through the LiveKit Cloud dashboard:

**Required:**
```
LIVEKIT_URL=wss://faizlive-l9i6nt8n.livekit.cloud
LIVEKIT_API_KEY=REDACTED_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=REDACTED_LIVEKIT_API_SECRET
DEEPGRAM_API_KEY=REDACTED_DEEPGRAM_API_KEY
GROQ_API_KEY=REDACTED_GROQ_API_KEY
SARVAM_API_KEY=REDACTED_SARVAM_API_KEY
ELEVENLABS_API_KEY=REDACTED_ELEVENLABS_API_KEY
```

**TTS Configuration (CRITICAL):**
```
TTS_PROVIDER=elevenlabs
TTS_VOICE=cgSgspJ2msm6clMCkdW9
TTS_MODEL=eleven_multilingual_v2
TTS_FALLBACK_ENABLED=true
TTS_FALLBACK_PROVIDER=sarvam
TTS_FALLBACK_VOICE=anushka
```

**Agent Configuration:**
```
AGENT_NAME=hindi-voice-agent
PLAYGROUND_MODE=false
LOG_LEVEL=INFO
AGENT_PORT=8081
```

### **Step 5: Verify Deployment**

1. **Check LiveKit Cloud Dashboard:**
   - Go to https://cloud.livekit.io
   - Navigate to your project: `faizlive-l9i6nt8n`
   - Check "Agents" section
   - Agent ID should be: `CA_xjhMp7G2evJr`
   - Status should be: **Running**

2. **Check Agent Logs:**
   ```bash
   lk agent logs
   ```

   Look for:
   ```
   TTS initialized: ElevenLabs + Sarvam fallback
   or
   TTS initialized: ElevenLabs only
   ```

3. **Test Voice Connection:**
   - Open your website: http://localhost:5264
   - Click the speaker button
   - Wait for "Connected" status
   - **The agent should now speak!**

## 🧪 **TESTING CHECKLIST**

After redeployment:

- [ ] Agent deploys successfully to LiveKit Cloud
- [ ] Agent status shows "Running" in dashboard
- [ ] Click speaker button on website
- [ ] Connection establishes (green "Connected")
- [ ] **Agent speaks/greets you** (should hear voice!)
- [ ] Agent responds to your speech
- [ ] Conversation flows naturally

## 🐛 **TROUBLESHOOTING**

### **Agent Still Not Speaking**

**Check 1: Verify Voice ID in Logs**
```bash
lk agent logs | grep "TTS"
```
Should show: `voice_id=cgSgspJ2msm6clMCkdW9`

**Check 2: Verify ElevenLabs API Key**
Test the API key directly:
```bash
curl https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: REDACTED_ELEVENLABS_API_KEY"
```

**Check 3: Test Specific Voice**
```bash
curl https://api.elevenlabs.io/v1/voices/cgSgspJ2msm6clMCkdW9 \
  -H "xi-api-key: REDACTED_ELEVENLABS_API_KEY"
```

**Check 4: Force Fallback to Sarvam**
If ElevenLabs is having issues, the agent should automatically fall back to Sarvam TTS.

Check logs for:
```
ElevenLabs TTS initialization failed: [error]. Falling back to Sarvam TTS
TTS initialized: Sarvam (fallback)
```

### **Connection Issues**

If agent connects but disconnects immediately:
- Check LIVEKIT_URL is correct: `wss://faizlive-l9i6nt8n.livekit.cloud`
- Check LIVEKIT_API_KEY and LIVEKIT_API_SECRET match

### **Browser Issues**

- Ensure microphone permissions are granted
- Try Chrome/Edge (best WebRTC support)
- Check browser console (F12) for errors

## 📊 **EXPECTED BEHAVIOR AFTER FIX**

### **Before Fix:**
```
User clicks speaker → Connection established → Silence (no voice)
```

### **After Fix:**
```
User clicks speaker → Connection established → Agent speaks:
"Hi! I'm Anushka, Faiz's AI assistant. It's so great to hear from you!"
```

## 🔄 **ALTERNATIVE: Quick Test Without Redeploy**

If you want to test locally first before redeploying to cloud:

```bash
cd voice-agent-py

# Stop cloud agent temporarily
lk agent stop CA_xjhMp7G2evJr

# Run locally
python agent.py

# Test from browser
# Click speaker button - should connect to local agent

# When done, redeploy to cloud
lk agent deploy
```

## ✅ **CONFIRMATION**

Once fixed, you should see in logs:
```
[RoomName/AgentJob-xxxxx] Agent job starting...
[RoomName/AgentJob-xxxxx] Connected to room
[RoomName/AgentJob-xxxxx] Participant joined: user-xxxxx
[RoomName/AgentJob-xxxxx] Conversation initialized
[RoomName/AgentJob-xxxxx] Conversation started
[TTS] Synthesizing: "Hi! I'm Anushka, Faiz's AI assistant..."
```

And you should **HEAR the agent speaking**! 🎉

---

**Need help?** Check LiveKit Cloud documentation:
- https://docs.livekit.io/agents/deployment/
- https://docs.livekit.io/agents/plugins/elevenlabs/
