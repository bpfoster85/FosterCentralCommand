namespace FosterCentralCommand.Api.Models;

public class ChecklistItemDefinition
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Logo { get; set; } = "pi pi-check-square";
}

public class ChecklistItemCompletion
{
    public string ItemId { get; set; } = string.Empty;
    public string DateKey { get; set; } = string.Empty; // YYYY-MM-DD in local-family calendar display context
    public DateTime CompletedAtUtc { get; set; } = DateTime.UtcNow;
}
