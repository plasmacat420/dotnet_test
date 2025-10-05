#!/bin/bash
# ============================================
# QUICK START SCRIPT - DEVELOPMENT MODE
# ============================================
# Starts the entire voice agent stack in development mode
# Usage: ./scripts/start-dev.sh
# ============================================

set -e  # Exit on error

echo "🚀 Starting Voice Agent Development Environment..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo ""
    echo "📝 Please edit .env file with your API keys:"
    echo "   - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
    echo "   - DEEPGRAM_API_KEY, SARVAM_API_KEY, GROQ_API_KEY"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

echo "🔧 Building Docker images..."
docker-compose build

echo ""
echo "✅ Starting services..."
echo "   - API: http://localhost:5264"
echo "   - Swagger: http://localhost:5264/swagger"
echo "   - Health: http://localhost:5264/health"
echo ""
echo "📝 To stop: Press Ctrl+C or run ./scripts/stop-all.sh"
echo ""

# Start services (development mode with override)
docker-compose up
