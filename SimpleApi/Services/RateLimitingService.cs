using System.Collections.Concurrent;

namespace SimpleApi.Services;

/// <summary>
/// Simple in-memory rate limiting service to prevent spam
/// </summary>
public class RateLimitingService
{
    private readonly ConcurrentDictionary<string, List<DateTime>> _requestLog = new();
    private readonly ILogger<RateLimitingService> _logger;

    public RateLimitingService(ILogger<RateLimitingService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Check if a request should be rate limited
    /// </summary>
    /// <param name="identifier">Unique identifier (IP address, user ID, etc.)</param>
    /// <param name="maxRequests">Maximum requests allowed in the time window</param>
    /// <param name="timeWindowMinutes">Time window in minutes</param>
    /// <returns>True if rate limit exceeded, false if request is allowed</returns>
    public bool IsRateLimited(string identifier, int maxRequests = 5, int timeWindowMinutes = 60)
    {
        var now = DateTime.UtcNow;
        var cutoffTime = now.AddMinutes(-timeWindowMinutes);

        // Get or create request log for this identifier
        var requests = _requestLog.GetOrAdd(identifier, _ => new List<DateTime>());

        lock (requests)
        {
            // Remove old requests outside the time window
            requests.RemoveAll(t => t < cutoffTime);

            // Check if limit exceeded
            if (requests.Count >= maxRequests)
            {
                _logger.LogWarning("Rate limit exceeded for {Identifier}. {Count} requests in last {Minutes} minutes",
                    identifier, requests.Count, timeWindowMinutes);
                return true;
            }

            // Add current request
            requests.Add(now);
        }

        return false;
    }

    /// <summary>
    /// Clean up old entries periodically (call this from a background service)
    /// </summary>
    public void Cleanup(int olderThanMinutes = 120)
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-olderThanMinutes);
        var keysToRemove = new List<string>();

        foreach (var kvp in _requestLog)
        {
            lock (kvp.Value)
            {
                kvp.Value.RemoveAll(t => t < cutoffTime);

                // Remove empty entries
                if (kvp.Value.Count == 0)
                {
                    keysToRemove.Add(kvp.Key);
                }
            }
        }

        foreach (var key in keysToRemove)
        {
            _requestLog.TryRemove(key, out _);
        }

        if (keysToRemove.Count > 0)
        {
            _logger.LogInformation("Rate limiter cleanup: Removed {Count} old entries", keysToRemove.Count);
        }
    }
}
