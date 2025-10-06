# Deployment Guide - LiveKit Voice Agent on Render

This guide shows how to deploy the LiveKit voice agent as a **background worker** on Render.

## Why Background Worker?

LiveKit agents need:
- Persistent WebSocket connections to LiveKit server
- Real-time audio processing
- Long-running processes

Render's **Background Worker** service is perfect for this, unlike Web Services which are designed for HTTP request/response.

## Prerequisites

1. A [Render](https://render.com) account (free tier works)
2. A [LiveKit Cloud](https://livekit.io) account or self-hosted LiveKit server
3. API keys for:
   - Deepgram (speech-to-text)
   - Groq (LLM)
   - Sarvam (Hindi STT/TTS)
   - ElevenLabs (TTS)

## Deployment Steps

### 1. Prepare Your Repository

Ensure these files are in your repo:
- `requirements.txt` - Python dependencies
- `render.yaml` - Render service configuration (already created)
- `.env.example` - Environment variable template

### 2. Push to GitHub

```bash
git add .
git commit -m "Add Render background worker configuration"
git push origin master
```

### 3. Deploy on Render

#### Option A: Using render.yaml (Blueprint)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically
5. Fill in the environment variables (see below)
6. Click **"Apply"**

#### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Background Worker"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `livekit-voice-agent`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python agent.py`
5. Add environment variables (see below)
6. Click **"Create Background Worker"**

### 4. Configure Environment Variables

In Render dashboard, add these environment variables:

#### Required (Must be set manually):
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
DEEPGRAM_API_KEY=your_deepgram_key
GROQ_API_KEY=your_groq_key
SARVAM_API_KEY=your_sarvam_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

#### Optional (Already set in render.yaml):
```
TTS_PROVIDER=elevenlabs
TTS_VOICE=Rachel
TTS_MODEL=eleven_multilingual_v2
AGENT_NAME=Hindi-English-Voice-Agent
PLAYGROUND_MODE=false
LOG_LEVEL=INFO
AGENT_PORT=8081
```

### 5. Verify Deployment

1. Check the **Logs** tab in Render dashboard
2. Look for: `Starting agent worker... Playground mode: False`
3. The agent should connect to LiveKit and wait for room assignments

### 6. Test Your Agent

1. Go to your LiveKit dashboard
2. Create a test room
3. The agent should automatically join when a participant connects
4. Test voice interaction

## Monitoring

- **Logs**: View real-time logs in Render dashboard
- **Restarts**: Background workers auto-restart on crashes
- **Health**: Monitor agent connection status in LiveKit dashboard

## Troubleshooting

### Agent not connecting to LiveKit
- Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Check if URL starts with `wss://` (not `https://`)

### Missing dependencies
- Ensure `requirements.txt` includes all needed packages
- Check build logs for pip install errors

### Out of memory
- Free tier has 512MB RAM limit
- Consider upgrading to Starter plan ($7/month) for 1GB RAM

### Agent not responding to voice
- Verify API keys for Deepgram, Groq, Sarvam, ElevenLabs
- Check logs for authentication errors

## Free Tier Limitations

Render free tier background workers:
- ✅ Always running (no sleep)
- ✅ 512MB RAM
- ✅ Shared CPU
- ❌ No auto-scaling
- ❌ Limited to 1 instance

For production, consider:
- **Starter Plan** ($7/month): 1GB RAM, better performance
- **Standard Plan** ($25/month): 4GB RAM, dedicated resources

## Cost Optimization

Free tier usage:
- Render: Free (background worker)
- LiveKit: Free tier (up to 100 participants/month)
- Groq: Free tier (decent limits)
- Deepgram: Pay-as-you-go
- Sarvam: Check pricing
- ElevenLabs: Free tier (10k characters/month)

## Next Steps

1. Monitor usage and costs
2. Set up alerting for errors
3. Consider deploying to multiple regions for better latency
4. Implement agent analytics and logging

## Support

- Render docs: https://render.com/docs/background-workers
- LiveKit docs: https://docs.livekit.io/agents/
- Issues: Create an issue in this repository
