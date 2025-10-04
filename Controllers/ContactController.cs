using Microsoft.AspNetCore.Mvc;
using SimpleApi.Models;

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

    /// <summary>
    /// Constructor - ASP.NET Core injects dependencies automatically
    /// </summary>
    /// <param name="logger">Logger for recording controller actions</param>
    public ContactController(ILogger<ContactController> logger)
    {
        _logger = logger;
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
    public IActionResult SubmitContactMessage([FromBody] ContactMessage message)
    {
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

        // Log the message (in production, you'd save to database and/or send email)
        _logger.LogInformation(
            "Contact message received from {Name} ({Email}): {Subject}",
            message.Name,
            message.Email,
            message.Subject
        );

        // TODO: In production, add these features:
        // 1. Save message to database
        // 2. Send email notification to portfolio owner
        // 3. Send confirmation email to sender
        // 4. Add rate limiting to prevent spam
        // 5. Add CAPTCHA verification

        // Return success response
        var response = ApiResponse<object>.Ok(
            new { receivedAt = message.SubmittedAt },
            "Thank you for your message! I'll get back to you soon."
        );

        return Ok(response);
    }
}
