using Livekit.Server.Sdk.Dotnet;
using Microsoft.Extensions.Options;
using SimpleApi.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace SimpleApi.Services;

/// <summary>
/// Service for generating LiveKit access tokens
/// </summary>
public class LiveKitTokenService
{
    private readonly LiveKitOptions _options;
    private readonly ILogger<LiveKitTokenService> _logger;

    public LiveKitTokenService(
        IOptions<LiveKitOptions> options,
        ILogger<LiveKitTokenService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Generate an access token for a participant to join a LiveKit room
    /// </summary>
    /// <param name="roomName">Name of the room</param>
    /// <param name="participantIdentity">Unique identifier for the participant</param>
    /// <param name="participantName">Display name for the participant</param>
    /// <returns>JWT token string</returns>
    public string GenerateToken(string roomName, string participantIdentity, string? participantName = null)
    {
        try
        {
            var videoGrant = new Dictionary<string, object>
            {
                ["roomJoin"] = true,
                ["room"] = roomName,
                ["canPublish"] = true,
                ["canSubscribe"] = true,
                ["canPublishData"] = true
            };

            // Create payload manually to ensure proper JSON structure
            var payload = new Dictionary<string, object>
            {
                ["sub"] = participantIdentity,
                ["name"] = participantName ?? participantIdentity,
                ["video"] = videoGrant,  // This will be embedded as JSON object, not string
                ["exp"] = new DateTimeOffset(DateTime.UtcNow.AddHours(6)).ToUnixTimeSeconds(),
                ["iss"] = _options.ApiKey
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.ApiSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var handler = new JwtSecurityTokenHandler();
            var token = handler.CreateJwtSecurityToken(
                issuer: _options.ApiKey,
                audience: null,
                subject: null,
                notBefore: null,
                expires: DateTime.UtcNow.AddHours(6),
                issuedAt: DateTime.UtcNow,
                signingCredentials: creds
            );

            // Add custom payload
            foreach (var kvp in payload)
            {
                if (kvp.Key != "iss" && kvp.Key != "exp")
                {
                    if (kvp.Value is Dictionary<string, object> dict)
                    {
                        token.Payload[kvp.Key] = dict;
                    }
                    else
                    {
                        token.Payload[kvp.Key] = kvp.Value;
                    }
                }
            }

            var jwt = handler.WriteToken(token);

            _logger.LogInformation(
                "Generated token for participant {Identity} in room {Room}",
                participantIdentity,
                roomName);

            return jwt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating LiveKit token");
            throw;
        }
    }
}
