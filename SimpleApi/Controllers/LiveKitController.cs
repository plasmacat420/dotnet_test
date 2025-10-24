using Microsoft.AspNetCore.Mvc;
using SimpleApi.Services;

namespace SimpleApi.Controllers;

/// <summary>
/// Controller for LiveKit voice agent operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LiveKitController : ControllerBase
{
    private readonly LiveKitTokenService _tokenService;
    private readonly AgentDispatchService _agentDispatch;
    private readonly ILogger<LiveKitController> _logger;
    private readonly Configuration.LiveKitOptions _livekitOptions;

    public LiveKitController(
        LiveKitTokenService tokenService,
        AgentDispatchService agentDispatch,
        ILogger<LiveKitController> logger,
        Microsoft.Extensions.Options.IOptions<Configuration.LiveKitOptions> livekitOptions)
    {
        _tokenService = tokenService;
        _agentDispatch = agentDispatch;
        _logger = logger;
        _livekitOptions = livekitOptions.Value;
    }

    /// <summary>
    /// Get an access token to join the voice agent room
    /// </summary>
    [HttpPost("token")]
    public async Task<IActionResult> GetToken([FromBody] TokenRequest request)
    {
        try
        {
            // Input validation - prevent XSS and injection attacks
            var identity = string.IsNullOrEmpty(request.Identity)
                ? $"user-{Guid.NewGuid():N}"
                : SanitizeInput(request.Identity, 50);

            var name = string.IsNullOrEmpty(request.Name)
                ? "Guest"
                : SanitizeInput(request.Name, 50);

            // Validate sanitized inputs
            if (string.IsNullOrEmpty(identity) || string.IsNullOrEmpty(name))
            {
                return BadRequest(new { error = "Invalid input parameters" });
            }

            // Create unique room name for this session
            var roomName = $"voice-session-{Guid.NewGuid():N}".Substring(0, 30);

            var token = _tokenService.GenerateToken(roomName, identity, name);

            // Dispatch cloud agent to this room (await to handle errors)
            _logger.LogInformation("Dispatching agent to room {RoomName}", roomName);

            try
            {
                var dispatched = await _agentDispatch.DispatchAgentToRoomAsync(roomName);
                if (dispatched)
                {
                    _logger.LogInformation("Agent successfully dispatched to room {RoomName}", roomName);
                }
                else
                {
                    _logger.LogWarning("Agent dispatch returned false for room {RoomName}. Fallback agents may still pick up.", roomName);
                }
            }
            catch (Exception dispatchEx)
            {
                // Log error but don't fail the request - user still gets a valid token
                // Fallback agents or manual dispatch can still work
                _logger.LogError(dispatchEx, "Failed to dispatch agent to room {RoomName}. Token still valid, fallback may work.", roomName);
            }

            return Ok(new TokenResponse
            {
                Token = token,
                Identity = identity,
                RoomName = roomName,
                Url = _livekitOptions.Url
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating token");
            return StatusCode(500, new { error = "Failed to generate token" });
        }
    }

    /// <summary>
    /// Sanitize user input to prevent XSS and injection attacks
    /// </summary>
    private static string SanitizeInput(string input, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove potentially dangerous characters
        var sanitized = System.Text.RegularExpressions.Regex.Replace(
            input,
            @"[^\w\s\-@.]",
            string.Empty
        ).Trim();

        // Limit length
        return sanitized.Length > maxLength
            ? sanitized.Substring(0, maxLength)
            : sanitized;
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            service = "LiveKit Voice Agent",
            timestamp = DateTime.UtcNow
        });
    }
}

/// <summary>
/// Request model for token generation
/// </summary>
public record TokenRequest
{
    public string? Identity { get; init; }
    public string? Name { get; init; }
}

/// <summary>
/// Response model for token generation
/// </summary>
public record TokenResponse
{
    public required string Token { get; init; }
    public required string Identity { get; init; }
    public required string RoomName { get; init; }
    public required string Url { get; init; }
}
