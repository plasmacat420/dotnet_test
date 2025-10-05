# 🎨 Simple API - Professional Contact Portfolio

A production-ready ASP.NET Core Web API serving a premium contact page with comprehensive backend features.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Development](#-development)
- [Production Deployment](#-production-deployment)

---

## ✨ Features

### Frontend
- 🎨 **Premium UI** - Animated orbital orbs, glassmorphism design
- 📱 **Fully Responsive** - Mobile, tablet, and desktop optimized
- ♿ **Accessible** - WCAG 2.1 compliant with keyboard navigation
- 🚀 **Performance** - Optimized loading, lazy images, preloading
- 📲 **PWA Ready** - Installable on mobile devices
- 🔍 **SEO Optimized** - Rich meta tags for social sharing

### Backend
- 🛡️ **Production-Ready** - Error handling, logging, rate limiting
- 📚 **Swagger/OpenAPI** - Interactive API documentation
- 🌐 **CORS Enabled** - Cross-origin resource sharing configured
- 🔒 **HTTPS** - Secure communication
- ⚡ **Response Compression** - Gzip/Brotli for faster responses
- 🚦 **Rate Limiting** - Protection against abuse (100 req/min per IP)
- 🏥 **Health Checks** - Monitoring endpoint for DevOps
- 📝 **Comprehensive Logging** - Request/response tracking

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | .NET 9 (ASP.NET Core) |
| **Frontend** | React 18 (CDN), Vanilla JavaScript |
| **Styling** | Modern CSS with CSS Variables |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **Validation** | Data Annotations |
| **Compression** | Gzip, Brotli |

---

## 📁 Project Structure

```
SimpleApi/
├── Controllers/              # API endpoint handlers
│   ├── ContactController.cs  # Contact info & form submission
│   └── HealthController.cs   # Health check endpoint
│
├── Models/                   # Data Transfer Objects (DTOs)
│   ├── ContactInfo.cs        # Contact information model
│   ├── ContactMessage.cs     # Contact form submission model
│   └── ApiResponse.cs        # Standardized API response wrapper
│
├── Middleware/               # Custom middleware components
│   ├── ErrorHandlingMiddleware.cs  # Global exception handling
│   └── RequestLoggingMiddleware.cs # Request/response logging
│
├── Configuration/            # Service configuration extensions
│   └── ServiceExtensions.cs  # CORS, Swagger, Rate Limiting config
│
├── wwwroot/                  # Static frontend files
│   ├── index.html            # Main page
│   ├── app.js                # React components
│   ├── style.css             # Styling
│   ├── manifest.json         # PWA manifest
│   └── [images]              # Static assets
│
├── Program.cs                # Application entry point
├── SimpleApi.csproj          # Project configuration
├── appsettings.json          # App settings
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- Any modern browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SimpleApi
   ```

2. **Restore dependencies**
   ```bash
   dotnet restore
   ```

3. **Run the application**
   ```bash
   dotnet run
   ```

4. **Access the application**
   - 🌐 **Contact Page**: http://localhost:5264
   - 📚 **API Documentation**: http://localhost:5264/swagger
   - 🏥 **Health Check**: http://localhost:5264/health

---

## 📡 API Endpoints

### Frontend
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Contact page (wwwroot/index.html) |

### API

#### 1. Get Contact Information
```http
GET /api/contact
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Contact information retrieved successfully",
  "data": {
    "name": "Faiz Shaikh",
    "summary": "Full-Stack Software Engineer | Cloud-native APIs...",
    "email": "faiz.corsair@gmail.com",
    "linkedIn": "http://www.linkedin.com/in/prepreater",
    "gitHub": "https://github.com/plasmacat420",
    "leetCode": "https://leetcode.com/u/faiz0308/"
  }
}
```

#### 2. Submit Contact Message
```http
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Project Inquiry",
  "message": "Hi, I'd like to discuss a project..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Thank you for your message! I'll get back to you soon.",
  "data": {
    "receivedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Message must be between 10 and 5000 characters"
  ]
}
```

#### 3. Health Check
```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "Healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "application": "SimpleApi",
  "version": "1.0.0"
}
```

---

## 🏗️ Architecture

### Request Flow

```
Client Request
    ↓
[1] ErrorHandlingMiddleware    ← Catches all exceptions
    ↓
[2] RequestLoggingMiddleware   ← Logs request details
    ↓
[3] HTTPS Redirection          ← Forces HTTPS
    ↓
[4] Static Files               ← Serves wwwroot
    ↓
[5] Response Compression       ← Compresses response
    ↓
[6] CORS Policy                ← Validates origin
    ↓
[7] Rate Limiter               ← Checks request limits
    ↓
[8] Routing                    ← Maps to controller
    ↓
[9] Controller Action          ← Processes request
    ↓
[10] Model Validation          ← Validates input
    ↓
Response
```

### Design Patterns

- **Repository Pattern** (ready for database integration)
- **Result Pattern** (ApiResponse wrapper)
- **Middleware Pipeline** (cross-cutting concerns)
- **Dependency Injection** (built-in DI container)

---

## ⚙️ Configuration

### CORS Settings

Located in: `Configuration/ServiceExtensions.cs`

**Development (Current):**
```csharp
builder.AllowAnyOrigin()  // Allow all origins
```

**Production (Recommended):**
```csharp
builder.WithOrigins(
    "https://yourdomain.com",
    "https://www.yourdomain.com"
)
```

### Rate Limiting

Located in: `Configuration/ServiceExtensions.cs`

**Current Settings:**
- 100 requests per minute per IP
- Adjustable in `ConfigureRateLimiting` method

### Logging Levels

Located in: `appsettings.json`

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

---

## 💻 Development

### Building

```bash
dotnet build
```

### Running with Hot Reload

```bash
dotnet watch run
```

### Running Tests (when added)

```bash
dotnet test
```

### Viewing Logs

Logs are output to the console during development.
For production, configure a logging provider (e.g., Serilog, Application Insights).

---

## 🚢 Production Deployment

### 1. Update Configuration

**appsettings.Production.json:**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "yourdomain.com"
}
```

### 2. Update CORS

In `Configuration/ServiceExtensions.cs`, change:
```csharp
builder.WithOrigins("https://yourdomain.com")
```

### 3. Build for Production

```bash
dotnet publish -c Release -o ./publish
```

### 4. Deploy

**Azure App Service:**
```bash
az webapp up --name your-app-name --resource-group your-rg
```

**Docker:**
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
COPY ./publish /app
WORKDIR /app
ENTRYPOINT ["dotnet", "SimpleApi.dll"]
```

### 5. Environment Variables

Set in your hosting platform:
- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=http://+:80;https://+:443`

---

## 📝 Code Documentation

Every file in this project includes comprehensive XML documentation:

- **What it does** - Purpose and functionality
- **How it works** - Implementation details
- **Why it exists** - Architectural reasoning

Access interactive docs at `/swagger` when running the app.

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
- Transformed with 🤖 Claude Code
- Designed for 🚀 Production

---

**Ready to deploy!** 🎉
