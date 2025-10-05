# ============================================
# DOCKERFILE FOR PYTHON VOICE AGENT
# ============================================
# LiveKit agent worker with Sarvam/Groq/Deepgram
# Final size: ~150MB with optimizations
# ============================================

# Use Python 3.11 slim image (smaller than full Python)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
# These are required by LiveKit agents and audio libraries
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    portaudio19-dev \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 agentuser

# Copy requirements first (for caching)
# If you have requirements.txt, uncomment this:
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# Install uv for faster dependency management (optional but recommended)
RUN pip install --no-cache-dir uv

# Copy pyproject.toml for dependency installation
COPY pyproject.toml .

# Install dependencies using uv (faster than pip)
RUN uv pip install --system --no-cache .

# Copy application code
COPY . .

# Change ownership to non-root user
RUN chown -R agentuser:agentuser /app

# Switch to non-root user
USER agentuser

# Expose agent port (if needed for metrics/health checks)
EXPOSE 8081

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LOG_LEVEL=INFO

# Health check (checks if process is running)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD pgrep -f "python.*agent.py" || exit 1

# Start the agent (use 'start' command for production, 'dev' for development)
CMD ["python", "agent.py", "start"]
