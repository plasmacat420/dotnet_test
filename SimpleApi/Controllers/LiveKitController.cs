using Microsoft.AspNetCore.Mvc;
using SimpleApi.Services;
using System.Net.Http.Json;
using System.Text;

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
    private readonly IHttpClientFactory _httpClientFactory;

    public LiveKitController(
        LiveKitTokenService tokenService,
        ILogger<LiveKitController> logger,
        Microsoft.Extensions.Options.IOptions<Configuration.LiveKitOptions> livekitOptions,
        IHttpClientFactory httpClientFactory)
    {
        _tokenService = tokenService;
        _logger = logger;
        _livekitOptions = livekitOptions.Value;
        _httpClientFactory = httpClientFactory;
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

            // Dispatch agent to room immediately
            try
            {
                await DispatchAgentToRoom(roomName);
                _logger.LogInformation($"Dispatched agent to room: {roomName}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Agent dispatch failed (will retry on connection): {ex.Message}");
                // Continue even if dispatch fails - agent might auto-join
            }

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
    /// Dispatch agent to a specific room using LiveKit Agent Dispatch API
    /// </summary>
    private async Task DispatchAgentToRoom(string roomName)
    {
        var httpClient = _httpClientFactory.CreateClient();

        // LiveKit Agent Dispatch API endpoint
        var apiUrl = _livekitOptions.Url.Replace("wss://", "https://") + "/twirp/livekit.AgentDispatchService/CreateDispatch";

        // Create dispatch request payload
        var dispatchRequest = new
        {
            room = roomName,
            agent_name = "" // Empty for any agent (playground mode)
        };

        // Create HTTP request with LiveKit authentication
        var request = new HttpRequestMessage(HttpMethod.Post, apiUrl);
        request.Headers.Add("Authorization", $"Bearer {GenerateServerToken()}");
        request.Content = JsonContent.Create(dispatchRequest);

        var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Generate a server token for LiveKit API authentication
    /// </summary>
    private string GenerateServerToken()
    {
        // Use the token service to generate a server-level token
        return _tokenService.GenerateToken("", "server", "server");
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
