# ============================================
# SIMPLIFIED DOCKERFILE FOR .NET API
# ============================================
# This uses a single-stage build for simplicity
# ============================================

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /app

# Copy everything
COPY . .

# Restore dependencies
RUN dotnet restore

# Build the project
RUN dotnet build -c Release --no-restore

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_USE_POLLING_FILE_WATCHER=true

# Run the application (--no-launch-profile to ignore launchSettings.json)
CMD ["dotnet", "run", "--no-build", "--no-restore", "--no-launch-profile", "-c", "Release"]
