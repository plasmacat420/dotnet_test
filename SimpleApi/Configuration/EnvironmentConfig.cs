using DotNetEnv;

namespace SimpleApi.Configuration;

/// <summary>
/// Handles loading and mapping environment variables from .env file to application configuration
/// </summary>
public static class EnvironmentConfig
{
    /// <summary>
    /// Loads .env file and maps environment variables to configuration keys
    /// </summary>
    public static void LoadEnvironmentVariables(WebApplicationBuilder builder)
    {
        // Try to load .env file from parent directory (development)
        var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
        if (File.Exists(envPath))
        {
            Env.Load(envPath);
        }
        // Try loading from current directory (Docker/production)
        else if (File.Exists(".env"))
        {
            Env.Load();
        }

        // Add environment variables to configuration
        builder.Configuration.AddEnvironmentVariables();

        // Map flat environment variables to nested configuration structure
        MapEnvToConfig(builder, "LIVEKIT_URL", "LiveKit:Url");
        MapEnvToConfig(builder, "LIVEKIT_API_KEY", "LiveKit:ApiKey");
        MapEnvToConfig(builder, "LIVEKIT_API_SECRET", "LiveKit:ApiSecret");

        MapEnvToConfig(builder, "EMAIL_SMTP_HOST", "Email:SmtpHost");
        MapEnvToConfig(builder, "EMAIL_SMTP_PORT", "Email:SmtpPort");
        MapEnvToConfig(builder, "EMAIL_SENDER_EMAIL", "Email:SenderEmail");
        MapEnvToConfig(builder, "EMAIL_SENDER_PASSWORD", "Email:SenderPassword");
        MapEnvToConfig(builder, "EMAIL_SENDER_NAME", "Email:SenderName");

        MapEnvToConfig(builder, "GROQ_API_KEY", "Groq:ApiKey");
    }

    private static void MapEnvToConfig(WebApplicationBuilder builder, string envKey, string configKey)
    {
        var value = Environment.GetEnvironmentVariable(envKey);
        if (!string.IsNullOrEmpty(value))
        {
            builder.Configuration[configKey] = value;
        }
    }
}
