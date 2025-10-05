# 🐳 Docker Setup Guide

Complete guide for running the LiveKit Voice Agent with Docker.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Prerequisites](#-prerequisites)
- [Setup](#-setup)
- [Usage](#-usage)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Production Deployment](#-production-deployment)

---

## 🚀 Quick Start

**For the impatient:**

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your API keys
nano .env  # or use any editor

# 3. Start everything
docker-compose up
```

**That's it!** Visit http://localhost:5264

---

## 📦 Prerequisites

### Required Software

- **Docker Desktop** (includes Docker + Docker Compose)
  - Windows: [Download](https://docs.docker.com/desktop/install/windows-install/)
  - Mac: [Download](https://docs.docker.com/desktop/install/mac-install/)
  - Linux: [Download](https://docs.docker.com/desktop/install/linux-install/)

### Required API Keys

1. **LiveKit Cloud** (free tier available)
   - Sign up: https://cloud.livekit.io
   - Get: WebSocket URL, API Key, API Secret

2. **Deepgram** (STT for English)
   - Sign up: https://console.deepgram.com
   - Get: API Key

3. **Sarvam AI** (STT/TTS for Hindi/Indian languages)
   - Sign up: https://www.sarvam.ai
   - Get: API Key

4. **Groq** (LLM - fast & free tier)
   - Sign up: https://console.groq.com
   - Get: API Key

---

## ⚙️ Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/plasmacat420/dotnet_test.git
cd dotnet_test
```

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your API keys
nano .env  # Linux/Mac
notepad .env  # Windows
```

**Required variables:**
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
DEEPGRAM_API_KEY=your_key
SARVAM_API_KEY=your_key
GROQ_API_KEY=your_key
```

### Step 3: Verify Docker Installation

```bash
docker --version
docker-compose --version
```

---

## 🎮 Usage

### Development Mode (Recommended)

**Linux/Mac:**
```bash
./scripts/start-dev.sh
```

**Windows PowerShell:**
```powershell
.\scripts\start-dev.ps1
```

**Manual:**
```bash
docker-compose up
```

This starts:
- ✅ .NET API on http://localhost:5264
- ✅ Python Agent worker (connects to LiveKit)
- ✅ Hot reload enabled
- ✅ Verbose logging

---

### Production Mode

```bash
# Build optimized images
docker-compose -f docker-compose.yml build

# Start in detached mode
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

### Common Commands

```bash
# Stop all services
docker-compose down

# Stop with script
./scripts/stop-all.sh

# View logs
docker-compose logs -f api      # API logs
docker-compose logs -f agent    # Agent logs
docker-compose logs -f          # All logs

# Rebuild after code changes
docker-compose up --build

# Force rebuild (clean slate)
./scripts/rebuild.sh

# Check service health
docker-compose ps

# Execute command in container
docker-compose exec api bash
docker-compose exec agent sh

# View resource usage
docker stats
```

---

## 🏗️ Architecture

### Container Overview

```
┌─────────────────────────────────────────┐
│        Docker Compose Stack             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ voiceagent-  │  │ voiceagent-  │   │
│  │    api       │  │   worker     │   │
│  │              │  │              │   │
│  │ .NET 9       │  │ Python 3.11  │   │
│  │ Port: 5264   │  │ Port: 8081   │   │
│  │              │  │              │   │
│  │ - Frontend   │  │ - LiveKit    │   │
│  │ - REST API   │  │   Agent      │   │
│  │ - Token Gen  │  │ - STT/LLM/   │   │
│  │              │  │   TTS        │   │
│  └──────────────┘  └──────────────┘   │
│         │                 │            │
│         └────────┬────────┘            │
│                  │                     │
│       voiceagent-network               │
│                                         │
└─────────────────────────────────────────┘
          │
          ↓
   External Services:
   - LiveKit Cloud
   - Deepgram API
   - Sarvam API
   - Groq API
```

### Services

#### 1. **api** (.NET Backend)
- **Image**: Custom (built from `SimpleApi/Dockerfile`)
- **Port**: 5264 → 8080 (container)
- **Purpose**:
  - Serves frontend
  - Generates LiveKit tokens
  - Handles transcript requests
- **Health Check**: `GET /health`

#### 2. **agent** (Python Worker)
- **Image**: Custom (built from `voice-agent-py/Dockerfile`)
- **Port**: 8081 (metrics/health)
- **Purpose**:
  - Joins LiveKit rooms
  - Processes voice conversations
  - STT → LLM → TTS pipeline
- **Health Check**: Process monitoring

---

## 🔧 Configuration

### Environment Variables

**Application Settings:**
```env
ASPNETCORE_ENVIRONMENT=Development  # or Production
LOG_LEVEL=INFO                      # DEBUG, INFO, WARNING, ERROR
AGENT_PORT=8081
PLAYGROUND_MODE=false
```

**LiveKit:**
```env
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

**AI Services:**
```env
DEEPGRAM_API_KEY=...
SARVAM_API_KEY=...
GROQ_API_KEY=...
```

### Docker Compose Overrides

**Development** (`docker-compose.override.yml`):
- Automatically loaded with `docker-compose up`
- Enables hot reload
- Verbose logging
- Source code mounted

**Production** (`docker-compose.yml` only):
```bash
docker-compose -f docker-compose.yml up
```
- Optimized images
- Minimal logging
- No source mounts

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem**: `Error: port 5264 is already allocated`

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :5264  # Windows
lsof -i :5264                 # Linux/Mac

# Change port in docker-compose.yml
ports:
  - "5265:8080"  # Use different port
```

### Container Fails to Start

**Check logs:**
```bash
docker-compose logs api
docker-compose logs agent
```

**Common issues:**
- ❌ Missing API keys in `.env`
- ❌ Invalid API key format
- ❌ Network connectivity issues

### API Keys Not Working

**Verify environment:**
```bash
docker-compose exec api printenv | grep LIVEKIT
docker-compose exec agent printenv | grep GROQ
```

### Build Errors

**Clean rebuild:**
```bash
# Remove all containers and images
docker-compose down
docker system prune -a

# Rebuild from scratch
./scripts/rebuild.sh
```

### Health Check Failures

**Check health status:**
```bash
docker-compose ps
```

**Manually test health endpoints:**
```bash
# API health
curl http://localhost:5264/health

# Agent health (process check)
docker-compose exec agent pgrep -f agent.py
```

---

## 🚢 Production Deployment

### Option 1: Railway.app (Easiest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy
railway up
```

**Cost**: ~$5-10/month

---

### Option 2: Azure Container Apps

```bash
# Login to Azure
az login

# Create resource group
az group create --name voiceagent-rg --location eastus

# Create container app environment
az containerapp env create \
  --name voiceagent-env \
  --resource-group voiceagent-rg \
  --location eastus

# Deploy API
az containerapp create \
  --name voiceagent-api \
  --resource-group voiceagent-rg \
  --environment voiceagent-env \
  --image ghcr.io/plasmacat420/dotnet_test/api:latest \
  --target-port 8080 \
  --ingress external \
  --env-vars \
    LIVEKIT_URL=$LIVEKIT_URL \
    LIVEKIT_API_KEY=$LIVEKIT_API_KEY \
    LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET

# Deploy Agent
az containerapp create \
  --name voiceagent-worker \
  --resource-group voiceagent-rg \
  --environment voiceagent-env \
  --image ghcr.io/plasmacat420/dotnet_test/agent:latest \
  --env-vars \
    LIVEKIT_URL=$LIVEKIT_URL \
    DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY \
    GROQ_API_KEY=$GROQ_API_KEY
```

**Cost**: ~$10-30/month

---

### Option 3: Docker Hub + Any Cloud

```bash
# Build and tag
docker build -t yourusername/voiceagent-api:latest ./SimpleApi
docker build -t yourusername/voiceagent-agent:latest ./voice-agent-py

# Push to Docker Hub
docker push yourusername/voiceagent-api:latest
docker push yourusername/voiceagent-agent:latest

# Deploy to any platform that supports Docker
```

---

## 📊 Monitoring

### Resource Usage

```bash
# Real-time stats
docker stats

# Specific container
docker stats voiceagent-api
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f api

# Save logs to file
docker-compose logs > logs.txt
```

---

## 🔐 Security Best Practices

✅ **Never commit `.env` file** (in .gitignore)
✅ **Use secrets manager in production** (Azure Key Vault, AWS Secrets Manager)
✅ **Run containers as non-root user** (already configured)
✅ **Use HTTPS in production** (configure reverse proxy)
✅ **Restrict CORS** (update `appsettings.json`)
✅ **Enable rate limiting** (already configured)

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [LiveKit Documentation](https://docs.livekit.io)
- [.NET Docker Images](https://hub.docker.com/_/microsoft-dotnet)

---

## 🆘 Getting Help

**Issues?**
- Check logs: `docker-compose logs`
- GitHub Issues: https://github.com/plasmacat420/dotnet_test/issues
- LiveKit Discord: https://livekit.io/discord

---

**🎉 You're all set! Happy coding!**
