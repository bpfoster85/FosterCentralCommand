using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Security;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Controllers;

/// <summary>
/// Per-family admin endpoints. Auth is now scoped to a single family: the
/// caller must include both <c>X-Family-Id</c> and <c>X-Admin-Key</c>, where
/// <c>X-Admin-Key</c> equals the family's <c>AdminPasswordHash</c> (the value
/// echoed back from <c>POST /api/auth/admin-login</c>).
///
/// All read/update/delete operations are scoped to that one family. Create is
/// allowed when the caller is admin-authed for any existing family, or when
/// no families exist yet (initial bootstrap).
///
/// Returned <see cref="FamilyDto"/> deliberately omits credentials and the
/// admin password hash — it only signals whether they are configured.
/// </summary>
[ApiController]
[Route("api/families")]
public class FamiliesController(
    IFamilyRepository familyRepo,
    ILogger<FamiliesController> logger) : ControllerBase
{
    private const string FamilyIdHeader = "X-Family-Id";
    private const string AdminKeyHeader = "X-Admin-Key";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FamilyDto>>> GetAll()
    {
        var caller = await GetAuthorizedFamilyAsync();
        if (caller is null) return Unauthorized(new { error = "Admin auth required." });

        // Per-family admin: only return the caller's own family.
        return Ok(new[] { MapToDto(caller) });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyDto>> GetById(Guid id)
    {
        var caller = await GetAuthorizedFamilyAsync();
        if (caller is null) return Unauthorized(new { error = "Admin auth required." });

        if (!string.Equals(caller.Id, id.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }
        return Ok(MapToDto(caller));
    }

    [HttpPost]
    public async Task<ActionResult<FamilyDto>> Create([FromBody] CreateFamilyRequest request)
    {
        // Allow creation when (a) no families exist yet (bootstrap) or
        // (b) the caller is admin-authed for any existing family.
        var anyExisting = (await familyRepo.GetAllAsync()).Any();
        if (anyExisting)
        {
            var caller = await GetAuthorizedFamilyAsync();
            if (caller is null) return Unauthorized(new { error = "Admin auth required." });
        }

        var name = request.Name.Trim();
        var existing = await familyRepo.GetByNameAsync(name);
        if (existing != null)
        {
            return Conflict(new { error = "A family with that name already exists." });
        }

        var family = new Family
        {
            Name = name,
            NameNormalized = name.ToLowerInvariant(),
            GoogleCalendarId = NullIfEmpty(request.GoogleCalendarId),
            GoogleApiKey = NullIfEmpty(request.GoogleApiKey),
            GoogleServiceAccountJson = NullIfEmpty(request.GoogleServiceAccountJson),
            PasswordHash = string.IsNullOrEmpty(request.Password) ? null : PasswordHasher.Hash(request.Password),
        };

        var created = await familyRepo.CreateAsync(family);
        logger.LogInformation("Created family {FamilyId} ({Name})", created.Id, created.Name);
        return CreatedAtAction(nameof(GetById), new { id = Guid.Parse(created.Id) }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyDto>> Update(Guid id, [FromBody] UpdateFamilyRequest request)
    {
        var caller = await GetAuthorizedFamilyAsync();
        if (caller is null) return Unauthorized(new { error = "Admin auth required." });

        if (!string.Equals(caller.Id, id.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var family = caller;
        if (request.Name != null)
        {
            family.Name = request.Name.Trim();
            family.NameNormalized = family.Name.ToLowerInvariant();
        }
        if (request.GoogleCalendarId != null) family.GoogleCalendarId = NullIfEmpty(request.GoogleCalendarId);
        if (request.GoogleApiKey != null) family.GoogleApiKey = NullIfEmpty(request.GoogleApiKey);
        if (request.GoogleServiceAccountJson != null) family.GoogleServiceAccountJson = NullIfEmpty(request.GoogleServiceAccountJson);
        if (!string.IsNullOrEmpty(request.Password)) family.PasswordHash = PasswordHasher.Hash(request.Password);
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var caller = await GetAuthorizedFamilyAsync();
        if (caller is null) return Unauthorized(new { error = "Admin auth required." });

        if (!string.Equals(caller.Id, id.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }
        await familyRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    /// <summary>
    /// Returns the caller's family iff <c>X-Family-Id</c> identifies a real
    /// family AND <c>X-Admin-Key</c> matches that family's
    /// <c>AdminPasswordHash</c> via constant-time comparison.
    /// </summary>
    private async Task<Family?> GetAuthorizedFamilyAsync()
    {
        var familyId = Request.Headers[FamilyIdHeader].ToString().Trim();
        var adminKey = Request.Headers[AdminKeyHeader].ToString();
        if (string.IsNullOrEmpty(familyId) || string.IsNullOrEmpty(adminKey))
        {
            return null;
        }

        var family = await familyRepo.GetByIdAsync(familyId);
        if (family is null || string.IsNullOrEmpty(family.AdminPasswordHash))
        {
            return null;
        }

        return CryptographicEquals(adminKey, family.AdminPasswordHash) ? family : null;
    }

    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var diff = 0;
        for (var i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
        return diff == 0;
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static FamilyDto MapToDto(Family f) => new(
        Id: Guid.Parse(f.Id),
        Name: f.Name,
        GoogleCalendarId: f.GoogleCalendarId,
        HasGoogleApiKey: !string.IsNullOrEmpty(f.GoogleApiKey),
        HasGoogleServiceAccount: !string.IsNullOrEmpty(f.GoogleServiceAccountJson),
        CreatedAt: f.CreatedAt,
        UpdatedAt: f.UpdatedAt
    );
}
