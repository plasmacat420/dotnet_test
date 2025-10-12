# Claude Context - LiveKit Voice Agent System

**Document Purpose:** Comprehensive codebase analysis for AI assistant (Claude) to understand the system architecture, design patterns, components, and known issues for future reference and maintenance.

**Last Updated:** 2025-10-12
**Project:** dotnet_test (LiveKit Voice Agent System)
**Author:** Faiz Shaikh
**Repository:** https://github.com/plasmacat420/dotnet_test
**Deployment:** Azure App Service (API) + LiveKit Cloud (Agent)

---

## 🎯 PROJECT OVERVIEW

### What This System Does
A production-ready, real-time voice conversation agent system that enables natural voice interactions between users and an AI assistant. The system uses LiveKit as the WebRTC infrastructure to orchestrate real-time audio streaming between:
- Users (via web browser)
- Backend API (.NET 9)
- AI Voice Agent (Python worker)

### Key Capabilities
1. **Real-time Voice Conversations** - Low-latency voice chat with AI
2. **Multi-language Support** - English and Hindi/Indian languages
3. **Flexible AI Pipeline** - Mix and match STT, LLM, and TTS providers
4. **Transcript Management** - Auto-email conversation transcripts
5. **Production-Ready** - Docker deployment, health checks, error handling
6. **Web-Based** - No app installation required

### Use Cases
- Customer support automation
- Lead qualification
- Appointment booking
- Voice-based information retrieval
- AI receptionist/assistant

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Flow (Cloud Deployment)
```
┌─────────────┐         ┌────────────────────┐
│   Browser   │◄───────►│   Azure App Service│
│  (User)     │  HTTPS  │   (.NET API)       │
└─────────────┘         └────────────────────┘
       │                         │
       │   1. Request Token      │
       │   2. Dispatch Agent     │
       │◄────────────────────────┤
       │                         │
       │   3. Connect to Room    │
       │         (WebRTC)        │
       │                         │
       ▼                         ▼
┌──────────────────────────────────────────────┐
│       LiveKit Cloud (WebRTC Infrastructure)  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Cloud Agent Worker (Python)         │   │
│  │  • Sarvam STT (Hindi/English)        │   │
│  │  • Groq LLM (llama-3.3-70b)          │   │
│  │  • Sarvam TTS (Anushka voice)        │   │
│  │  • Sends transcript to API           │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
             │
             ▼
   ┌─────────────────┐
   │  External APIs  │
   │  • Deepgram     │
   │  • Groq         │
   │  • Sarvam       │
   │  • Gmail SMTP   │
   └─────────────────┘
```

### Component Breakdown

#### 1. Frontend (Browser - wwwroot/)
- **Technology:** Vanilla JavaScript + LiveKit Client SDK
- **Files:**
  - `index.html` - Main contact/landing page
  - `assets/js/livekit-voice.js` - LiveKit WebRTC client
  - `assets/js/app.js` - UI interactions and token management
  - `assets/js/chat.js` - Chat interface (if exists)
  - `assets/js/config.js` - Frontend configuration

**Flow:**
1. User clicks voice button
2. Requests token from .NET API (`POST /api/livekit/token`)
3. Receives JWT token + room name + LiveKit URL
4. Connects to LiveKit room via WebRTC
5. Streams audio to/from agent
6. Displays transcriptions in real-time

#### 2. Backend API (.NET 9 - SimpleApi/)
- **Technology:** ASP.NET Core 9, C# 12
- **Purpose:**
  - Generate LiveKit access tokens (JWT)
  - Send transcript emails
  - Serve frontend
  - API gateway for voice agent

**Key Components:**

**Controllers:**
- `LiveKitController.cs` - Token generation and agent dispatch
  - `POST /api/livekit/token` - Generate room access token
  - Input sanitization (prevents XSS)
  - Creates unique room names per session
  - **Automatically dispatches cloud agent** to room (fire-and-forget)
  - `GET /api/livekit/health` - Health check endpoint

- `TranscriptController.cs` - Transcript email endpoint
  - `POST /api/transcript/send` - Send transcript via email
  - Receives transcript from Python agent
  - Formats and emails conversation history

- `ContactController.cs` - Contact form handling
- `HealthController.cs` - Health check endpoint

