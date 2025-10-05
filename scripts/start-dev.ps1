# ============================================
# QUICK START SCRIPT - DEVELOPMENT MODE (PowerShell)
# ============================================
# Starts the entire voice agent stack in development mode
# Usage: .\scripts\start-dev.ps1
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Voice Agent Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Visit: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

# Check if Docker Compose is available
$composeCmd = $null
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $composeCmd = "docker-compose"
} elseif (docker compose version 2>$null) {
    $composeCmd = "docker compose"
} else {
    Write-Host "❌ Docker Compose is not available." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host ""
    Write-Host "📝 Please edit .env file with your API keys:" -ForegroundColor Cyan
    Write-Host "   - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
    Write-Host "   - DEEPGRAM_API_KEY, SARVAM_API_KEY, GROQ_API_KEY"
    Write-Host ""
    Read-Host "Press Enter after editing .env file"
}

Write-Host "🔧 Building Docker images..." -ForegroundColor Cyan
if ($composeCmd -eq "docker-compose") {
    docker-compose build
} else {
    docker compose build
}

Write-Host ""
Write-Host "✅ Starting services..." -ForegroundColor Green
Write-Host "   - API: http://localhost:5264" -ForegroundColor Cyan
Write-Host "   - Swagger: http://localhost:5264/swagger" -ForegroundColor Cyan
Write-Host "   - Health: http://localhost:5264/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 To stop: Press Ctrl+C or run .\scripts\stop-all.ps1" -ForegroundColor Yellow
Write-Host ""

# Start services (development mode with override)
if ($composeCmd -eq "docker-compose") {
    docker-compose up
} else {
    docker compose up
}
