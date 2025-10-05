using System.Net;
using System.Text.Json;
using SimpleApi.Models;

namespace SimpleApi.Middleware;

/// <summary>
/// Global error handling middleware that catches all unhandled exceptions
/// </summary>
/// <remarks>
/// How it works:
/// 1. Wraps the entire request pipeline in a try-catch
/// 2. If any exception occurs, catches it and returns a standardized error response
/// 3. Logs the error for debugging
/// 4. Returns appropriate HTTP status codes
///
/// Why we need this:
/// - Prevents exposing sensitive error details to clients
/// - Provides consistent error response format
/// - Centralizes error logging
/// - Improves user experience with friendly error messages
/// </remarks>
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    /// <summary>
    /// Constructor - ASP.NET Core automatically injects dependencies
    /// </summary>
    /// <param name="next">The next middleware in the pipeline</param>
    /// <param name="logger">Logger for recording errors</param>
    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invoked for each HTTP request
    /// Wraps the request in error handling logic
    /// </summary>
    /// <param name="context">The current HTTP context</param>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // Pass control to the next middleware in the pipeline
            await _next(context);
        }
        catch (Exception ex)
        {
            // If anything goes wrong, handle it here
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Handles exceptions and returns appropriate error responses
    /// </summary>
    /// <param name="context">HTTP context to write the response to</param>
    /// <param name="exception">The exception that was thrown</param>
    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // Log the error for developers to investigate
        _logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);

        // Set the response status code based on exception type
        context.Response.StatusCode = exception switch
        {
            ArgumentException => (int)HttpStatusCode.BadRequest,           // 400 - Invalid input
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized, // 401 - Not authorized
            KeyNotFoundException => (int)HttpStatusCode.NotFound,           // 404 - Resource not found
            _ => (int)HttpStatusCode.InternalServerError                    // 500 - Server error
        };

        // Set response content type to JSON
        context.Response.ContentType = "application/json";

        // Create a standardized error response
        var response = ApiResponse<object>.Error(
            error: context.Response.StatusCode == 500
                ? "Internal server error. Please try again later."
                : exception.Message
        );

        // Serialize and return the error response as JSON
        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }
}