**Services:**
- `LiveKitTokenService.cs` - JWT token generation
  - Uses HMAC-SHA256 signing
  - `GenerateToken()` - Participant tokens (6-hour expiry, publish/subscribe/data permissions)
  - `GenerateAdminToken()` - Admin tokens for agent dispatch (1-hour expiry, room admin permissions)

- `AgentDispatchService.cs` - **NEW** - Cloud agent dispatch
  - Calls LiveKit `AgentDispatchService.CreateDispatch` API
  - Creates admin JWT token with room-specific permissions
  - Dispatches agent named "hindi-voice-agent" to specific rooms
  - Fire-and-forget pattern (doesn't block token response)

- `EmailService.cs` - SMTP email service
  - Uses MailKit for sending
  - Configured via Email__* environment variables

- `SummaryService.cs` - AI summary generation via Groq API

**Middleware:**
- `ErrorHandlingMiddleware.cs` - Global exception handling
- `RequestLoggingMiddleware.cs` - Request/response logging
- Security headers (CSP, X-Frame-Options, etc.)

**Configuration:**
- `LiveKitOptions.cs` - LiveKit credentials
- `EnvironmentConfig.cs` - .env file loader
- `ServiceExtensions.cs` - DI setup (CORS, Swagger, compression, rate limiting)

**Key Dependencies (SimpleApi.csproj):**
```xml
- Azure.AI.OpenAI (2.1.0) - Azure OpenAI integration
- Livekit.Server.Sdk.Dotnet (1.0.12) - LiveKit JWT
- MailKit (4.3.0) - Email sending
- DotNetEnv (3.1.1) - .env loading
- Swashbuckle.AspNetCore (9.0.6) - API docs
```

#### 3. Python Voice Agent (voice-agent-py/)
- **Technology:** Python 3.11+, LiveKit Agents SDK
- **Purpose:** Handle real-time voice conversation logic
- **Deployment:** LiveKit Cloud (serverless agent workers)
- **Dispatch:** Explicit dispatch via agent_name="hindi-voice-agent"

**Main Files:**

**agent.py (Entry Point)**
```python
Key Responsibilities:
1. Environment validation (checks all required API keys)
2. Worker configuration (playground mode vs named agent)
3. Prewarm function - pre-loads AI models for fast startup
4. Request function - accepts job requests from LiveKit
5. Entrypoint - main conversation orchestration

Flow:
- Worker connects to LiveKit
- Waits for room creation (user joins)
- Accepts job and joins same room
- Initializes STT/LLM/TTS pipeline
- Starts conversation with greeting
- Runs conversation loop until user disconnects
- Sends transcript email on cleanup
```

**Modular Components (modular/):**

1. **config.py** - Configuration management
   - Loads .env from multiple locations (priority: root .env > .secrets)
   - Agent settings (name, port, playground mode)
   - AI provider configs (API keys, models, voices)
   - Agent personality/instructions (Anushka AI assistant)

2. **conversation_manager.py** - High-level conversation orchestration
   ```python
   Responsibilities:
   - Connect to LiveKit room
   - Initialize session manager & transcript manager
   - Coordinate greeting and conversation flow
   - Handle transcript collection (user + agent messages)
   - Send transcript email on cleanup
   - Provide conversation statistics
   ```

3. **session_manager.py** - Agent session lifecycle
   ```python
   Manages:
   - Agent session creation (STT/LLM/TTS/VAD setup)
   - Transcript event handlers
   - Initial greeting generation
   - Session history tracking
   - Cleanup on disconnect
   ```

4. **transcript_manager.py** - Transcript formatting & email
   ```python
   Features:
   - Combines user + agent messages
   - Sorts by timestamp
   - Formats for readability
   - POSTs to .NET API /api/transcript/send
   - Handles API communication (aiohttp)
   ```

5. **utils.py** - Shared utilities (logger setup, etc.)

**AI Pipeline (Prewarmed Components):**

| Component | Provider | Model/Voice | Purpose |
|-----------|----------|-------------|---------|
| **STT** | Sarvam AI | en-IN | Speech-to-Text (English-India) |
| **LLM** | Groq | llama-3.3-70b-versatile | Natural language processing |
| **TTS** | Sarvam AI | Anushka (hi-IN) | Text-to-Speech (Indian voice) |
| **VAD** | Silero | Custom tuning | Voice Activity Detection |

**Note:** TTS switched from ElevenLabs to Sarvam for better reliability from LiveKit Cloud infrastructure.

**Prewarm Strategy:**
- First connection: Initialize all models (slow ~5-10s)
- Subsequent connections: Reuse cached models (fast ~1s)
- Reduces latency for repeat users

**Key Dependencies (requirements.txt):**
```
- livekit-agents[deepgram,google,openai,silero]>=1.2.14
- livekit-plugins-groq>=0.6.1
- livekit-plugins-sarvam>=0.2.0
- livekit-plugins-elevenlabs>=0.1.0
- python-dotenv>=1.1.1
```

---

## 🔄 REQUEST FLOW (End-to-End)

### Scenario: User Starts Voice Conversation

**Step 1: Initial Page Load**
```
Browser → GET / → .NET API → Serves index.html
```

**Step 2: User Clicks "Start Voice Chat"**
```javascript
// Frontend (app.js)
1. User clicks voice button
2. app.js → POST /api/livekit/token
   Body: { name: "John Doe", identity: "user-123" }

// Backend (LiveKitController.cs)
3. Sanitize input (prevent XSS)
4. Generate unique room name (voice-session-abc123...)
5. Create JWT token via LiveKitTokenService
   - Sign with HMAC-SHA256
   - Include room permissions
   - 6 hour expiry
6. Return: { token, roomName, identity, url }
```

**Step 3: Connect to LiveKit**
```javascript
// Frontend (livekit-voice.js)
1. Receive token from API
2. Create LiveKit room instance
3. Connect to LiveKit Cloud (wss://...)
4. Start audio track
5. Publish audio to room
```

**Step 4: Agent Joins Room**
```python
# Python Agent (agent.py)
1. Worker detects new room creation
2. request_fnc() accepts job
3. entrypoint() executes:
   - Get prewarmed STT/LLM/TTS/VAD
   - Create ConversationManager
   - Connect to same room
   - Wait for participant
   - Initialize conversation
   - Generate greeting
   - Start conversation loop
```

**Step 5: Voice Conversation Loop**
```
User speaks
  → Browser captures audio (WebRTC)
  → Sent to LiveKit room
  → Forwarded to Python agent
  → Sarvam STT transcribes audio
  → Groq LLM processes intent
  → ElevenLabs TTS synthesizes response
  → Audio sent back through LiveKit
  → Browser plays agent voice
  → Frontend displays transcript (LiveKit track transcription)
```

**Step 6: User Disconnects**
```python
# Python Agent (conversation_manager.py)
1. Detect disconnect event
2. cleanup() executes:
   - Collect all transcripts (user + agent)
   - Format transcript data
   - POST to .NET API /api/transcript/send
3. .NET EmailService sends transcript email
4. Agent disconnects from room
```

---

## 🔐 SECURITY & CONFIGURATION

### Environment Variables (.env)

**LiveKit:**
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxx
LIVEKIT_API_SECRET=xxxxx
```

**AI Services:**
```env
DEEPGRAM_API_KEY=xxx        # STT (English)
SARVAM_API_KEY=xxx          # STT/TTS (Hindi/Indian)
GROQ_API_KEY=xxx            # LLM (Free tier)
ELEVENLABS_API_KEY=xxx      # TTS (Premium voices)
OPENAI_API_KEY=xxx          # (Optional) OpenAI fallback
```

**Email (SMTP):**
```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SENDER_EMAIL=your@email.com
EMAIL_SENDER_PASSWORD=app_password
EMAIL_SENDER_NAME=Voice Agent
```

**Application:**
```env
ASPNETCORE_ENVIRONMENT=Production
AGENT_PORT=8081
LOG_LEVEL=INFO
PLAYGROUND_MODE=true        # Auto-dispatch to any room
```

### Security Features

**Backend (.NET):**
1. **Input Sanitization** - Regex filter on user inputs (LiveKitController:74)
2. **HTTPS Redirect** - Force secure connections
3. **CORS** - Controlled cross-origin access
4. **Rate Limiting** - Prevent abuse
5. **Security Headers:**
   - Content-Security-Policy (XSS prevention)
   - X-Frame-Options (clickjacking prevention)
   - X-Content-Type-Options (MIME sniffing prevention)
6. **JWT Token Signing** - HMAC-SHA256 for LiveKit tokens

**Python Agent:**
1. **Environment Validation** - Checks all required API keys (agent.py:184)
2. **Error Handling** - Try/catch with logging
3. **API Communication** - Timeout on HTTP requests (30s)

---

## 🐳 DOCKER DEPLOYMENT

### Architecture
```yaml
services:
  api:          # .NET API
    - Port: 5264 (host) → 8080 (container)
    - Health check: /health endpoint
    - Volume: wwwroot (hot reload in dev)

  agent:        # Python worker
    - Port: 8081 (metrics/health)
    - Depends on: api (waits for API to be healthy)
    - Health check: process check

networks:
  voiceagent-network (bridge)
```

### Commands
```bash
# Development
docker-compose up                    # Start with hot reload

# Production
docker-compose -f docker-compose.yml up -d

# Logs
docker-compose logs -f agent
docker-compose logs -f api

# Stop
docker-compose down
```

### Environment Handling
- `.env` file at root is loaded by both services
- .NET uses `EnvironmentConfig.cs` to load .env
- Python uses `dotenv` in `config.py`

---

## 🎨 DESIGN PATTERNS & BEST PRACTICES

### Backend (.NET)

**1. Dependency Injection**
- Services registered in `ServiceExtensions.cs`
- Scoped lifetime for request-bound services
- Singleton for shared services

**2. Options Pattern**
- `LiveKitOptions` bound to appsettings.json
- Injected via `IOptions<T>`

**3. Middleware Pipeline**
- Order matters: Error → Logging → Security → CORS → RateLimiting
- Custom middleware for cross-cutting concerns

**4. Controller Best Practices**
- DTOs (Data Transfer Objects) via record types
- Input validation before processing
- Async/await for I/O operations
- Proper error responses (400, 500)

### Python Agent

**1. Modular Architecture**
- Separation of concerns (config, conversation, session, transcript)
- Single responsibility per module

**2. Async/Await**
- All I/O is async (LiveKit, HTTP, etc.)
- Uses asyncio for concurrent operations

**3. Resource Management**
- Cleanup callbacks for graceful shutdown
- asyncio.shield() for cleanup during cancellation

**4. Logging Strategy**
- Consistent log prefix: `[room/job-id]`
- Info, warning, error levels
- Structured logging with context

**5. Component Prewarming**
- Load heavy AI models once
- Cache in memory for reuse
- Reduces cold start time

---

## 🚨 KNOWN ISSUES & LIMITATIONS

### Current Issues

**1. Playground Mode Required**
```python
# agent.py:219
if not config.PLAYGROUND_MODE:
    worker_options["agent_name"] = config.AGENT_NAME
```
- **Issue:** Named agents don't auto-dispatch properly with LiveKit Cloud
- **Workaround:** Use PLAYGROUND_MODE=true for automatic room joining
- **Impact:** Agent joins ANY room, not specific to agent name

**2. Email Configuration Not Secure**
```env
EMAIL_SENDER_PASSWORD=plain_text_password
```
- **Issue:** Password stored in .env (not encrypted)
- **Recommendation:** Use Azure Key Vault or similar secrets management
- **Impact:** Security risk if .env is exposed

**3. Token Expiry Fixed at 6 Hours**
```csharp
// LiveKitTokenService.cs:53
["exp"] = new DateTimeOffset(DateTime.UtcNow.AddHours(6)).ToUnixTimeSeconds()
```
- **Issue:** Not configurable
- **Recommendation:** Move to appsettings.json

**4. No User Authentication**
- Frontend has no login/signup
- Anyone can generate tokens
- **Recommendation:** Add OAuth or JWT auth before production

**5. Transcript Email Hardcoded**
```python
# conversation_manager.py:102
async def send_transcript_email(self, email: str = "faiz.corsair@gmail.com")
```
- **Issue:** Default email is hardcoded
- **Impact:** All transcripts go to same email unless overridden

**6. No Conversation Persistence**
- Transcripts only sent via email
- No database storage
- No conversation replay feature

### Performance Considerations

**1. Model Prewarming**
- First connection: 5-10 seconds (model loading)
- Subsequent: 1-2 seconds (cached)
- **Optimization:** Keep agent worker running (don't restart)

**2. LiveKit Cloud Limits**
- Free tier: Limited concurrent rooms
- Audio quality tied to bandwidth
- **Recommendation:** Monitor usage and upgrade if needed

**3. API Rate Limits**
- Groq: Free tier limits (14 requests/minute)
- Deepgram: Pay-per-use
- ElevenLabs: Character limits
- **Recommendation:** Implement retry logic and fallbacks

---

## 🔧 TROUBLESHOOTING GUIDE

### Common Errors

**1. "Missing environment variables"**
```
Fix:
- Ensure .env exists at project root
- Check all required keys are present
- Run: source .env (Linux) or restart shell
```

**2. "Agent not joining room"**
```
Fix:
- Set PLAYGROUND_MODE=true in .env
- Check agent.py:219 for agent_name logic
- Verify LiveKit credentials are correct
- Check agent logs: docker-compose logs -f agent
```

**3. "Token generation failed"**
```
Fix:
- Verify LiveKit URL/Key/Secret in appsettings.json
- Check .NET logs for JWT errors
- Ensure API is running: curl http://localhost:5264/health
```

**4. "No audio from agent"**
```
Fix:
- Check browser permissions (microphone)
- Verify ElevenLabs API key and credits
- Check agent logs for TTS errors
- Test with different TTS provider (openai, sarvam)
```

**5. "Transcript not sent"**
```
Fix:
- Check .NET API is reachable from agent container
- Verify SMTP settings in .env
- Test email service independently
- Check agent → API connectivity: ping api (inside agent container)
```

**6. "CORS errors in browser"**
```
Fix:
- Check CORS policy in Program.cs
- Ensure AllowAll policy is active
- Verify response headers include Access-Control-Allow-Origin
```

### Debug Commands

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f agent

# Check API health
curl http://localhost:5264/health

# Test token generation
curl -X POST http://localhost:5264/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser"}'

# Enter agent container
docker exec -it voiceagent-worker bash

# Check Python agent process
docker exec voiceagent-worker pgrep -f agent.py
```

---

## 🎯 AGENT PERSONALITY (Anushka)

**Current Configuration (config.py:39-101)**

**Identity:**
- Name: Anushka
- Role: AI voice assistant for Faiz Shaikh (Software Engineer)
- Voice: Warm, friendly, engaging
- Goal: Build connections + introduce AI voice agent capabilities

**Conversation Strategy:**
1. **Warm Introduction** - Greet naturally, show curiosity
2. **Build Connection** - Listen actively, find common ground
3. **Subtle Discovery** - Understand business/role, identify pain points
4. **Plant Seeds** - Share existence as proof, mention use cases
5. **The Invitation** - If interested, offer Faiz consultation

**Guidelines:**
- ✅ Short responses (1-3 sentences)
- ✅ Open-ended questions
- ✅ Use caller's name
- ✅ Show enthusiasm
- ❌ No robotic speech
- ❌ No hard selling
- ❌ No jargon (unless caller uses it)

**About Faiz (for agent to know):**
- 3+ years building AI agents (LangChain, LangGraph, GPT, LLaMA)
- Currently: Software Engineer (AI/ML) at Fintaar Technologies
- Master's in CS from California State University, Chico
- Builds: Voice agents, chatbots, WhatsApp automation, RAG systems

---

## 📊 METRICS & MONITORING

### Health Checks

**API (http://localhost:5264/health):**
```csharp
// HealthController.cs
{
  "status": "healthy",
  "timestamp": "2025-10-11T10:30:00Z"
}
```

**Agent (Docker health check):**
```bash
pgrep -f "python.*agent.py"
# Returns: PID if running, empty if stopped
```

### Logging

**API Logs:**
- Request/Response logging (RequestLoggingMiddleware)
- Error logging (ErrorHandlingMiddleware)
- Token generation logs (LiveKitTokenService)
- Level: Information (configurable in appsettings.json)

**Agent Logs:**
- Conversation flow (connection, greeting, cleanup)
- Transcript collection
- Email sending status
- Level: INFO (configurable via LOG_LEVEL env var)

**Log Format:**
```
[timestamp] - [LEVEL] - [module:line] - [room/job-id] message
```

### Observability Gaps
- ❌ No application performance monitoring (APM)
- ❌ No metrics collection (Prometheus/Grafana)
- ❌ No distributed tracing
- ❌ No conversation analytics
- **Recommendation:** Add OpenTelemetry + Grafana stack

---

## 🚀 DEPLOYMENT STRATEGIES

### Current: Docker Compose (Local/Single Server)
```bash
docker-compose up -d
# Access: http://localhost:5264
```

**Pros:** Simple, fast setup
**Cons:** Not scalable, single point of failure

### Recommended: Cloud Deployment

**Option 1: Railway.app (Easiest)**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
- Cost: ~$5-10/month
- Auto-scaling
- Built-in monitoring

**Option 2: Azure Container Apps**
```bash
az containerapp up \
  --name voiceagent-api \
  --resource-group voiceagent-rg \
  --environment voiceagent-env \
  --image ghcr.io/plasmacat420/dotnet_test/api:latest
```
- Cost: ~$10-30/month
- Azure ecosystem integration
- Built-in secrets management

**Option 3: AWS ECS/Fargate**
- Full control
- Cost: Variable (~$20-50/month)
- Requires more setup

### Scaling Considerations
1. **API:** Stateless, easy to scale horizontally
2. **Agent:** Scale based on concurrent conversations
3. **LiveKit:** Use LiveKit Cloud (auto-scales)
4. **Database:** Add PostgreSQL for conversation history

---

## 🔄 FUTURE IMPROVEMENTS

### Priority 1 (Critical)
- [ ] Add user authentication (OAuth/JWT)
- [ ] Implement secrets management (Azure Key Vault)
- [ ] Add conversation persistence (database)
- [ ] Implement retry logic for API failures
- [ ] Add monitoring/observability stack

### Priority 2 (Important)
- [ ] Conversation history UI
- [ ] Multi-language support (dynamic switching)
- [ ] Voice settings panel (select voice/speed)
- [ ] Push-to-talk mode
- [ ] Audio waveform visualization
- [ ] Conversation analytics dashboard

### Priority 3 (Nice to Have)
- [ ] Multi-agent support (different personalities)
- [ ] Screen sharing capability
- [ ] File upload/download during chat
- [ ] Integration with CRM systems
- [ ] A/B testing for agent personalities
- [ ] Voice cloning support

---

## 📚 REFERENCES & RESOURCES

### Documentation
- LiveKit Docs: https://docs.livekit.io
- LiveKit Agents: https://docs.livekit.io/agents/overview/
- .NET 9 Docs: https://learn.microsoft.com/en-us/dotnet/
- Groq API: https://console.groq.com/docs
- Deepgram: https://developers.deepgram.com
- Sarvam AI: https://www.sarvam.ai/docs
- ElevenLabs: https://elevenlabs.io/docs

### Project Files
- Main README: `/README.md`
- Docker Guide: `/DOCKER.md`
- LiveKit Setup: `/LIVEKIT_SETUP.md`
- Implementation Summary: `/IMPLEMENTATION_SUMMARY.md`
- Sprint Summary: `/SPRINT_SUMMARY.md`

### Support
- LiveKit Discord: https://livekit.io/discord
- GitHub Issues: https://github.com/plasmacat420/dotnet_test/issues
- Email: faiz.corsair@gmail.com

---

## 🎓 KEY LEARNINGS & MISTAKES TO AVOID

### Lessons Learned

**1. Playground Mode is Essential**
- Initial attempt with named agents failed
- LiveKit Cloud requires playground mode for auto-dispatch
- Always test with PLAYGROUND_MODE=true first

**2. Docker Networking**
- Services communicate via service names (api:8080, not localhost)
- transcript_manager.py correctly uses "http://api:8080"

**3. Model Prewarming Saves Time**
- Caching STT/LLM/TTS reduces cold start from 10s to 1s
- Critical for production user experience

**4. LiveKit Track Transcription**
- Built-in transcription is more reliable than manual events
- session_manager.py:39 enables this feature

**5. Environment Variable Priority**
- Root .env overrides everything
- config.py loads from multiple locations (good fallback)

### Common Mistakes to Avoid

**❌ Don't:**
1. Hardcode API keys in source code
2. Skip input sanitization (XSS risk)
3. Use default secrets in production
4. Ignore health checks and monitoring
5. Run agent without prewarm (slow first response)
6. Use HTTP in production (always HTTPS)

**✅ Do:**
1. Use environment variables for all configs
2. Implement proper error handling and logging
3. Test with real API rate limits
4. Monitor token expiry and refresh
5. Keep dependencies updated
6. Document all configuration options

---

## 🔍 CODE REVIEW CHECKLIST

When modifying this codebase, check:

### Backend (.NET)
- [ ] All endpoints have proper error handling
- [ ] Input validation on all user data
- [ ] Async/await used for I/O operations
- [ ] Logging at appropriate levels
- [ ] Health checks still functional
- [ ] CORS policy allows required origins
- [ ] JWT tokens have proper expiry
- [ ] Email service handles failures gracefully

### Python Agent
- [ ] All async functions use await
- [ ] Cleanup handlers registered
- [ ] Logging includes room/job context
- [ ] API communication has timeouts
- [ ] Environment variables validated
- [ ] Transcript formatting handles edge cases
- [ ] Prewarm function caches models
- [ ] Error handling doesn't crash worker

### Frontend
- [ ] Token refresh before expiry
- [ ] Audio permissions requested
- [ ] Error states handled (no token, no audio, etc.)
- [ ] UI updates on connection state changes
- [ ] Transcripts displayed in real-time
- [ ] Graceful disconnect handling

### Docker
- [ ] Services start in correct order
- [ ] Health checks configured
- [ ] Environment variables passed correctly
- [ ] Volumes mounted for hot reload
- [ ] Networks configured for inter-service communication

---

## 📝 QUICK REFERENCE

### Key Files

| File | Purpose | Critical Info |
|------|---------|---------------|
| `agent.py` | Agent entry point | Prewarm, request_fnc, entrypoint |
| `conversation_manager.py` | Orchestration | Coordinates all managers |
| `session_manager.py` | Agent session | STT/LLM/TTS setup |
| `transcript_manager.py` | Email transcripts | API communication |
| `config.py` | Configuration | Agent personality, API keys |
| `Program.cs` | .NET startup | Middleware pipeline |
| `LiveKitController.cs` | Token generation | JWT creation |
| `LiveKitTokenService.cs` | Token logic | HMAC-SHA256 signing |
| `docker-compose.yml` | Deployment | Service orchestration |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Serve frontend |
| POST | `/api/livekit/token` | Generate room token |
| POST | `/api/transcript/send` | Email transcript |
| GET | `/health` | Health check |
| GET | `/swagger` | API docs (dev only) |

### Environment Variables (Critical)

| Variable | Required | Purpose |
|----------|----------|---------|
| LIVEKIT_URL | ✅ | WebSocket URL |
| LIVEKIT_API_KEY | ✅ | JWT signing key |
| LIVEKIT_API_SECRET | ✅ | JWT secret |
| GROQ_API_KEY | ✅ | LLM provider |
| ELEVENLABS_API_KEY | ✅ | TTS provider |
| SARVAM_API_KEY | ✅ | STT provider |
| EMAIL_SENDER_EMAIL | ✅ | Transcript sender |
| EMAIL_SENDER_PASSWORD | ✅ | SMTP password |
| PLAYGROUND_MODE | ✅ | Agent dispatch mode |

---

## 🏁 CONCLUSION

This is a **production-ready voice agent system** with solid architecture and good separation of concerns. The main strengths are:

1. **Modular Design** - Easy to swap AI providers
2. **Real-time Performance** - Low-latency voice conversations
3. **Docker Deployment** - Simple to deploy anywhere
4. **Comprehensive Logging** - Good observability

The main areas for improvement are:
1. **Security** - Add authentication and secrets management
2. **Scalability** - Implement database and horizontal scaling
3. **Monitoring** - Add APM and metrics collection
4. **Testing** - Add unit and integration tests

**Overall Grade: B+** (Production-capable with room for enterprise features)

---

**Document End**
**For Claude:** Use this document as the canonical reference for understanding this codebase. When asked about the system, always refer to this analysis for accurate, context-aware responses.
