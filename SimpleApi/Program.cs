/*
 * SIMPLE API - PROGRAM.CS
 * ========================
 * This is the entry point of the application.
 * It configures services, middleware, and starts the web server.
 *
 * Architecture Overview:
 * - Controllers: Handle HTTP requests and return responses
 * - Models: Define data structures (DTOs)
 * - Middleware: Process requests before they reach controllers
 * - Configuration: Extension methods for service setup
 * - wwwroot: Static files (frontend)
 *
 * Request Flow:
 * 1. Request comes in → Middleware pipeline (logging, error handling, CORS)
 * 2. Rate limiter checks if client has exceeded limits
 * 3. Request reaches controller endpoint
 * 4. Controller processes request and returns response
 * 5. Response goes back through middleware (compression, etc.)
 * 6. Client receives response
 */

using SimpleApi.Configuration;
using SimpleApi.Middleware;
using SimpleApi.Services;

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: CREATE WEB APPLICATION BUILDER
// ═══════════════════════════════════════════════════════════════════════════
// The builder is used to configure services before the app starts

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file
EnvironmentConfig.LoadEnvironmentVariables(builder);
// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: CONFIGURE SERVICES (Dependency Injection Container)
// ═══════════════════════════════════════════════════════════════════════════
// Services are configured here and made available throughout the app

// Add Controllers with improved JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for JSON properties (JavaScript convention)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Pretty-print JSON in development for easier debugging
        options.JsonSerializerOptions.WriteIndented = builder.Environment.IsDevelopment();
    });

// Configure CORS (Cross-Origin Resource Sharing)
// Allows frontend to call API from different domain
builder.Services.ConfigureCors();

// Configure Swagger for API documentation
// Access at /swagger when app is running
builder.Services.ConfigureSwagger();

// Configure response compression (gzip/brotli)
// Reduces response size and improves performance
builder.Services.ConfigureCompression();

// Configure rate limiting to prevent abuse
// Limits requests per IP address
builder.Services.ConfigureRateLimiting();

// Add static file serving for wwwroot
// Serves your frontend (HTML, CSS, JS, images)
builder.Services.AddDirectoryBrowser();

// Configure LiveKit options from appsettings.json
builder.Services.Configure<LiveKitOptions>(
    builder.Configuration.GetSection(LiveKitOptions.SectionName));

// Register LiveKit Token Service
builder.Services.AddScoped<LiveKitTokenService>();

// Register Email Service
builder.Services.AddScoped<EmailService>();

// Register Summary Service with HttpClient
builder.Services.AddHttpClient<SummaryService>();

// Register Agent Dispatch Service with HttpClient
builder.Services.AddHttpClient<AgentDispatchService>();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: BUILD THE APPLICATION
// ═══════════════════════════════════════════════════════════════════════════
// This creates the WebApplication instance with all configured services

var app = builder.Build();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: CONFIGURE MIDDLEWARE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════
// Middleware executes in the order it's added
// Request flows DOWN the pipeline, response flows UP

// [1] Error Handling - MUST BE FIRST!
// Catches all exceptions and returns friendly error responses
app.UseMiddleware<ErrorHandlingMiddleware>();

// [2] Request Logging
// Logs details about each request (method, path, duration, status)
app.UseMiddleware<RequestLoggingMiddleware>();

// [2.5] Security Headers
// Add security headers to protect against common web vulnerabilities
app.Use(async (context, next) =>
{
    // Content Security Policy - Prevent XSS attacks
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' wss: https:; " +
        "font-src 'self' data:; " +
        "media-src 'self';";

    // X-Content-Type-Options - Prevent MIME type sniffing
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";

    // X-Frame-Options - Prevent clickjacking
    context.Response.Headers["X-Frame-Options"] = "DENY";

    // X-XSS-Protection - Enable browser XSS filter
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

    // Referrer-Policy - Control referrer information
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Permissions-Policy - Control browser features
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=()";

    await next();
});

// [3] Swagger UI (Development Only)
// Interactive API documentation at /swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Simple API v1");
        options.RoutePrefix = "swagger"; // Access at /swagger
    });
}

// [4] HTTPS Redirection
// Redirects HTTP requests to HTTPS for security
app.UseHttpsRedirection();

// [5] Static Files
// Serves files from wwwroot folder (your frontend)
app.UseDefaultFiles(); // Serves index.html by default
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Force browsers to always revalidate cached files
        // This ensures users always get the latest version
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=0, must-revalidate";
    }
});

// [6] Response Compression
// Compresses responses to reduce bandwidth
app.UseResponseCompression();

// [7] CORS Policy
// Allows cross-origin requests from browsers
app.UseCors("AllowAll");

// [8] Rate Limiting
// Enforces request limits per IP address
app.UseRateLimiter();

// [9] Routing
// Maps incoming requests to controller endpoints
app.UseRouting();

// [10] Authorization (if you add authentication later)
// app.UseAuthorization();

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: MAP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Map all controller endpoints
// Automatically discovers all classes inheriting from ControllerBase
app.MapControllers();

// Fallback route - redirect root to index.html
app.MapFallback(() => Results.Redirect("/index.html"));

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: START THE APPLICATION
// ═══════════════════════════════════════════════════════════════════════════
// This starts the web server and begins listening for requests

app.Run();

/*
 * AVAILABLE ENDPOINTS:
 * ====================
 *
 * Frontend:
 *   GET  /                      → Your contact page (wwwroot/index.html)
 *
 * API:
 *   GET  /api/contact           → Get contact information
 *   POST /api/contact           → Submit contact form message
 *   GET  /health                → Health check endpoint
 *
 * Documentation:
 *   GET  /swagger               → Interactive API documentation (dev only)
 *
 * ====================
 * TO RUN THE APP:
 *   dotnet run
 *
 * THEN VISIT:
 *   http://localhost:5264       → Your contact page
 *   http://localhost:5264/swagger → API documentation
 * ====================
 */
