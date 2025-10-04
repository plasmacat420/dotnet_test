namespace SimpleApi.Models;

/// <summary>
/// Generic wrapper for all API responses
/// Provides consistent response structure across all endpoints
/// </summary>
/// <remarks>
/// Purpose: Standardize API responses with success/error status and optional data
/// Pattern: Result pattern for consistent error handling
/// </remarks>
/// <typeparam name="T">The type of data being returned</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Human-readable message describing the result
    /// </summary>
    /// <example>Contact message received successfully</example>
    public string? Message { get; set; }

    /// <summary>
    /// The actual data payload (if operation succeeded)
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// List of error messages (if operation failed)
    /// </summary>
    public List<string>? Errors { get; set; }

    /// <summary>
    /// Creates a successful response with data
    /// </summary>
    /// <param name="data">The data to return</param>
    /// <param name="message">Optional success message</param>
    /// <returns>ApiResponse indicating success</returns>
    public static ApiResponse<T> Ok(T data, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    /// <summary>
    /// Creates an error response with error messages
    /// </summary>
    /// <param name="errors">List of error messages</param>
    /// <param name="message">Optional error summary</param>
    /// <returns>ApiResponse indicating failure</returns>
    public static ApiResponse<T> Error(List<string> errors, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message ?? "An error occurred",
            Errors = errors
        };
    }

    /// <summary>
    /// Creates an error response with a single error message
    /// </summary>
    /// <param name="error">Error message</param>
    /// <returns>ApiResponse indicating failure</returns>
    public static ApiResponse<T> Error(string error)
    {
        return Error(new List<string> { error });
    }
}
