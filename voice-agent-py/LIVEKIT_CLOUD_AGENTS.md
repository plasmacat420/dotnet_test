# LiveKit Cloud Agents - Complete Guide

## Table of Contents
1. [What Are LiveKit Cloud Agents?](#what-are-livekit-cloud-agents)
2. [Purpose and Use Cases](#purpose-and-use-cases)
3. [Architecture Overview](#architecture-overview)
4. [Setup and Deployment](#setup-and-deployment)
5. [TTS Provider Configuration](#tts-provider-configuration)
6. [Common Patterns and Best Practices](#common-patterns-and-best-practices)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Code Examples](#code-examples)

---

## What Are LiveKit Cloud Agents?

LiveKit Cloud Agents are **serverless voice AI agents** that run on LiveKit's infrastructure. They provide:

- **Real-time voice conversations** with STT (Speech-to-Text), LLM (Language Model), and TTS (Text-to-Speech)
- **Automatic scaling** - agents spin up on-demand when users join rooms
- **Zero infrastructure management** - no servers to maintain
- **Global deployment** - agents run in multiple regions for low latency
- **Built-in session management** - handles connection lifecycle automatically

### Key Components

```
User (Browser/Mobile)
    ↓
LiveKit Room (WebRTC)
    ↓
Cloud Agent (Python)
    ├── STT: Sarvam/Deepgram (speech → text)
    ├── LLM: Groq/OpenAI (text → response)
    ├── TTS: Sarvam/ElevenLabs (response → speech)
    └── VAD: Silero (voice activity detection)
```

---

## Purpose and Use Cases

### This Project's Use Case
**Hindi/English Voice Agent for Business Calls**
- Handles customer inquiries in mixed Hindi/English (Hinglish)
- Collects contact information (name, email, phone, company)
- Qualifies leads based on conversation
- Generates structured summaries for backend processing

### Other Common Use Cases
- Customer support automation
- Voice-based appointment booking
- Language learning tutors
- Voice-enabled virtual assistants
- Interview screening agents
- Accessibility tools for voice navigation

---

## Architecture Overview

### Agent Lifecycle

1. **Deployment** - Agent code deployed to LiveKit Cloud
2. **Prewarm** - Models pre-loaded for fast response
3. **Request** - User joins room, agent request triggered
4. **Entrypoint** - Agent joins room and initializes
5. **Conversation** - Real-time voice interaction
6. **Cleanup** - User leaves, agent shuts down gracefully

### Code Structure (This Project)

```
voice-agent-py/
├── agent.py                    # Main entry point
├── modular/
│   ├── config.py              # Environment configuration
│   ├── conversation_manager.py # High-level conversation logic
│   ├── session_manager.py     # AgentSession management
│   ├── transcript_manager.py  # Backend logging & summaries
│   ├── fallback_tts.py        # TTS failover support
│   └── utils.py               # Logging helpers
├── .env.local                 # Local environment variables
└── requirements.txt           # Python dependencies
```

---

## Setup and Deployment

### Prerequisites

1. **LiveKit Cloud Account**
   - Sign up at https://cloud.livekit.io
   - Get API credentials (URL, API Key, API Secret)

2. **Agent CLI Installation**
   ```bash
   pip install livekit-agents-cli
   ```

3. **API Keys Required**
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `SARVAM_API_KEY` (STT/TTS)
   - `GROQ_API_KEY` (LLM)
   - `ELEVENLABS_API_KEY` (optional TTS)
   - `DEEPGRAM_API_KEY` (optional STT)

### Environment Configuration

Create `.env.local`:

```bash
# LiveKit Cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxx

# AI Services
SARVAM_API_KEY=sk_xxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxx
ELEVENLABS_API_KEY=sk_xxxxxxxxx

# Agent Settings
PLAYGROUND_MODE=True          # Auto-dispatch (no agent_name)
TTS_PROVIDER=sarvam          # Primary TTS provider
TTS_VOICE=anushka            # Voice ID
TTS_MODEL=bulbul:v1          # Model version
LOG_LEVEL=INFO
```

### Local Development

```bash
cd voice-agent-py
python agent.py dev
```

This starts a local agent worker that connects to LiveKit Cloud.

### Cloud Deployment

```bash
cd voice-agent-py
lk agent deploy
```

The CLI will:
1. Build your agent code
2. Upload to LiveKit Cloud
3. Deploy across regions
4. Return deployment ID and version

**Check Status:**
```bash
lk agent list
```

**View Logs:**
```bash
lk agent logs
lk agent logs --follow  # Real-time
```

**Redeploy After Changes:**
```bash
lk agent deploy  # Automatically creates new version
```

---

## TTS Provider Configuration

### Supported Providers

| Provider | Language Support | Latency | Cost | Quality |
|----------|-----------------|---------|------|---------|
| **Sarvam** | Hindi, Indian English | Low | Low | Good for Hinglish |
| **ElevenLabs** | 29 languages | Very Low | Medium | Excellent |
| **OpenAI** | 57 languages | Medium | Low | Good |
| **Google** | 220+ languages | Medium | Low | Good |

### Primary Provider (Sarvam)

Best for Hindi/English mixing:

```python
# In agent.py prewarm_fnc
proc.userdata["tts"] = sarvam.TTS(
    target_language_code="hi-IN",
    speaker="anushka",       # Female voice
    model="bulbul:v1",
    pitch=0.0,
    pace=1.0,
    loudness=1.0
)
```

**Environment Variables:**
```bash
TTS_PROVIDER=sarvam
TTS_VOICE=anushka
TTS_MODEL=bulbul:v1
```

### Fallback Provider (ElevenLabs + Sarvam)

For production reliability:

```python
# In agent.py prewarm_fnc
primary_tts = elevenlabs.TTS(
    voice_id=config.TTS_VOICE,
    model=config.TTS_MODEL
)

fallback_tts = sarvam.TTS(
    target_language_code="hi-IN",
    speaker="anushka"
)

proc.userdata["tts"] = FallbackTTS(
    primary_tts=primary_tts,
    fallback_tts=fallback_tts,
    primary_name="ElevenLabs",
    fallback_name="Sarvam"
)
```

**Environment Variables:**
```bash
TTS_PROVIDER=elevenlabs
TTS_FALLBACK_ENABLED=true
TTS_FALLBACK_PROVIDER=sarvam
TTS_VOICE=cgSgspJ2msm6clMCkdW9  # ElevenLabs voice ID
TTS_FALLBACK_VOICE=anushka       # Sarvam voice
```

### When to Use Each

- **Sarvam (Current)**: Best for Hindi/English, reliable, low cost
- **ElevenLabs**: When you need premium voice quality, faster latency
- **Fallback**: Production systems requiring 99.9% uptime

---

## Common Patterns and Best Practices

### 1. Agent Greeting (CRITICAL)

**Always await `generate_reply()`:**

```python
# ✅ CORRECT
async def generate_initial_reply(self):
    if self.agent_session:
        await self.agent_session.generate_reply(
            instructions="Greet the user warmly."
        )
```

```python
# ❌ WRONG - Agent won't speak!
async def generate_initial_reply(self):
    if self.agent_session:
        # Missing await - coroutine starts but never completes
        self.agent_session.generate_reply(
            instructions="Greet the user warmly."
        )
```

**Why this matters:** Without `await`, the greeting generation starts but never finishes, causing the agent to connect silently without speaking.

### 2. Session Management (Modern Pattern)

Use **AgentSession** (not deprecated VoicePipelineAgent):

```python
from livekit.agents import AgentSession, Agent

# Create session with prewarmed components
agent_session = AgentSession(
    stt=ctx.proc.userdata["stt"],
    llm=ctx.proc.userdata["llm"],
    tts=ctx.proc.userdata["tts"],
    vad=ctx.proc.userdata["vad"]
)

# Create agent with instructions
agent = Agent(instructions="You are a helpful assistant...")

# Start session with track transcription
await agent_session.start(
    room=ctx.room,
    agent=agent,
    room_output_options=RoomOutputOptions(
        transcription_enabled=True  # Enable automatic transcripts
    )
)
```

### 3. Prewarm Strategy

Pre-load models to reduce first-response latency:

```python
def prewarm_fnc(proc: agents.JobProcess):
    # Cache models on first run
    if not hasattr(prewarm_fnc, '_cached_models'):
        proc.userdata["stt"] = sarvam.STT(language="en-IN")
        proc.userdata["llm"] = groq.LLM(model="llama-3.3-70b-versatile")
        proc.userdata["tts"] = sarvam.TTS(...)
        proc.userdata["vad"] = silero.VAD.load(...)

        # Cache for reuse
        prewarm_fnc._cached_models = proc.userdata
    else:
        # Reuse cached models (faster subsequent connections)
        proc.userdata.update(prewarm_fnc._cached_models)
```

### 4. Request Handling

**Playground Mode** (auto-dispatch):

```python
async def request_fnc(req: agents.JobRequest):
    # Accept all requests unconditionally
    await req.accept()

# In WorkerOptions
worker_options = {
    "entrypoint_fnc": entrypoint,
    "request_fnc": request_fnc,
    # No agent_name - enables automatic dispatch
}
```

**Production Mode** (explicit dispatch):

```python
async def request_fnc(req: agents.JobRequest):
    await req.accept(
        name="hindi-voice-agent",
        identity="agent-01",
        attributes={"language": "hi-en"}
    )

# In WorkerOptions
worker_options = {
    "agent_name": "hindi-voice-agent"  # Explicit dispatch
}
```

### 5. Transcript Collection

```python
@agent_session.on("user_input_transcribed")
def on_transcript(transcript):
    if transcript.is_final:
        # Save to database, log, etc.
        logger.info(f"User said: {transcript.text}")
```

### 6. Graceful Shutdown

```python
async def _shutdown_cb():
    try:
        # Use asyncio.shield to prevent cancellation
        await asyncio.shield(conversation_manager.cleanup())
    except Exception as e:
        logger.warning(f"Cleanup error: {e}")

ctx.add_shutdown_callback(_shutdown_cb)
```

### 7. Error Handling

```python
try:
    await conversation_manager.initialize()
    await conversation_manager.start_conversation()
    await conversation_manager.run_conversation_loop()
except Exception as e:
    logger.error(f"Fatal error: {e}", exc_info=True)
    raise
finally:
    # Always cleanup, even if error occurs
    await asyncio.shield(conversation_manager.cleanup())
```

---

## Troubleshooting Guide

### Agent Connects But Doesn't Speak

**Symptoms:**
- Frontend shows "Agent already in room"
- No audio from agent
- Agent connected successfully

**Root Cause:** Missing `await` on `generate_reply()`

**Fix:**
```python
# session_manager.py
async def generate_initial_reply(self):
    if self.agent_session:
        # MUST await this call!
        await self.agent_session.generate_reply(
            instructions="Greet the user warmly."
        )
```

**Verification:**
```bash
lk agent logs | grep -i "greeting"
# Should see: "Greeting generation completed"
```

---

### TTS Timeouts (ElevenLabs)

**Symptoms:**
```
APITimeoutError: 11labs tts timed out after 10.0 seconds
```

**Solutions:**

1. **Switch to Sarvam (Recommended):**
   ```bash
   TTS_PROVIDER=sarvam
   ```

2. **Enable Fallback:**
   ```bash
   TTS_PROVIDER=elevenlabs
   TTS_FALLBACK_ENABLED=true
   TTS_FALLBACK_PROVIDER=sarvam
   ```

3. **Increase Timeout (Advanced):**
   ```python
   elevenlabs.TTS(
       voice_id=voice,
       timeout=15.0  # Increase from default 10s
   )
   ```

---

### Environment Variable Mismatch

**Symptoms:**
```
Missing required environment variables: ['ELEVENLABS_API_KEY']
```

**Cause:** Code expects `ELEVENLABS_API_KEY` but `.env` has `ELEVEN_API_KEY`

**Fix:** Use consistent naming in `.env`:
```bash
ELEVENLABS_API_KEY=sk_xxxxxxxxx  # Not ELEVEN_API_KEY
```

---

### Agent Not Dispatching

**Symptoms:**
- Room created but agent never joins
- No agent logs generated

**Solutions:**

1. **Check Playground Mode:**
   ```bash
   # .env.local
   PLAYGROUND_MODE=True  # Auto-dispatch
   ```

2. **Verify Agent Deployment:**
   ```bash
   lk agent list
   # Should show active deployment
   ```

3. **Check Room Token:**
   ```csharp
   // .NET backend - ensure canPublish=true
   var grants = new VideoGrants {
       RoomJoin = true,
       Room = roomName,
       CanPublish = true  // Required for agent dispatch
   };
   ```

---

### Prewarming Failures

**Symptoms:**
```
ERROR: Failed to load model
```

**Solutions:**

1. **Check API Keys:**
   ```bash
   echo $SARVAM_API_KEY  # Verify not empty
   echo $GROQ_API_KEY
   ```

2. **Test APIs Individually:**
   ```python
   from livekit.plugins import sarvam
   tts = sarvam.TTS(target_language_code="hi-IN", speaker="anushka")
   ```

3. **Add Emergency Fallback:**
   ```python
   try:
       proc.userdata["tts"] = sarvam.TTS(...)
   except Exception as e:
       logger.error(f"TTS init failed: {e}")
       # Use minimal fallback
       proc.userdata["tts"] = openai.TTS(voice="alloy")
   ```

---

### Check Deployment Logs

```bash
# View last 50 log lines
lk agent logs | tail -50

# Follow logs in real-time
lk agent logs --follow

# Filter for errors
lk agent logs | grep -i error

# Filter for specific events
lk agent logs | grep -E "job|connect|TTS|speak|greet"
```

---

## Code Examples

### Minimal Agent (5 Minutes)

```python
# agent.py
import asyncio
from livekit import agents
from livekit.agents import JobContext, AgentSession, Agent
from livekit.plugins import sarvam, groq, silero

async def entrypoint(ctx: JobContext):
    # Connect to room
    await ctx.connect()

    # Wait for participant
    participant = await ctx.wait_for_participant()

    # Create session with components
    session = AgentSession(
        stt=sarvam.STT(language="en-IN"),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=sarvam.TTS(target_language_code="hi-IN", speaker="anushka"),
        vad=silero.VAD.load()
    )

    # Start conversation
    await session.start(
        room=ctx.room,
        agent=Agent(instructions="You are a helpful assistant.")
    )

    # Generate greeting
    await session.generate_reply(instructions="Greet the user.")

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

### Custom Function Calling

```python
from livekit.agents import llm

# Define function
def get_weather(location: str) -> str:
    return f"Weather in {location}: Sunny, 25°C"

# Register with LLM
llm_instance = groq.LLM(
    model="llama-3.3-70b-versatile",
    tools=[
        llm.FunctionTool.from_function(get_weather)
    ]
)

# Use in session
session = AgentSession(llm=llm_instance, ...)
```

### Multi-Language Detection

```python
# Detect language and switch TTS
@agent_session.on("user_input_transcribed")
def on_transcript(transcript):
    if transcript.is_final:
        # Simple heuristic (use langdetect for production)
        if any(hindi_char in transcript.text for hindi_char in "अआइईउऊएऐओऔ"):
            # Use Hindi voice
            session.tts = sarvam.TTS(target_language_code="hi-IN")
        else:
            # Use English voice
            session.tts = elevenlabs.TTS(voice_id="english_voice")
```

### Custom VAD Settings

```python
# Adjust for noisy environments
vad = silero.VAD.load(
    min_speech_duration=0.3,      # Longer to avoid false triggers
    min_silence_duration=0.5,      # Longer pauses before turn-taking
    activation_threshold=0.65,     # Higher threshold (less sensitive)
    sample_rate=16000
)
```

---

## Additional Resources

### Official Documentation
- LiveKit Agents Guide: https://docs.livekit.io/agents/
- Python SDK Reference: https://docs.livekit.io/client-sdk-python/
- Cloud Agents Dashboard: https://cloud.livekit.io/agents

### Plugin Documentation
- Sarvam AI: https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-sarvam
- ElevenLabs: https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-elevenlabs
- Groq: https://github.com/livekit/agents/tree/main/livekit-plugins/livekit-plugins-groq

### Community
- Discord: https://discord.gg/livekit
- GitHub Issues: https://github.com/livekit/agents/issues
- Examples: https://github.com/livekit/agents/tree/main/examples

---

## Quick Reference

### Essential Commands

```bash
# Development
python agent.py dev                    # Local dev mode

# Deployment
lk agent deploy                        # Deploy to cloud
lk agent list                          # List deployments
lk agent logs                          # View logs
lk agent logs --follow                 # Real-time logs
lk agent delete <deployment-id>        # Delete deployment

# Testing
lk room join <room-name>              # Join room as test user
lk token create --room <room-name>    # Generate room token
```

### Environment Variables Checklist

```bash
✅ LIVEKIT_URL
✅ LIVEKIT_API_KEY
✅ LIVEKIT_API_SECRET
✅ SARVAM_API_KEY
✅ GROQ_API_KEY
✅ PLAYGROUND_MODE
✅ TTS_PROVIDER
✅ TTS_VOICE
✅ TTS_MODEL
```

---

**Last Updated:** 2025-10-24
**Project Version:** v20251024070622
**Agent Status:** ✅ Deployed and Running
