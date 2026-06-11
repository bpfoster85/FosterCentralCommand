using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record DadsSwearJarDto(
    int Count,
    DateTime UpdatedAt
);

public record AddDadsSwearJarRequest(
    [Range(1, 1000)] int Amount = 1
);

public record DashboardChecklistItemDto(
    string Id,
    string Title,
    string Logo,
    bool CheckedToday,
    DateTime? LastCompletedAtUtc
);

public record DashboardChecklistDto(
    DashboardChecklistItemDto? Item
);

public record DashboardChecklistDayMarkDto(
    string ItemId,
    string Logo,
    string Title
);

public record DashboardChecklistCalendarMarksDto(
    Dictionary<string, IReadOnlyList<DashboardChecklistDayMarkDto>> DayMarks
);

public record SetDashboardChecklistItemRequest(
    [Required][MaxLength(80)] string Title,
    [Required][MaxLength(80)] string Logo
);

public record ToggleDashboardChecklistItemRequest(
    [Required][RegularExpression(@"^\d{4}-\d{2}-\d{2}$")] string DateKey
);
