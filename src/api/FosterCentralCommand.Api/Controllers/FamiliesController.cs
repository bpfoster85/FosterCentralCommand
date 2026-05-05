using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Security;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Controllers;

/// <summary>
/// Admin endpoints for managing tenants. These endpoints bypass the normal
/// family gate (since callers are setting up a new family) and instead require
/// an <c>X-Admin-Key</c> header that matches the configured
/// <c>Admin:ApiKey</c> value (stored in user-secrets in Development, in Key
/// Vault in Production).
///
/// Returned <see cref="FamilyDto"/> deliberately omits the raw Google
/// credentials — it only signals whether they are configured.
/// </summary>
[ApiController]
[Route("api/families")]
public class FamiliesController(
    IFamilyRepository familyRepo,
    IConfiguration configuration,
    ILogger<FamiliesController> logger) : ControllerBase
{
    private const string AdminKeyHeader = "X-Admin-Key";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FamilyDto>>> GetAll()
    {
        if (!IsAuthorized()) return Unauthorized(new { error = "Admin key required." });
        var families = await familyRepo.GetAllAsync();
        return Ok(families.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyDto>> GetById(Guid id)
    {
        if (!IsAuthorized()) return Unauthorized(new { error = "Admin key required." });
        var family = await familyRepo.GetByIdAsync(id.ToString());
        return family is null ? NotFound() : Ok(MapToDto(family));
    }

    [HttpPost]
    public async Task<ActionResult<FamilyDto>> Create([FromBody] CreateFamilyRequest request)
    {
        if (!IsAuthorized()) return Unauthorized(new { error = "Admin key required." });

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
        if (!IsAuthorized()) return Unauthorized(new { error = "Admin key required." });

        var family = await familyRepo.GetByIdAsync(id.ToString());
        if (family is null) return NotFound();

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
        if (!IsAuthorized()) return Unauthorized(new { error = "Admin key required." });

        var family = await familyRepo.GetByIdAsync(id.ToString());
        if (family is null) return NotFound();
        await familyRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    private bool IsAuthorized()
    {
        var configured = configuration["Admin:ApiKey"];
        if (string.IsNullOrEmpty(configured))
        {
            // No admin key configured at all => refuse rather than allow-by-default.
            logger.LogWarning("Admin endpoint hit but Admin:ApiKey is not configured.");
            return false;
        }
        var provided = Request.Headers[AdminKeyHeader].ToString();
        return !string.IsNullOrEmpty(provided)
            && CryptographicEquals(provided, configured);
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
