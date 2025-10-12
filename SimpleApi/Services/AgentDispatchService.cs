using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SimpleApi.Configuration;

namespace SimpleApi.Services;

/// <summary>
/// Service for dispatching LiveKit agents to rooms
/// </summary>
public class AgentDispatchService
{
    private readonly HttpClient _httpClient;
    private readonly LiveKitOptions _livekitOptions;
    private readonly ILogger<AgentDispatchService> _logger;
    private const string AGENT_NAME = "hindi-voice-agent"; // Must match agent_name in agent code

    public AgentDispatchService(
        HttpClient httpClient,
        IOptions<LiveKitOptions> livekitOptions,
        ILogger<AgentDispatchService> logger)
    {
        _httpClient = httpClient;
        _livekitOptions = livekitOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Dispatch the cloud agent to a specific room
    /// </summary>
    public async Task<bool> DispatchAgentToRoomAsync(string roomName)
    {
        try
        {
            var apiUrl = _livekitOptions.Url.Replace("wss://", "https://");
            var dispatchUrl = $"{apiUrl}/twirp/livekit.AgentDispatchService/CreateDispatch";

            // Create JWT token for API authentication with admin permissions for this specific room
            var tokenServiceLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<LiveKitTokenService>.Instance;
            var optionsWrapper = Microsoft.Extensions.Options.Options.Create(_livekitOptions);
            var tokenService = new LiveKitTokenService(optionsWrapper, tokenServiceLogger);
            var apiToken = tokenService.GenerateAdminToken(roomName);

            var requestBody = new
            {
                agent_name = AGENT_NAME,  // Must match WorkerOptions agent_name
                room = roomName,
                metadata = ""  // Optional metadata
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            _logger.LogDebug("Dispatching agent {AgentName} to room {RoomName}", AGENT_NAME, roomName);

            var request = new HttpRequestMessage(HttpMethod.Post, dispatchUrl)
            {
                Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Agent dispatched successfully to room {RoomName}: {Response}",
                    roomName, responseContent);
                return true;
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to dispatch agent to room {RoomName}: {StatusCode} - {Error}",
                    roomName, response.StatusCode, errorContent);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching agent to room {RoomName}", roomName);
            return false;
        }
    }
}
