# ============================================
# MULTI-STAGE DOCKERFILE FOR .NET API
# ============================================
# Optimized for production deployment
# Features:
# - Multi-stage build (smaller final image)
# - Non-root user (security)
# - Minimal runtime image
# - Layer caching optimization
# ============================================

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy csproj and restore dependencies (cached layer)
COPY *.csproj ./
RUN dotnet restore --use-current-runtime

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish \
    --no-restore \
    --use-current-runtime \
    --self-contained false \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime

# Install curl for healthchecks (alpine uses apk)
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

WORKDIR /app

# Copy published app from build stage
COPY --from=build --chown=appuser:appgroup /app/publish .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "SimpleApi.dll"]
