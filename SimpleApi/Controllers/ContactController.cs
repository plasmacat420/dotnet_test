using Microsoft.AspNetCore.Mvc;
using SimpleApi.Models;
using SimpleApi.Services;
using System.Net;

namespace SimpleApi.Controllers;

/// <summary>
/// API controller for managing contact-related operations
/// </summary>
/// <remarks>
/// Endpoints provided:
/// - GET /api/contact - Returns contact information
/// - POST /api/contact - Submits a contact form message
///
/// Purpose:
/// This controller handles all contact-related functionality for the portfolio website.
/// It serves contact details to the frontend and processes incoming messages from visitors.
/// </remarks>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ContactController : ControllerBase
{
    private readonly ILogger<ContactController> _logger;
    private readonly EmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly RateLimitingService _rateLimiter;

    /// <summary>
    /// Constructor - ASP.NET Core injects dependencies automatically
    /// </summary>
    /// <param name="logger">Logger for recording controller actions</param>
    /// <param name="emailService">Email service for sending notifications</param>
    /// <param name="configuration">Configuration for retrieving recipient email</param>
    /// <param name="rateLimiter">Rate limiting service to prevent spam</param>
    public ContactController(ILogger<ContactController> logger, EmailService emailService, IConfiguration configuration, RateLimitingService rateLimiter)
    {
        _logger = logger;
        _emailService = emailService;
        _configuration = configuration;
        _rateLimiter = rateLimiter;
    }

    /// <summary>
    /// Gets contact information for the portfolio owner
    /// </summary>
    /// <remarks>
    /// This endpoint returns static contact information that can be displayed
    /// on the frontend or consumed by external applications.
    ///
    /// Sample request:
    ///     GET /api/contact
    ///
    /// </remarks>
    /// <returns>Contact information including name, email, and social media links</returns>
    /// <response code="200">Returns the contact information successfully</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<ContactInfo>), StatusCodes.Status200OK)]
    public IActionResult GetContactInfo()
    {
        _logger.LogInformation("Contact information requested");

        // Create contact info object (in a real app, this might come from a database or configuration)
        var contactInfo = new ContactInfo
        {
            Name = "Faiz Shaikh",
            Summary = "Full-Stack Software Engineer | Cloud-native APIs, .NET, TypeScript, React. Passionate about building scalable, production systems.",
            Email = "faiz.corsair@gmail.com",
            LinkedIn = "http://www.linkedin.com/in/prepreater",
            GitHub = "https://github.com/plasmacat420",
            LeetCode = "https://leetcode.com/u/faiz0308/"
        };

        // Wrap in standardized response format
        var response = ApiResponse<ContactInfo>.Ok(
            contactInfo,
            "Contact information retrieved successfully"
        );

        return Ok(response);
    }

    /// <summary>
    /// Submits a contact form message
    /// </summary>
    /// <remarks>
    /// This endpoint receives messages from visitors who want to get in touch.
    /// Currently logs the message - in production, you'd typically:
    /// - Save to database
    /// - Send email notification
    /// - Add to queue for processing
    ///
    /// Sample request:
    ///     POST /api/contact
    ///     {
    ///         "name": "John Doe",
    ///         "email": "john@example.com",
    ///         "subject": "Project Inquiry",
    ///         "message": "Hi, I'd like to discuss a project..."
    ///     }
    ///
    /// </remarks>
    /// <param name="message">The contact form submission</param>
    /// <returns>Confirmation of message receipt</returns>
    /// <response code="200">Message received successfully</response>
    /// <response code="400">Invalid input data (validation failed)</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitContactMessage([FromBody] ContactMessage message)
    {
        // Rate limiting check - prevent spam (5 requests per hour per IP)
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        if (_rateLimiter.IsRateLimited(clientIp, maxRequests: 5, timeWindowMinutes: 60))
        {
            _logger.LogWarning("Rate limit exceeded for contact form from IP {IP}", clientIp);
            return StatusCode(429, ApiResponse<object>.Error(
                new List<string> { "Too many requests. Please try again later." },
                "Rate limit exceeded"
            ));
        }

        // ModelState automatically validates the model based on Data Annotations
        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid contact form submission");

            // Collect all validation errors
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            return BadRequest(ApiResponse<object>.Error(errors, "Validation failed"));
        }

        // Log the message
        _logger.LogInformation(
            "Contact message received from {Name} ({Email}): {Subject}",
            message.Name,
            message.Email,
            message.Subject
        );

        try
        {
            // Get recipient email from configuration
            var recipientEmail = _configuration["Email:SenderEmail"] ?? "faiz.corsair@gmail.com";

            // Sanitize user inputs to prevent XSS
            var sanitizedName = WebUtility.HtmlEncode(message.Name);
            var sanitizedEmail = WebUtility.HtmlEncode(message.Email);
            var sanitizedSubject = WebUtility.HtmlEncode(message.Subject);
            var sanitizedMessage = WebUtility.HtmlEncode(message.Message).Replace("\n", "<br>");

            // Create HTML email body
            var emailBody = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                        .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }}
                        .info {{ background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }}
                        .message {{ background: white; padding: 15px; margin: 10px 0; border-radius: 4px; }}
                        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2>📬 New Contact Form Submission</h2>
                        </div>
                        <div class='content'>
                            <div class='info'>
                                <p><strong>From:</strong> {sanitizedName}</p>
                                <p><strong>Email:</strong> <a href='mailto:{sanitizedEmail}'>{sanitizedEmail}</a></p>
                                <p><strong>Subject:</strong> {sanitizedSubject}</p>
                                <p><strong>Received:</strong> {message.SubmittedAt:yyyy-MM-dd HH:mm:ss} UTC</p>
                            </div>
                            <div class='message'>
                                <h3>Message:</h3>
                                <p>{sanitizedMessage}</p>
                            </div>
                            <div class='footer'>
                                <p>This email was sent from your portfolio contact form</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>";

            // Send email notification to yourself
            var emailSent = await _emailService.SendEmailAsync(
                recipientEmail,
                $"Contact Form: {message.Subject}",
                emailBody
            );

            if (!emailSent)
            {
                _logger.LogWarning("Failed to send contact notification email");
                // Don't fail the request, just log the issue
            }

            // Send confirmation email to the sender
            var confirmationEmailBody = $@"
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }}
                        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                        .message-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #667eea; }}
                        .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }}
                        .emoji {{ font-size: 48px; margin: 20px 0; }}
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <div class='emoji'>✅</div>
                            <h2>Message Received!</h2>
                        </div>
                        <div class='content'>
                            <p>Hi <strong>{sanitizedName}</strong>,</p>
                            <p>Thank you for reaching out! I've received your message and will get back to you as soon as possible.</p>

                            <div class='message-box'>
                                <p><strong>Your Message:</strong></p>
                                <p><strong>Subject:</strong> {sanitizedSubject}</p>
                                <p>{sanitizedMessage}</p>
                            </div>

                            <p>I typically respond within 24-48 hours. If your inquiry is urgent, feel free to connect with me on <a href='https://linkedin.com/in/prepreater'>LinkedIn</a>.</p>

                            <p>Best regards,<br><strong>Faiz Shaikh</strong><br>Full-Stack Software Engineer</p>

                            <div class='footer'>
                                <p>This is an automated confirmation email from faiz.corsair@gmail.com</p>
                                <p>If you didn't send this message, please ignore this email.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>";

            var confirmationSent = await _emailService.SendEmailAsync(
                message.Email,
                "Thanks for reaching out! Message received",
                confirmationEmailBody
            );

            if (!confirmationSent)
            {
                _logger.LogWarning("Failed to send confirmation email to {Email}", message.Email);
                // Don't fail the request, just log the issue
            }

            // TODO: In production, consider adding:
            // 1. Save message to database
            // 2. Add CAPTCHA verification for additional security

            // Return success response
            var response = ApiResponse<object>.Ok(
                new { receivedAt = message.SubmittedAt },
                "Thank you for your message! I'll get back to you soon."
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing contact form submission");
            return StatusCode(500, ApiResponse<object>.Error(
                new List<string> { "An error occurred while processing your message. Please try again later." },
                "Server error"
            ));
        }
    }
}
