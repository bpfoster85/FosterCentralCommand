using System.Text.Json.Serialization;

namespace FosterCentralCommand.Api.Models;

public class ShoppingList
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsFavorite { get; set; }

    public string CreatedByProfileId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Embedded items
    public List<ListItem> Items { get; set; } = [];
}
