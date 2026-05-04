using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public class Profile
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Color { get; set; } = "#4CAF50";

    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
