using Microsoft.AspNetCore.Mvc;

namespace SimpleApi.Controllers;

/// <summary>
/// Health check controller for monitoring application status
/// </summary>
/// <remarks>
/// Purpose:
/// This controller provides endpoints for monitoring the health of the application.
/// Useful for:
/// - Load balancers to check if the app is running
/// - Monitoring services (like Azure Monitor, AWS CloudWatch)
/// - DevOps teams to verify deployments
/// - Docker/Kubernetes health probes
/// </remarks>
[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Simple health check endpoint
    /// </summary>
    /// <remarks>
    /// Returns a 200 OK response if the application is running and healthy.
    /// This is a basic "liveness" probe - it just confirms the app is up.
    ///
    /// In production, you might also check:
    /// - Database connectivity
    /// - External API availability
    /// - Disk space
    /// - Memory usage
    ///
    /// Sample request:
    ///     GET /health
    ///
    /// </remarks>
    /// <returns>Health status information</returns>
    /// <response code="200">Application is healthy and running</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Check()
    {
        return Ok(new
        {
            status = "Healthy",
            timestamp = DateTime.UtcNow,
            application = "SimpleApi",
            version = "1.0.0"
        });
    }
}
