#!/bin/bash
# ============================================
# STOP ALL SERVICES
# ============================================
# Stops and removes all Docker containers
# Usage: ./scripts/stop-all.sh
# ============================================

set -e

echo "🛑 Stopping Voice Agent services..."

# Stop containers
docker-compose down

echo ""
echo "✅ All services stopped and containers removed."
echo ""
echo "📝 To remove volumes as well, run:"
echo "   docker-compose down -v"
