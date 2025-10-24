using System.ComponentModel.DataAnnotations;

namespace SimpleApi.Models;

public class TranscriptRequest
{
    [Required(ErrorMessage = "Recipient email is required")]
    [EmailAddress(ErrorMessage = "Invalid email address")]
    [StringLength(255, ErrorMessage = "Email must be less than 255 characters")]
    public string To { get; set; } = string.Empty;

    [Required(ErrorMessage = "Room name is required")]
    [StringLength(100, ErrorMessage = "Room name must be less than 100 characters")]
    public string RoomName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Transcript data is required")]
    public TranscriptData Transcript { get; set; } = new();
}

public class TranscriptData
{
    [Required(ErrorMessage = "Messages are required")]
    [MaxLength(1000, ErrorMessage = "Maximum 1000 messages allowed per transcript")]
    [MinLength(1, ErrorMessage = "At least 1 message is required")]
    public List<TranscriptMessage> Messages { get; set; } = new();

    public TranscriptMetadata? Metadata { get; set; }
}

public class TranscriptMessage
{
    [Required(ErrorMessage = "Role is required")]
    [RegularExpression("^(user|assistant)$", ErrorMessage = "Role must be 'user' or 'assistant'")]
    public string Role { get; set; } = string.Empty;

    [Required(ErrorMessage = "Text is required")]
    [StringLength(5000, ErrorMessage = "Message text must be less than 5000 characters")]
    public string Text { get; set; } = string.Empty;

    [Required(ErrorMessage = "Timestamp is required")]
    [StringLength(50, ErrorMessage = "Timestamp must be less than 50 characters")]
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
