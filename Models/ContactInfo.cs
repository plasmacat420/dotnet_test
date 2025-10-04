namespace SimpleApi.Models;

/// <summary>
/// Represents contact information for the portfolio owner.
/// This DTO (Data Transfer Object) is used to return contact details via the API.
/// </summary>
/// <remarks>
/// Used by: GET /api/contact endpoint
/// Purpose: Provides structured contact information to frontend or external consumers
/// </remarks>
public class ContactInfo
{
    /// <summary>
    /// Full name of the contact person
    /// </summary>
    /// <example>Faiz Shaikh</example>
    public required string Name { get; set; }

    /// <summary>
    /// Professional summary or bio
    /// </summary>
    /// <example>Full-Stack Software Engineer | Cloud-native APIs, .NET, TypeScript, React</example>
    public required string Summary { get; set; }

    /// <summary>
    /// Primary email address for contact
    /// </summary>
    /// <example>faiz.corsair@gmail.com</example>
    public required string Email { get; set; }

    /// <summary>
    /// LinkedIn profile URL
    /// </summary>
    /// <example>http://www.linkedin.com/in/prepreater</example>
    public string? LinkedIn { get; set; }

    /// <summary>
    /// GitHub profile URL
    /// </summary>
    /// <example>https://github.com/plasmacat420</example>
    public string? GitHub { get; set; }

    /// <summary>
    /// LeetCode profile URL
    /// </summary>
    /// <example>https://leetcode.com/u/faiz0308/</example>
    public string? LeetCode { get; set; }
}
