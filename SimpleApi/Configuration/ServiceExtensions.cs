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
    /// - Development: Allows all origins for easier testing
    /// - Production: Restricts to specific configured domains only
    /// </remarks>
    /// <param name="services">Service collection to add CORS to</param>
    /// <param name="configuration">Configuration for allowed origins</param>
    /// <param name="environment">Environment to determine development vs production</param>
    public static void ConfigureCors(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                // In development, allow all origins for easier testing
                if (environment.IsDevelopment())
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                }
                else
                {
                    // In production, restrict to configured origins
                    var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                        ?? new[] { "https://prepreater.azurewebsites.net", "http://localhost:5264" };

                    builder
                        .WithOrigins(allowedOrigins)
                        .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
                        .AllowCredentials();  // Allow cookies/auth if needed
                }
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
    /// - 200 requests per minute per IP address (increased for better UX)
    /// - Returns 429 (Too Many Requests) if exceeded
    /// - Lightweight: Uses fixed window algorithm
    /// </remarks>
    /// <param name="services">Service collection to add rate limiting to</param>
    public static void ConfigureRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 200,                      // Increased limit for better UX
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.Headers["Retry-After"] = "60";
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = "Too many requests. Please try again later." },
                    cancellationToken
                );
            };
        });
    }
}
