using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SimpleApi.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, HttpClient httpClient)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            var apiKey = _configuration["Resend:ApiKey"]
                ?? throw new InvalidOperationException("Resend API key not configured (RESEND_API_KEY)");
            var senderEmail = _configuration["Resend:SenderEmail"] ?? "hello@prepreater.com";
            var senderName = _configuration["Resend:SenderName"] ?? "Prepreater Voice Agent";

            var payload = new
            {
                from = $"{senderName} <{senderEmail}>",
                to = new[] { toEmail },
                subject,
                html = htmlBody
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Resend API failed: {StatusCode} - {Response}", response.StatusCode, responseContent);
                return false;
            }

            _logger.LogInformation("Email sent via Resend to {ToEmail}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail}", toEmail);
            return false;
        }
    }
}
