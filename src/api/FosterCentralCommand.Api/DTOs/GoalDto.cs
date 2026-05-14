using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record GoalDto(
    Guid Id,
    Guid ProfileId,
    string Title,
    string Emoji,
    int StarTarget,
    int StarsApplied,
    bool IsAchieved,
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

public record SpendStarsRequest(
    [Required] Guid ProfileId,
    [Required][Range(1, int.MaxValue)] int Amount
);
