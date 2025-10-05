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
    private readonly ILogger<LiveKitController> _logger;
    private readonly Configuration.LiveKitOptions _livekitOptions;

    public LiveKitController(
        LiveKitTokenService tokenService,
        ILogger<LiveKitController> logger,
        Microsoft.Extensions.Options.IOptions<Configuration.LiveKitOptions> livekitOptions)
    {
        _tokenService = tokenService;
        _logger = logger;
        _livekitOptions = livekitOptions.Value;
    }

    /// <summary>
    /// Get an access token to join the voice agent room
    /// </summary>
    [HttpPost("token")]
    public IActionResult GetToken([FromBody] TokenRequest request)
    {
        try
        {
            // Use provided identity or generate a unique one
            var identity = string.IsNullOrEmpty(request.Identity)
                ? $"user-{Guid.NewGuid():N}"
                : request.Identity;

            // Use provided name or default
            var name = string.IsNullOrEmpty(request.Name)
                ? "Guest"
                : request.Name;

            // Create unique room name for this session
            // This allows LiveKit to dispatch the agent properly
            var roomName = $"voice-session-{Guid.NewGuid():N}".Substring(0, 30);

            var token = _tokenService.GenerateToken(roomName, identity, name);

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
