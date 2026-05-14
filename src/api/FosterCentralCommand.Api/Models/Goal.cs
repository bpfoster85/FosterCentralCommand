using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public class Goal
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string ProfileId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Emoji { get; set; } = "⭐";

    // Number of stars required to attain this goal
    public int StarTarget { get; set; }

    // Stars the profile has already applied toward this goal
    public int StarsApplied { get; set; }

    public bool IsAchieved { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
