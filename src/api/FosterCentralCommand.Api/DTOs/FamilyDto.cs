using System.ComponentModel.DataAnnotations;

namespace FosterCentralCommand.Api.DTOs;

public record FamilyDto(
    Guid Id,
    string Name,
    string? GoogleCalendarId,
    bool HasGoogleApiKey,
    bool HasGoogleServiceAccount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateFamilyRequest(
    [Required][MaxLength(120)] string Name,
    string? GoogleCalendarId = null,
    string? GoogleApiKey = null,
    string? GoogleServiceAccountJson = null,
    [MinLength(4)][MaxLength(200)] string? Password = null
);

public record UpdateFamilyRequest(
    [MaxLength(120)] string? Name,
    string? GoogleCalendarId,
    string? GoogleApiKey,
    string? GoogleServiceAccountJson,
    [MinLength(4)][MaxLength(200)] string? Password
);

/// <summary>POST /api/auth/family-login body.</summary>
public record FamilyLoginRequest(
    [Required][MaxLength(120)] string Name,
    [Required][MaxLength(200)] string Password
);

/// <summary>POST /api/auth/admin-login body.</summary>
public record AdminLoginRequest(
    [Required][MaxLength(120)] string Name,
    [Required][MaxLength(200)] string Password
);

/// <summary>POST /api/auth/admin-set-password body.</summary>
public record AdminSetPasswordRequest(
    [Required][MaxLength(120)] string Name,
    [Required][MinLength(4)][MaxLength(200)] string Password
);

/// <summary>Response from a successful family login.</summary>
public record FamilyLoginResponse(Guid FamilyId, string Name);
