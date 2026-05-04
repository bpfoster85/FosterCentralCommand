namespace FosterCentralCommand.Api.Models;

public class CalendarEventCache
{
    public string Id { get; set; } = string.Empty;
    public string GoogleEventId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public bool AllDay { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public List<string> AttendeeEmails { get; set; } = [];
    public string CalendarId { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
