using Microsoft.OpenApi.Models;
using System.Reflection;
using System.Threading.RateLimiting;

namespace SimpleApi.Configuration;

/// <summary>
/// Extension methods for configuring services in the application
/// </summary>
/// <remarks>
/// Purpose:
/// This class organizes service registration code to keep Program.cs clean and readable.
/// Each method configures a specific aspect of the application (CORS, Swagger, etc.)
///
/// Why use extension methods:
/// - Keeps configuration organized and modular
/// - Makes Program.cs easier to read
/// - Allows reusing configuration across projects
/// - Follows separation of concerns principle
/// </remarks>
public static class ServiceExtensions
{
    /// <summary>
    /// Configures CORS (Cross-Origin Resource Sharing) policy
    /// </summary>
    /// <remarks>
    /// What is CORS:
    /// CORS controls which websites can call your API from the browser.
    /// By default, browsers block requests from different domains for security.
    ///
    /// Why we need it:
    /// If your frontend (e.g., example.com) needs to call your API (api.example.com),
    /// CORS must be configured or the browser will block the request.
    ///
    /// Current configuration:
    /// - Allows requests from any origin (for development)
    /// - In production, restrict to specific domains only!
    /// </remarks>
    /// <param name="services">Service collection to add CORS to</param>
    public static void ConfigureCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                builder
                    .AllowAnyOrigin()      // Allow requests from any domain (CHANGE IN PRODUCTION!)
                    .AllowAnyMethod()      // Allow GET, POST, PUT, DELETE, etc.
                    .AllowAnyHeader();     // Allow any request headers

                // PRODUCTION RECOMMENDATION:
                // Replace AllowAnyOrigin() with:
                // .WithOrigins("https://yourdomain.com", "https://www.yourdomain.com")
            });
        });
    }

    /// <summary>
    /// Configures Swagger/OpenAPI documentation
    /// </summary>
    /// <remarks>
    /// What is Swagger:
    /// Swagger generates interactive API documentation from your code.
    /// Developers can:
    /// - See all available endpoints
    /// - View request/response models
    /// - Test API calls directly in the browser
    /// - Generate client code automatically
    ///
    /// Access it at: /swagger (when running the app)
    ///
    /// XML Comments:
    /// This configuration includes XML comments in the docs,
    /// so all your /// summary tags appear in Swagger UI!
    /// </remarks>
    /// <param name="services">Service collection to add Swagger to</param>
    public static void ConfigureSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Simple API - Contact Portfolio",
                Version = "v1",
                Description = "A professional API for managing contact information and form submissions",
                Contact = new OpenApiContact
                {
                    Name = "Faiz Shaikh",
                    Email = "faiz.corsair@gmail.com",
                    Url = new Uri("https://github.com/plasmacat420")
                }
            });

            // Include XML comments in Swagger documentation
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
            {
                options.IncludeXmlComments(xmlPath);
            }
        });
    }

    /// <summary>
    /// Configures response compression (gzip/brotli)
    /// </summary>
    /// <remarks>
    /// What it does:
    /// Compresses API responses before sending them to the client.
    /// This reduces bandwidth usage and speeds up response times.
    ///
    /// Example:
    /// - Uncompressed JSON: 10 KB
    /// - Gzip compressed: ~2 KB
    /// - Brotli compressed: ~1.5 KB
    ///
    /// Supported formats:
    /// - Brotli (best compression, modern browsers)
    /// - Gzip (good compression, universal support)
    /// </remarks>
    /// <param name="services">Service collection to add compression to</param>
    public static void ConfigureCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;  // Compress HTTPS responses too
        });
    }

    /// <summary>
    /// Configures rate limiting to prevent API abuse
    /// </summary>
    /// <remarks>
    /// What is rate limiting:
    /// Limits how many requests a client can make in a time window.
    /// Prevents:
    /// - DDoS attacks
    /// - Spam submissions
    /// - Accidental infinite loops in client code
    /// - Resource exhaustion
    ///
    /// Current policy:
    /// - 100 requests per minute per IP address
    /// - Returns 429 (Too Many Requests) if exceeded
    /// </remarks>
    /// <param name="services">Service collection to add rate limiting to</param>
    public static void ConfigureRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                // Create a rate limit partition per IP address
                var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,              // Maximum 100 requests
                        Window = TimeSpan.FromMinutes(1), // Per 1 minute window
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0                  // Don't queue requests, reject immediately
                    });
            });

            // When rate limit exceeded, return this message
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await context.HttpContext.Response.WriteAsync(
                    "Too many requests. Please try again later.",
                    cancellationToken
                );
            };
        });
    }
}
