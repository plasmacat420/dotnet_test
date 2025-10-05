# 🎤 LiveKit Voice Agent

A production-ready voice agent system with .NET backend and Python worker, featuring real-time voice conversations powered by LiveKit, Sarvam AI, Groq, and Deepgram.

[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-00ADD8?logo=livekit)](https://livekit.io)

---

## ✨ Features

### Voice Agent Capabilities
- 🗣️ **Real-time Voice Conversations** - Natural voice interactions with low latency
- 🌐 **Multi-language Support** - English and Hindi/Indian languages
- 🔄 **Live Transcription** - Real-time speech-to-text conversion
- 📧 **Transcript Email** - Send conversation history via email
- 🎯 **Voice Activity Detection** - Smart turn detection and interruption handling

### Backend (ASP.NET Core 9)
- 🔐 **LiveKit Token Generation** - Secure room access tokens
- 📚 **Swagger/OpenAPI** - Interactive API documentation
- 🛡️ **Production-Ready** - Error handling, logging, rate limiting
- 🌐 **CORS Enabled** - Cross-origin resource sharing
- ⚡ **Response Compression** - Gzip/Brotli for faster responses
- 🏥 **Health Checks** - Monitoring endpoints

### Voice Agent Worker (Python)
- 🎧 **STT Integration** - Deepgram (English), Sarvam AI (Hindi)
- 🤖 **LLM Processing** - Groq (Llama 3.3), Azure OpenAI (GPT-4)
- 🔊 **TTS Synthesis** - Sarvam AI (natural Indian voices)
- 📊 **Modular Architecture** - Clean separation of concerns
- 🔄 **Auto-reconnect** - Resilient connection handling

---

## 🚀 Quick Start with Docker

**Get running in 2 minutes:**

```bash
# 1. Clone repository
git clone https://github.com/plasmacat420/dotnet_test.git
cd dotnet_test

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start everything!
docker-compose up
```

**Access:**
- 🌐 **App**: http://localhost:5264
- 📚 **API Docs**: http://localhost:5264/swagger
- 🏥 **Health**: http://localhost:5264/health

**Or use quick-start scripts:**

```bash
# Linux/Mac
./scripts/start-dev.sh

# Windows
.\scripts\start-dev.ps1
```

---

## 📋 Prerequisites

### Required API Keys

1. **LiveKit Cloud** - https://cloud.livekit.io (free tier)
2. **Deepgram** - https://console.deepgram.com
3. **Sarvam AI** - https://www.sarvam.ai
4. **Groq** - https://console.groq.com (free tier)

### Software Requirements

**Option 1: Docker (Recommended)** ✅
- [Docker Desktop](https://docs.docker.com/get-docker/) (includes Docker Compose)

**Option 2: Manual Setup**
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Python 3.11+](https://python.org)
- [Node.js 20+](https://nodejs.org) (for npm/pnpm)

---

## 🏗️ Project Structure

```
dotnet_test/
├── SimpleApi/                      # .NET 9 Backend
│   ├── Controllers/               # API endpoints
│   │   ├── ContactController.cs   # Contact info
│   │   ├── LiveKitController.cs   # Token generation
│   │   └── TranscriptController.cs # Transcript handling
│   ├── Services/                  # Business logic
│   │   └── LiveKitTokenService.cs
│   ├── Models/                    # DTOs
│   ├── Middleware/                # Request pipeline
│   ├── Configuration/             # Service setup
│   ├── wwwroot/                   # Frontend
│   └── Dockerfile                 # Docker build
│
├── voice-agent-py/                # Python Voice Agent
│   ├── agent.py                  # Main entry point
│   ├── modular/                  # Modular components
│   │   ├── config.py            # Configuration
│   │   ├── conversation_manager.py
│   │   ├── session_manager.py
│   │   └── transcript_manager.py
│   └── Dockerfile                # Docker build
│
├── scripts/                       # Utility scripts
│   ├── start-dev.sh             # Quick start (Linux/Mac)
│   ├── start-dev.ps1            # Quick start (Windows)
│   ├── stop-all.sh              # Stop services
│   └── rebuild.sh               # Force rebuild
│
├── docker-compose.yml            # Docker orchestration
├── docker-compose.override.yml   # Dev overrides
├── .env.example                  # Environment template
├── DOCKER.md                     # Docker guide
└── README.md                     # This file
```

---

## 🐳 Docker Usage

### Development

```bash
# Start with hot reload
docker-compose up

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build optimized images
docker-compose -f docker-compose.yml build

# Start in detached mode
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps
```

**📖 Full Docker Guide**: See [DOCKER.md](DOCKER.md)

---

## ⚙️ Manual Setup (Without Docker)

### Backend (.NET API)

```bash
cd SimpleApi

# Restore dependencies
dotnet restore

# Run
dotnet run

# Access at http://localhost:5264
```

### Voice Agent (Python)

```bash
cd voice-agent-py

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -e .

# Set environment variables in .env

# Run agent
python agent.py
```

---

## 📡 API Endpoints

### Frontend
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Contact page |

### API
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/contact` | Get contact information |
| `POST` | `/api/contact` | Submit contact message |
| `POST` | `/api/livekit/token` | Generate LiveKit access token |
| `POST` | `/api/transcript/send` | Send transcript via email |
| `GET` | `/health` | Health check |

### Documentation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/swagger` | Interactive API docs |

---

## 🔧 Configuration

### Environment Variables

Create `.env` from template:

```bash
cp .env.example .env
```

**Required:**
```env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret

# AI Services
DEEPGRAM_API_KEY=your_key
SARVAM_API_KEY=your_key
GROQ_API_KEY=your_key
```

**Optional:**
```env
ASPNETCORE_ENVIRONMENT=Development
LOG_LEVEL=INFO
AGENT_PORT=8081
PLAYGROUND_MODE=false
```

---

## 🧪 Testing

### Test the API

```bash
# Health check
curl http://localhost:5264/health

# Get contact info
curl http://localhost:5264/api/contact

# Generate LiveKit token
curl -X POST http://localhost:5264/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser"}'
```

### Test Voice Agent

1. Open http://localhost:5264
2. Click the speaker icon
3. Allow microphone access
4. Start speaking!

---

## 📚 Documentation

- **[DOCKER.md](DOCKER.md)** - Complete Docker setup guide
- **[LIVEKIT_SETUP.md](LIVEKIT_SETUP.md)** - LiveKit configuration
- **[AZURE_AI_SETUP.md](AZURE_AI_SETUP.md)** - Azure OpenAI setup
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[SimpleApi/README.md](SimpleApi/README.md)** - Backend documentation
- **[voice-agent-py/README.md](voice-agent-py/README.md)** - Agent documentation

---

## 🚢 Deployment

### Railway.app (Recommended)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Cost**: ~$5-10/month

### Azure Container Apps

```bash
az containerapp up \
  --name voiceagent-api \
  --resource-group voiceagent-rg \
  --environment voiceagent-env \
  --image ghcr.io/plasmacat420/dotnet_test/api:latest
```

**Cost**: ~$10-30/month

### Other Platforms

- **Render**: https://render.com
- **Fly.io**: https://fly.io
- **DigitalOcean**: https://digitalocean.com
- **AWS ECS**: https://aws.amazon.com/ecs/

**📖 Deployment Guide**: See [DOCKER.md](DOCKER.md#-production-deployment)

---

## 🛠️ Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| **Framework** | ASP.NET Core 9 |
| **Language** | C# 12 |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **WebRTC** | LiveKit Server SDK |
| **Compression** | Gzip, Brotli |

### Voice Agent
| Component | Technology |
|-----------|------------|
| **Runtime** | Python 3.11+ |
| **Framework** | LiveKit Agents |
| **STT** | Deepgram, Sarvam AI |
| **LLM** | Groq (Llama 3.3), Azure OpenAI |
| **TTS** | Sarvam AI |
| **VAD** | Silero |

### Frontend
| Component | Technology |
|-----------|------------|
| **Core** | HTML5, CSS3, JavaScript |
| **WebRTC** | LiveKit Client SDK |
| **UI** | Vanilla JS (no framework) |
| **Styling** | Modern CSS with variables |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Faiz Shaikh**
- LinkedIn: [@prepreater](http://www.linkedin.com/in/prepreater)
- GitHub: [@plasmacat420](https://github.com/plasmacat420)
- LeetCode: [@faiz0308](https://leetcode.com/u/faiz0308/)
- Email: faiz.corsair@gmail.com

---

## 🙏 Acknowledgments

- Built with ❤️ using ASP.NET Core 9
- Voice powered by LiveKit
- AI powered by Sarvam, Groq, and Deepgram
- Transformed with 🤖 Claude Code

---

## 🆘 Support

**Issues?**
- GitHub Issues: https://github.com/plasmacat420/dotnet_test/issues
- LiveKit Discord: https://livekit.io/discord
- Email: faiz.corsair@gmail.com

---

**⭐ Star this repo if you find it helpful!**

**🎉 Ready to deploy!**
