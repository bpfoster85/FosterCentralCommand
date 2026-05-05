using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record ProfileDto(
    Guid Id,
    string Name,
    string Email,
    string Color,
    string? AvatarUrl,
    int TotalStars,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProfileRequest(
    [Required][MaxLength(100)] string Name,
    [Required][EmailAddress][MaxLength(200)] string Email,
    [MaxLength(20)] string Color = "#4CAF50",
    string? AvatarUrl = null
);

public record UpdateProfileRequest(
    [MaxLength(100)] string? Name,
    [EmailAddress][MaxLength(200)] string? Email,
    [MaxLength(20)] string? Color,
    string? AvatarUrl
);

public record AdjustStarsRequest(
    [Required] int Delta
);
