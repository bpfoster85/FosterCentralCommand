using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record GoalDto(
    Guid Id,
    Guid ProfileId,
    string Title,
    string Emoji,
    int StarTarget,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateGoalRequest(
    [Required] Guid ProfileId,
    [Required][MaxLength(200)] string Title,
    [MaxLength(8)] string Emoji = "⭐",
    int StarTarget = 0
);

public record UpdateGoalRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(8)] string? Emoji,
    int? StarTarget
);
