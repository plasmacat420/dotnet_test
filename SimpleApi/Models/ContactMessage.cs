using System.ComponentModel.DataAnnotations;

namespace SimpleApi.Models;

/// <summary>
/// Represents a contact form submission from a visitor.
/// This DTO captures information when someone reaches out via the contact form.
/// </summary>
/// <remarks>
/// Used by: POST /api/contact endpoint
/// Purpose: Validate and capture visitor messages
/// Validation: Uses Data Annotations for automatic validation
/// </remarks>
public class ContactMessage
{
    /// <summary>
    /// Name of the person sending the message
    /// </summary>
    /// <example>John Doe</example>
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters")]
    public required string Name { get; set; }

    /// <summary>
    /// Email address of the sender (for reply)
    /// </summary>
    /// <example>john.doe@example.com</example>
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email address format")]
    [StringLength(255, ErrorMessage = "Email cannot exceed 255 characters")]
    public required string Email { get; set; }

    /// <summary>
    /// Subject line of the message
    /// </summary>
    /// <example>Collaboration Opportunity</example>
    [Required(ErrorMessage = "Subject is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Subject must be between 3 and 200 characters")]
    public required string Subject { get; set; }

    /// <summary>
    /// The actual message content
    /// </summary>
    /// <example>Hi Faiz, I'd love to discuss a potential project collaboration...</example>
    [Required(ErrorMessage = "Message is required")]
    [StringLength(5000, MinimumLength = 10, ErrorMessage = "Message must be between 10 and 5000 characters")]
    public required string Message { get; set; }

    /// <summary>
    /// Timestamp when the message was submitted
    /// Automatically set on creation
    /// </summary>
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}
