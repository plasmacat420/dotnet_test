using System.ComponentModel.DataAnnotations;

namespace SimpleApi.Models;

public class TranscriptRequest
{
    [Required]
    [EmailAddress]
    public string To { get; set; } = string.Empty;

    [Required]
    public string RoomName { get; set; } = string.Empty;

    [Required]
    public TranscriptData Transcript { get; set; } = new();
}

public class TranscriptData
{
    public List<TranscriptMessage> Messages { get; set; } = new();
    public TranscriptMetadata? Metadata { get; set; }
}

public class TranscriptMessage
{
    public string Role { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class TranscriptMetadata
{
    public int TotalMessages { get; set; }
    public int UserMessages { get; set; }
    public int AgentMessages { get; set; }
    public string? ConversationStart { get; set; }
    public string? ConversationEnd { get; set; }
}
