using System.ComponentModel.DataAnnotations;
using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.DTOs;

public record ChoreDto(
    Guid Id,
    string Title,
    string? Description,
    Guid AssignedProfileId,
    int StarValue,
    DateTime DueDate,
    ChoreRecurrence Recurrence,
    List<int> RecurrenceDaysOfWeek,
    DateTime? RecurrenceEndDate,
    List<string> CompletedDates,
    List<string> ApprovedDates,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateChoreRequest(
    [Required][MaxLength(200)] string Title,
    [Required] Guid AssignedProfileId,
    [Required] DateTime DueDate,
    [MaxLength(1000)] string? Description = null,
    int StarValue = 1,
    ChoreRecurrence Recurrence = ChoreRecurrence.None,
    List<int>? RecurrenceDaysOfWeek = null,
    DateTime? RecurrenceEndDate = null
);

public record UpdateChoreRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(1000)] string? Description,
    Guid? AssignedProfileId,
    int? StarValue,
    DateTime? DueDate,
    ChoreRecurrence? Recurrence,
    List<int>? RecurrenceDaysOfWeek,
    DateTime? RecurrenceEndDate
);
