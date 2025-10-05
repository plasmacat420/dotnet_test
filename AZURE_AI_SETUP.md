# Azure AI Realtime Voice Setup Guide

## Overview
Your speaker button is now connected to Azure OpenAI Realtime API through a custom WebSocket proxy implementation in .NET.

## Architecture

```
Frontend (Browser)
    ↓ WebSocket
Backend (.NET WebSocket Proxy)
    ↓ WebSocket with api-key auth
Azure OpenAI Realtime API
```

## Setup Steps

### 1. Create Azure OpenAI Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Azure OpenAI** resource
3. Choose region: **East US 2** or **Sweden Central** (only regions supporting realtime models)
4. Wait for deployment to complete

### 2. Deploy Realtime Model

1. In your Azure OpenAI resource, go to **Model deployments**
2. Click **Create new deployment**
3. Select model: `gpt-4o-realtime-preview` or `gpt-4o-mini-realtime-preview`
4. Give it a deployment name (e.g., `gpt-4o-realtime-preview`)
5. Deploy

### 3. Get API Credentials

1. In your Azure OpenAI resource, go to **Keys and Endpoint**
2. Copy:
   - **Endpoint** (e.g., `https://your-resource.openai.azure.com`)
   - **Key 1** or **Key 2**

### 4. Configure Application

Edit `SimpleApi/appsettings.json`:

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://your-resource-name.openai.azure.com",
    "ApiKey": "your-api-key-here",
    "DeploymentName": "gpt-4o-realtime-preview",
    "ApiVersion": "2025-04-01-preview"
  }
}
```

**⚠️ IMPORTANT:** Never commit `appsettings.json` with real credentials to Git!

For production, use:
- Azure Key Vault
- Environment variables
- User secrets (`dotnet user-secrets set "AzureOpenAI:ApiKey" "your-key"`)

### 5. Run the Application

```bash
cd SimpleApi
dotnet run
```

### 6. Test the Voice AI

1. Open `http://localhost:5264` in your browser
2. Click the **speaker button** (bottom right)
3. Allow microphone access when prompted
4. The button will turn green when connected
5. Start speaking - the AI will respond with voice!

## How It Works

### Backend Components

1. **AzureOpenAIOptions.cs** - Configuration model
2. **AzureRealtimeWebSocketProxy.cs** - Core proxy service
   - Connects to Azure OpenAI WebSocket
   - Forwards messages bidirectionally
   - Handles authentication
3. **RealtimeController.cs** - WebSocket endpoint (`/api/realtime/ws`)

### Frontend Components

1. **realtime-voice.js** - WebSocket client
   - Manages connection
   - Records audio from microphone
   - Converts audio to PCM16 format
   - Sends to server, receives responses
   - Plays AI voice responses
2. **app.js** - Integration with speaker button

### Message Flow

```
User speaks
  → Microphone captures audio
  → Convert to PCM16
  → Send to backend via WebSocket
  → Backend forwards to Azure
  → Azure processes with GPT-4o
  → Azure sends voice response
  → Backend forwards to frontend
  → Frontend plays audio
```

## Testing Locally

The build warnings are normal when the app is running. To test changes:

1. Stop the running app (Ctrl+C)
2. Make your changes
3. Run `dotnet build` to verify
4. Run `dotnet run` to start

## Cost Considerations

Azure OpenAI Realtime API pricing (as of 2025):
- Input audio: ~$0.06 per 1M tokens
- Output audio: ~$0.24 per 1M tokens
- Text tokens: Standard GPT-4o rates

**Tip:** Set spending limits in Azure Portal to avoid surprises!

## Troubleshooting

### "Could not connect to AI voice"
- Check Azure OpenAI endpoint and API key in `appsettings.json`
- Verify deployment name matches
- Check Azure OpenAI resource is in East US 2 or Sweden Central

### Microphone not working
- Grant browser microphone permissions
- Check browser console for errors
- Try Chrome/Edge (best WebRTC support)

### WebSocket connection fails
- Check firewall/antivirus settings
- Ensure port 5264 is not blocked
- Try `http://` instead of `https://` locally

### No audio playback
- Check browser audio permissions
- Verify speaker/headphones are connected
- Open browser console - look for audio errors

## Next Steps

- Add conversation history display
- Implement push-to-talk mode
- Add voice activity detection visualization
- Store conversation transcripts
- Add multiple voice options
- Implement interruption handling

## Security Notes

- API keys should NEVER be in frontend code
- Always use HTTPS in production
- Consider adding authentication to WebSocket endpoint
- Implement rate limiting per user
- Add request validation

## Resources

- [Azure OpenAI Realtime API Docs](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-websockets)
- [WebSocket Protocol Spec](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/realtime-audio)
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
