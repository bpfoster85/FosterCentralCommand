namespace FosterCentralCommand.Api.DTOs;

public record CalendarEventDto(
    string Id,
    string GoogleEventId,
    string Title,
    DateTime Start,
    DateTime End,
    bool AllDay,
    string? Description,
    string? Location,
    List<string> AttendeeEmails,
    string CalendarId,
    DateTime UpdatedAt
);
