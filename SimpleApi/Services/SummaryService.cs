using System.Text;
using System.Text.Json;

namespace SimpleApi.Services;

public class SummaryService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SummaryService> _logger;
    private readonly HttpClient _httpClient;

    public SummaryService(IConfiguration configuration, ILogger<SummaryService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<string> SummarizeConversationAsync(List<ConversationMessage> messages, string roomName)
    {
        try
        {
            var groqApiKey = _configuration["Groq:ApiKey"];
            if (string.IsNullOrEmpty(groqApiKey))
            {
                _logger.LogError("Groq API key not configured. Please set 'Groq:ApiKey' in appsettings.json");
                _logger.LogWarning("Falling back to basic summary without AI analysis");
                return GenerateFallbackSummary(messages, roomName);
            }

            _logger.LogDebug("Generating AI summary for {MessageCount} messages using Groq", messages.Count);

            // Format conversation for AI analysis
            var conversationText = FormatConversationForAI(messages);

            // Create prompt for summarization - CONCISE and BUSINESS-FOCUSED
            var prompt = $@"The below pasted is the conversation between the user and the agent.
-----------------------------------------------------------------------------------------------------------------------------
Conversation:
{conversationText}
-----------------------------------------------------------------------------------------------------------------------------
";

var system_instructions= $@"Create a CONCISE business summary of the conversation above in this JSON format:
{{
    ""executiveSummary"": ""2-3 sentence overview of the conversation"",
    ""keyPoints"": [""max 3 most important discussion points""],
    ""userNeeds"": [""1-2 main problems or requests mentioned""],
    ""recommendations"": [""1-2 key solutions or next steps suggested""],
    ""actionItems"": [""any specific actions to follow up on""],
    ""leadQuality"": ""hot/warm/cold"",
    ""userDetails"": {{
        ""name"": ""extracted name or 'Not provided'"",
        ""email"": ""extracted email or 'Not provided'""
    }}
}}

Rules:
- Be EXTREMELY concise - each bullet point should be 5-10 words max
- Focus ONLY on business-critical information
- Omit small talk and pleasantries
- Combine related points into single bullets
- leadQuality: hot=ready to buy/demo, warm=interested, cold=just browsing
- ALWAYS provide executiveSummary even for brief conversations (e.g., 'Brief greeting exchange, no business discussion yet')
- If conversation is too short for key points, set arrays to empty [] but always provide executiveSummary";

            // Call Groq API
            var requestBody = new
            {
                model = "llama-3.3-70b-versatile",
                messages = new[]
                {
                    new { role = "system", content = system_instructions },
                    new { role = "user", content = prompt }
                },
                temperature = 0.3,
                max_tokens = 750,
                response_format = new { type = "json_object" }  // Force JSON-only response
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {groqApiKey}");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Groq API request failed: {StatusCode} - Response: {Response}",
                    response.StatusCode, responseContent);
                _logger.LogWarning("Falling back to basic summary due to Groq API failure");
                return GenerateFallbackSummary(messages, roomName);
            }

            var groqResponse = JsonSerializer.Deserialize<GroqResponse>(responseContent);
            var summaryJson = groqResponse?.choices?[0]?.message?.content;

            if (string.IsNullOrEmpty(summaryJson))
            {
                _logger.LogError("Groq API returned empty response");
                _logger.LogWarning("Falling back to basic summary");
                return GenerateFallbackSummary(messages, roomName);
            }

            // Log first 200 chars for debugging
            _logger.LogDebug("Raw Groq response (first 200 chars): {Response}",
                summaryJson.Substring(0, Math.Min(200, summaryJson.Length)));

            // Clean markdown code fences AND any surrounding text
            summaryJson = summaryJson.Trim();

            // Remove markdown code fences if present
            if (summaryJson.Contains("```"))
            {
                _logger.LogDebug("Removing markdown code fences from Groq response");
                var startIndex = summaryJson.IndexOf('{');
                var endIndex = summaryJson.LastIndexOf('}');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    summaryJson = summaryJson.Substring(startIndex, endIndex - startIndex + 1);
                }
            }

            // Extract JSON if wrapped in explanatory text (fallback safety)
            if (!summaryJson.StartsWith("{"))
            {
                _logger.LogWarning("Response doesn't start with JSON, attempting to extract...");
                var startIndex = summaryJson.IndexOf('{');
                var endIndex = summaryJson.LastIndexOf('}');
                if (startIndex >= 0 && endIndex > startIndex)
                {
                    _logger.LogDebug("Extracting JSON from position {Start} to {End}", startIndex, endIndex);
                    summaryJson = summaryJson.Substring(startIndex, endIndex - startIndex + 1);
                }
                else
                {
                    _logger.LogError("Could not find JSON in Groq response");
                    return GenerateFallbackSummary(messages, roomName);
                }
            }

            _logger.LogInformation("Successfully generated AI summary with Groq");

            // Parse the summary JSON and format as HTML
            var summary = JsonSerializer.Deserialize<ConversationSummary>(summaryJson);
            return FormatSummaryAsHtml(summary, messages, roomName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error summarizing conversation with Groq");
            return GenerateFallbackSummary(messages, roomName);
        }
    }

    private string FormatConversationForAI(List<ConversationMessage> messages)
    {
        var sb = new StringBuilder();
        foreach (var msg in messages)
        {
            var speaker = msg.Role == "user" ? "User" : "Anushka";
            sb.AppendLine($"{speaker}: {msg.Text}");
        }
        return sb.ToString();
    }

    private string FormatSummaryAsHtml(ConversationSummary? summary, List<ConversationMessage> messages, string roomName)
    {
        if (summary == null)
        {
            return GenerateFallbackSummary(messages, roomName);
        }

        var includeFullTranscript = _configuration.GetValue<bool>("Email:IncludeFullTranscript", false);

        var sb = new StringBuilder();
        sb.AppendLine("<html><body style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #ffffff;'>");
        sb.AppendLine("<h2 style='color: #6EE7B7; border-bottom: 2px solid #6EE7B7; padding-bottom: 10px; margin-bottom: 25px;'>Conversation Summary</h2>");

        // Executive Summary
        if (!string.IsNullOrEmpty(summary.ExecutiveSummary))
        {
            sb.AppendLine("<div style='background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #667eea;'>");
            sb.AppendLine($"<p style='margin: 0; font-size: 15px; line-height: 1.6; color: #1f2937;'><strong>Summary:</strong> {summary.ExecutiveSummary}</p>");
            sb.AppendLine("</div>");
        }

        // Contact & Lead Info
        sb.AppendLine("<div style='background: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;'>");
        sb.AppendLine("<table style='width: 100%; border-collapse: collapse;'>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280; width: 140px;'><strong>Room:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{roomName}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Name:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{summary.UserDetails?.Name ?? "Not provided"}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Email:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{summary.UserDetails?.Email ?? "Not provided"}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Messages:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{messages.Count}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Lead Quality:</strong></td><td style='padding: 6px 0;'><span style='display: inline-block; padding: 4px 12px; border-radius: 6px; background: {GetLeadQualityColor(summary.LeadQuality)}; color: white; font-weight: 600; font-size: 13px; text-transform: uppercase;'>{summary.LeadQuality ?? "N/A"}</span></td></tr>");
        sb.AppendLine("</table>");
        sb.AppendLine("</div>");

        // Check if summary is too minimal (brief conversation with no substantial content)
        var hasContent = (summary.KeyPoints?.Any() ?? false) ||
                         (summary.UserNeeds?.Any() ?? false) ||
                         (summary.Recommendations?.Any() ?? false) ||
                         (summary.ActionItems?.Any() ?? false) ||
                         !string.IsNullOrEmpty(summary.ExecutiveSummary);

        if (!hasContent)
        {
            _logger.LogInformation("Brief conversation detected - including full transcript");
            sb.AppendLine("<div style='background: #fef3c7; padding: 18px; border-radius: 10px; border-left: 4px solid #f59e0b; margin: 25px 0;'>");
            sb.AppendLine("<p style='margin: 0; color: #92400e;'><strong>ℹ️ Brief Conversation:</strong> This was a short interaction without substantial business discussion. The full conversation is included below for your reference.</p>");
            sb.AppendLine("</div>");

            // Force include full transcript for brief conversations
            includeFullTranscript = true;
        }

        // Key Points
        if (summary.KeyPoints != null && summary.KeyPoints.Any())
        {
            sb.AppendLine("<div style='margin: 25px 0;'>");
            sb.AppendLine("<h3 style='color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center;'>");
            sb.AppendLine("<span style='color: #6EE7B7; margin-right: 8px;'>●</span> Key Discussion Points</h3>");
            sb.AppendLine("<ul style='margin: 0; padding-left: 20px; line-height: 1.9; color: #4b5563;'>");
            foreach (var point in summary.KeyPoints)
            {
                sb.AppendLine($"<li style='margin: 8px 0;'>{point}</li>");
            }
            sb.AppendLine("</ul>");
            sb.AppendLine("</div>");
        }

        // User Needs
        if (summary.UserNeeds != null && summary.UserNeeds.Any())
        {
            sb.AppendLine("<div style='margin: 25px 0;'>");
            sb.AppendLine("<h3 style='color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center;'>");
            sb.AppendLine("<span style='color: #667eea; margin-right: 8px;'>●</span> User Needs</h3>");
            sb.AppendLine("<ul style='margin: 0; padding-left: 20px; line-height: 1.9; color: #4b5563;'>");
            foreach (var need in summary.UserNeeds)
            {
                sb.AppendLine($"<li style='margin: 8px 0;'>{need}</li>");
            }
            sb.AppendLine("</ul>");
            sb.AppendLine("</div>");
        }

        // Recommendations
        if (summary.Recommendations != null && summary.Recommendations.Any())
        {
            sb.AppendLine("<div style='margin: 25px 0;'>");
            sb.AppendLine("<h3 style='color: #374151; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center;'>");
            sb.AppendLine("<span style='color: #10b981; margin-right: 8px;'>●</span> Recommendations</h3>");
            sb.AppendLine("<ul style='margin: 0; padding-left: 20px; line-height: 1.9; color: #4b5563;'>");
            foreach (var rec in summary.Recommendations)
            {
                sb.AppendLine($"<li style='margin: 8px 0;'>{rec}</li>");
            }
            sb.AppendLine("</ul>");
            sb.AppendLine("</div>");
        }

        // Action Items
        if (summary.ActionItems != null && summary.ActionItems.Any())
        {
            sb.AppendLine("<div style='background: #fef3c7; padding: 18px; border-radius: 10px; border-left: 4px solid #f59e0b; margin: 25px 0;'>");
            sb.AppendLine("<h3 style='margin: 0 0 12px 0; color: #92400e; font-size: 16px;'>⚡ Action Items</h3>");
            sb.AppendLine("<ul style='margin: 0; padding-left: 20px; line-height: 1.9; color: #78350f;'>");
            foreach (var action in summary.ActionItems)
            {
                sb.AppendLine($"<li style='margin: 8px 0;'><strong>{action}</strong></li>");
            }
            sb.AppendLine("</ul>");
            sb.AppendLine("</div>");
        }

        // Optional full transcript
        if (includeFullTranscript)
        {
            sb.AppendLine("<details style='margin: 30px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;'>");
            sb.AppendLine("<summary style='cursor: pointer; color: #6b7280; font-weight: 600; padding: 10px; background: #f9fafb; border-radius: 6px;'>📄 View Full Conversation</summary>");
            sb.AppendLine("<div style='padding: 20px; background: #f9fafb; border-radius: 8px; margin-top: 15px;'>");
            foreach (var msg in messages)
            {
                var isUser = msg.Role == "user";
                var bgColor = isUser ? "#667eea" : "#10b981";
                var textColor = "white";
                var align = isUser ? "right" : "left";

                sb.AppendLine($"<div style='margin: 12px 0; text-align: {align};'>");
                sb.AppendLine($"<div style='display: inline-block; max-width: 70%; padding: 10px 14px; background: {bgColor}; color: {textColor}; border-radius: 12px; text-align: left;'>");
                sb.AppendLine($"<p style='margin: 0; font-size: 14px;'>{msg.Text}</p>");
                sb.AppendLine($"<small style='opacity: 0.8; font-size: 11px;'>{msg.Timestamp}</small>");
                sb.AppendLine("</div></div>");
            }
            sb.AppendLine("</div>");
            sb.AppendLine("</details>");
        }

        sb.AppendLine("<p style='margin-top: 35px; padding-top: 20px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; text-align: center;'>");
        sb.AppendLine($"Generated by Prepreater & Co. Voice Agent<br>{DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine("</p>");
        sb.AppendLine("</body></html>");

        return sb.ToString();
    }

    private string GetLeadQualityColor(string quality)
    {
        return quality?.ToLower() switch
        {
            "hot" => "#dc2626",
            "warm" => "#f59e0b",
            "cold" => "#3b82f6",
            _ => "#6b7280"
        };
    }

    private string GenerateFallbackSummary(List<ConversationMessage> messages, string roomName)
    {
        _logger.LogInformation("Generating fallback summary (AI summary unavailable)");

        var sb = new StringBuilder();
        sb.AppendLine("<html><body style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #ffffff;'>");
        sb.AppendLine("<h2 style='color: #6EE7B7; border-bottom: 2px solid #6EE7B7; padding-bottom: 10px;'>Conversation Summary</h2>");

        // Warning that AI summary failed
        sb.AppendLine("<div style='background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;'>");
        sb.AppendLine("<p style='margin: 0; color: #92400e;'><strong>⚠️ Note:</strong> AI-powered summary unavailable. Showing basic conversation details.</p>");
        sb.AppendLine("</div>");

        // Basic stats
        var userMessages = messages.Where(m => m.Role == "user").ToList();
        var assistantMessages = messages.Where(m => m.Role == "assistant").ToList();
        var firstTimestamp = messages.FirstOrDefault()?.Timestamp ?? "";
        var lastTimestamp = messages.LastOrDefault()?.Timestamp ?? "";

        sb.AppendLine("<div style='background: #f9fafb; padding: 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb;'>");
        sb.AppendLine("<h3 style='margin-top: 0; color: #374151; font-size: 16px;'>Conversation Details</h3>");
        sb.AppendLine("<table style='width: 100%; border-collapse: collapse;'>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280; width: 140px;'><strong>Room:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{roomName}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Total Messages:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{messages.Count} ({userMessages.Count} from user, {assistantMessages.Count} from agent)</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Started:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{firstTimestamp}</td></tr>");
        sb.AppendLine($"<tr><td style='padding: 6px 0; color: #6b7280;'><strong>Ended:</strong></td><td style='padding: 6px 0; color: #1f2937;'>{lastTimestamp}</td></tr>");
        sb.AppendLine("</table>");
        sb.AppendLine("</div>");

        // Show first 3 and last 3 important exchanges (not everything)
        var importantMessages = new List<ConversationMessage>();
        importantMessages.AddRange(messages.Take(Math.Min(3, messages.Count)));
        if (messages.Count > 6)
        {
            importantMessages.AddRange(messages.Skip(Math.Max(0, messages.Count - 3)));
        }

        sb.AppendLine("<div style='margin: 25px 0;'>");
        sb.AppendLine("<h3 style='color: #374151; font-size: 16px; margin-bottom: 12px;'>Key Exchanges</h3>");
        sb.AppendLine("<div style='background: #f9fafb; padding: 15px; border-radius: 8px;'>");

        var displayedCount = 0;
        foreach (var msg in importantMessages.Distinct())
        {
            if (displayedCount == 3 && messages.Count > 6)
            {
                sb.AppendLine("<p style='text-align: center; color: #9ca3af; margin: 15px 0;'>... {messages.Count - 6} more messages ...</p>");
            }

            var isUser = msg.Role == "user";
            var bgColor = isUser ? "#667eea" : "#10b981";
            var align = isUser ? "right" : "left";
            var speaker = isUser ? "User" : "Agent";

            sb.AppendLine($"<div style='margin: 12px 0; text-align: {align};'>");
            sb.AppendLine($"<div style='display: inline-block; max-width: 80%; padding: 10px 14px; background: {bgColor}; color: white; border-radius: 12px; text-align: left;'>");
            sb.AppendLine($"<small style='opacity: 0.8; font-weight: 600;'>{speaker}</small>");
            sb.AppendLine($"<p style='margin: 4px 0 0 0; font-size: 14px;'>{msg.Text}</p>");
            sb.AppendLine("</div></div>");

            displayedCount++;
        }

        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        // Recommendation
        sb.AppendLine("<div style='background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 25px 0;'>");
        sb.AppendLine("<p style='margin: 0; color: #1e40af;'><strong>💡 Tip:</strong> Configure a Groq API key in appsettings.json for intelligent AI-powered summaries with extracted insights.</p>");
        sb.AppendLine("</div>");

        sb.AppendLine("<p style='margin-top: 35px; padding-top: 20px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; text-align: center;'>");
        sb.AppendLine($"Generated by Prepreater & Co. Voice Agent<br>{DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
        sb.AppendLine("</p>");
        sb.AppendLine("</body></html>");

        return sb.ToString();
    }
}

// DTOs for Groq API
public class GroqResponse
{
    public GroqChoice[]? choices { get; set; }
}

public class GroqChoice
{
    public GroqMessage? message { get; set; }
}

public class GroqMessage
{
    public string? content { get; set; }
}

// Summary structure
public class ConversationSummary
{
    public string? ExecutiveSummary { get; set; }
    public List<string>? KeyPoints { get; set; }
    public List<string>? UserNeeds { get; set; }
    public List<string>? Recommendations { get; set; }
    public List<string>? ActionItems { get; set; }
    public string? LeadQuality { get; set; }
    public UserDetails? UserDetails { get; set; }
}

public class UserDetails
{
    public string? Name { get; set; }
    public string? Email { get; set; }
}

public class ConversationMessage
{
    public string Role { get; set; } = "";
    public string Text { get; set; } = "";
    public string Timestamp { get; set; } = "";
}
