using System.Diagnostics;

namespace SimpleApi.Middleware;

/// <summary>
/// Middleware that logs details about each HTTP request
/// </summary>
/// <remarks>
/// What it does:
/// - Logs when a request starts (method, path, IP address)
/// - Measures how long the request takes to process
/// - Logs when the request completes (status code, duration)
///
/// Why it's useful:
/// - Helps debug issues by seeing all incoming requests
/// - Performance monitoring (identify slow endpoints)
/// - Security auditing (track who's accessing what)
/// - Understanding user behavior patterns
/// </remarks>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    /// <summary>
    /// Constructor - Dependencies injected by ASP.NET Core
    /// </summary>
    /// <param name="next">Next middleware in the pipeline</param>
    /// <param name="logger">Logger for recording request information</param>
    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Processes each HTTP request and logs details
    /// </summary>
    /// <param name="context">Current HTTP context containing request info</param>
    public async Task InvokeAsync(HttpContext context)
    {
        // Start a stopwatch to measure request duration
        var stopwatch = Stopwatch.StartNew();

        // Get client IP address for logging
        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Log the incoming request
        _logger.LogInformation(
            "Request started: {Method} {Path} from {IpAddress}",
            context.Request.Method,
            context.Request.Path,
            ipAddress
        );

        try
        {
            // Continue to the next middleware (and eventually the endpoint)
            await _next(context);
        }
        finally
        {
            // Stop the stopwatch (request finished)
            stopwatch.Stop();

            // Log the completed request with duration and status code
            _logger.LogInformation(
                "Request completed: {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds
            );
        }
    }
}
