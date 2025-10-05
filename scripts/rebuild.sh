#!/bin/bash
# ============================================
# REBUILD DOCKER IMAGES
# ============================================
# Forces a rebuild of all Docker images
# Use this when dependencies change
# Usage: ./scripts/rebuild.sh
# ============================================

set -e

echo "🔨 Rebuilding Docker images from scratch..."
echo ""

# Stop running containers
docker-compose down

# Build with no cache
docker-compose build --no-cache

echo ""
echo "✅ Rebuild complete!"
echo ""
echo "🚀 To start services, run:"
echo "   ./scripts/start-dev.sh"
