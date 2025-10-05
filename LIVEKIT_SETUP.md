# LiveKit Voice Agent Setup Guide

Complete guide for setting up your LiveKit-based voice AI agent with configurable STT/LLM/TTS pipeline.

## Architecture

```
Browser (Frontend)
  ↓ WebRTC
LiveKit Cloud
  ↓
Node.js Agent Worker (voice-agent/)
  ├── STT: Deepgram Nova-3
  ├── LLM: Azure OpenAI GPT-4o-mini
  └── TTS: ElevenLabs
```

## Step 1: LiveKit Cloud Setup

1. **Create Account**
   - Go to https://livekit.io/cloud
   - Sign up for free account

2. **Create Project**
   - Click "Create Project"
   - Note your:
     - WebSocket URL (e.g., `wss://your-project.livekit.cloud`)
     - API Key
     - API Secret

3. **Update Configuration**

   **Backend** (`SimpleApi/appsettings.json`):
   ```json
   {
     "LiveKit": {
       "Url": "wss://your-project.livekit.cloud",
       "ApiKey": "your-api-key",
       "ApiSecret": "your-api-secret"
     }
   }
   ```

   **Agent** (`voice-agent/.env.local`):
   ```env
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   ```

   **Frontend** (`SimpleApi/wwwroot/livekit-voice.js:61`):
   ```javascript
   const livekitUrl = 'wss://your-project.livekit.cloud';
   ```

## Step 2: Get API Keys

##***REMOVED*** (STT)
1. Go to https://deepgram.com
2. Sign up → Get API key
3. Add to `voice-agent/.env.local`:
   ```env
   DEEPGRAM_API_KEY=your-deepgram-key
   ```

##***REMOVED*** (LLM)
1. Use your existing Azure OpenAI deployment
2. Add to `voice-agent/.env.local`:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/gpt-4o-mini
   AZURE_OPENAI_KEY=your-azure-key
   ```

### ElevenLabs (TTS)
1. Go to https://elevenlabs.io
2. Sign up → Get API key
3. Add to `voice-agent/.env.local`:
   ```env
   ELEVENLABS_API_KEY=your-elevenlabs-key
   VOICE_NAME=Rachel
   ```

## Step 3: Install Dependencies

### Backend (.NET)
```bash
cd SimpleApi
dotnet restore
```

### Agent (Node.js)
```bash
cd voice-agent

# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm add @livekit/agents@1.x \
  @livekit/agents-plugin-deepgram@1.x \
  @livekit/agents-plugin-elevenlabs@1.x \
  @livekit/agents-plugin-openai@1.x \
  @livekit/agents-plugin-silero@1.x \
  dotenv

# Dev dependencies
pnpm add -D typescript tsx
```

## Step 4: Run Everything

### Terminal 1: .NET Backend
```bash
cd SimpleApi
dotnet run
```
Access at: http://localhost:5264

### Terminal 2: Node.js Agent Worker
```bash
cd voice-agent

# Copy example env file
cp .env.local.example .env.local

# Edit .env.local with your keys
# Then start the agent
pnpm start
```

### Terminal 3: Test
1. Open http://localhost:5264
2. Click the speaker button (bottom right)
3. Allow microphone access
4. Button turns green when connected
5. Start speaking!

## Configuration Options

### Change STT Provider

**Use OpenAI Whisper:**
```typescript
// voice-agent/agent.ts
stt: new openai.STT({ model: 'whisper-1' })
```

**Use Google Speech:**
```typescript
stt: new google.STT({ language: 'en-US' })
```

### Change LLM Provider

**Use Standard OpenAI:**
```typescript
llm: new openai.LLM({ model: 'gpt-4o-mini' })
```

**Use Google Gemini:**
```typescript
llm: new google.LLM({ model: 'gemini-pro' })
```

### Change TTS Provider

**Use Cartesia:**
```typescript
tts: new cartesia.TTS({ voice: 'sonic-2' })
```

**Use OpenAI TTS:**
```typescript
tts: new openai.TTS({ voice: 'alloy' })
```

## Deployment

### Deploy Agent to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   cd voice-agent
   railway login
   railway init
   railway up
   ```

3. Set environment variables in Railway dashboard

### Deploy Backend to Azure

```bash
cd SimpleApi
dotnet publish -c Release
# Deploy to Azure App Service
```

## Troubleshooting

### "Failed to get token"
- Check LiveKit credentials in `appsettings.json`
- Verify backend is running
- Check browser console for errors

### "Agent not joining room"
- Verify agent worker is running
- Check agent logs for errors
- Ensure LIVEKIT_URL matches in all configs

### "No audio from agent"
- Check ElevenLabs API key
- Verify browser audio permissions
- Open browser dev tools → Network tab

### "Microphone not working"
- Grant browser microphone permission
- Check browser console for errors
- Try different browser (Chrome/Edge recommended)

## Cost Estimates

**Free Tier Limits:**
- LiveKit: 10,000 minutes/month free
- Deepgram: 45,000 minutes free trial
- ElevenLabs: 10,000 characters/month free
- Azure OpenAI: Pay as you go

**Estimated costs (100 hours/month):**
- LiveKit: Free (within limit)
- Deepgram: ~$12/month
- Azure OpenAI: ~$15/month
- ElevenLabs: ~$25/month
- **Total: ~$52/month**

## Next Steps

- Add conversation history display
- Implement push-to-talk mode
- Add voice activity visualization
- Create admin dashboard
- Add multiple voice options
- Implement user authentication

## Resources

- [LiveKit Docs](https://docs.livekit.io)
- [LiveKit Agents](https://github.com/livekit/agents-js)
- [Deepgram](https://developers.deepgram.com)
- [ElevenLabs](https://elevenlabs.io/docs)
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
