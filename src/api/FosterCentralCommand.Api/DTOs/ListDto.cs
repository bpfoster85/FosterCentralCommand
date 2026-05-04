using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record ShoppingListDto(
    Guid Id,
    string Title,
    string? Description,
    bool IsFavorite,
    Guid CreatedByProfileId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int ItemCount,
    int CheckedCount
);

public record CreateListRequest(
    [Required][MaxLength(200)] string Title,
    [MaxLength(1000)] string? Description,
    bool IsFavorite = false,
    Guid CreatedByProfileId = default
);

public record UpdateListRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(1000)] string? Description,
    bool? IsFavorite
);

public record ListItemDto(
    Guid Id,
    Guid ListId,
    string Title,
    string? Description,
    bool IsChecked,
    DateTime? StartDate,
    DateTime? EndDate,
    List<Guid> AttendeeProfileIds,
    Guid CreatedByProfileId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateListItemRequest(
    [Required][MaxLength(300)] string Title,
    [MaxLength(2000)] string? Description,
    bool IsChecked = false,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    List<Guid>? AttendeeProfileIds = null,
    Guid CreatedByProfileId = default
);

public record UpdateListItemRequest(
    [MaxLength(300)] string? Title,
    [MaxLength(2000)] string? Description,
    bool? IsChecked,
    DateTime? StartDate,
    DateTime? EndDate,
    List<Guid>? AttendeeProfileIds
);
