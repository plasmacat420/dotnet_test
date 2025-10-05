namespace SimpleApi.Configuration;

/// <summary>
/// Configuration options for LiveKit
/// </summary>
public class LiveKitOptions
{
    public const string SectionName = "LiveKit";

    /// <summary>
    /// LiveKit server URL (e.g., wss://your-project.livekit.cloud)
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// LiveKit API Key
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// LiveKit API Secret
    /// </summary>
    public string ApiSecret { get; set; } = string.Empty;
}
