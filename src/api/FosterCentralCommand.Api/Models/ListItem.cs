using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public class ListItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string ListId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsChecked { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string CreatedByProfileId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Embedded attendee profile IDs (replaces the ListItemAttendee join table)
    public List<string> AttendeeProfileIds { get; set; } = [];
}
