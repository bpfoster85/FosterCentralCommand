using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Security;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Controllers;

/// <summary>
/// Public login endpoints. Bypassed by <c>FamilyContextMiddleware</c> so that
/// users can authenticate before their <c>X-Family-Id</c> is known.
///
/// On success the family-login endpoint returns the family id which the
/// frontend stores in localStorage and replays as <c>X-Family-Id</c> on every
/// subsequent request. Admin endpoints similarly return an opaque admin key
/// (the family's hashed admin password) for replay as <c>X-Admin-Key</c>.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    IFamilyRepository familyRepo,
    ILogger<AuthController> logger) : ControllerBase
{
    private const string FamilyIdHeader = "X-Family-Id";

    /// <summary>Verify a family name + password and return the family id.</summary>
    [HttpPost("family-login")]
    public async Task<ActionResult<FamilyLoginResponse>> FamilyLogin([FromBody] FamilyLoginRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var family = await familyRepo.GetByNameAsync(request.Name);
        // Run verify either way to keep timing similar between
        // "no such family" and "wrong password" paths.
        var ok = PasswordHasher.Verify(request.Password, family?.PasswordHash);

        if (family is null || !ok)
        {
            logger.LogWarning("Failed family login for name {Name}", request.Name);
            return Unauthorized(new { error = "Invalid family name or password." });
        }

        if (string.IsNullOrEmpty(family.PasswordHash))
        {
            // Defensive: a family with no password set should never log in.
            return Unauthorized(new { error = "This family has no password configured." });
        }

        return Ok(new FamilyLoginResponse(Guid.Parse(family.Id), family.Name));
    }

    /// <summary>
    /// Verify a family name + that family's admin password (stored hashed in
    /// Cosmos as <c>Family.AdminPasswordHash</c>). When no admin password is
    /// set yet, returns 409 with <c>needsSetup: true</c> so the client can
    /// prompt the family-authed user to set one via <see cref="AdminSetPassword"/>.
    /// </summary>
    [HttpPost("admin-login")]
    public async Task<IActionResult> AdminLogin([FromBody] AdminLoginRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var family = await familyRepo.GetByNameAsync(request.Name);
        // Run verify even when family is null to keep timing similar.
        var ok = PasswordHasher.Verify(request.Password, family?.AdminPasswordHash);

        if (family is null)
        {
            logger.LogWarning("Failed admin login for name {Name}", request.Name);
            return Unauthorized(new { error = "Invalid family name or admin password." });
        }

        if (string.IsNullOrEmpty(family.AdminPasswordHash))
        {
            // Tell the client to switch to set-up mode. Caller must be
            // family-authed (X-Family-Id matches) to actually set it.
            return Conflict(new
            {
                error = "No admin password is set for this family yet.",
                needsSetup = true,
                familyId = Guid.Parse(family.Id),
                name = family.Name,
            });
        }

        if (!ok)
        {
            logger.LogWarning("Failed admin login for name {Name}", request.Name);
            return Unauthorized(new { error = "Invalid family name or admin password." });
        }

        return Ok(new
        {
            adminKey = family.AdminPasswordHash,
            familyId = Guid.Parse(family.Id),
            name = family.Name,
        });
    }

    /// <summary>
    /// Set the admin password for a family that does not yet have one. The
    /// caller must be family-authed for the same family (X-Family-Id matches).
    /// Once set, the password can only be rotated through an authenticated
    /// admin path (not implemented here).
    /// </summary>
    [HttpPost("admin-set-password")]
    public async Task<IActionResult> AdminSetPassword([FromBody] AdminSetPasswordRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var family = await familyRepo.GetByNameAsync(request.Name);
        if (family is null)
        {
            return Unauthorized(new { error = "Unknown family." });
        }

        var providedFamilyId = Request.Headers[FamilyIdHeader].ToString();
        if (string.IsNullOrEmpty(providedFamilyId)
            || !string.Equals(providedFamilyId.Trim(), family.Id, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Admin-set-password for {Name} rejected: caller not family-authed.", request.Name);
            return Unauthorized(new { error = "You must be signed in to this family to set its admin password." });
        }

        if (!string.IsNullOrEmpty(family.AdminPasswordHash))
        {
            return Conflict(new { error = "This family already has an admin password set." });
        }

        family.AdminPasswordHash = PasswordHasher.Hash(request.Password);
        family.UpdatedAt = DateTime.UtcNow;
        var updated = await familyRepo.UpdateAsync(family);

        logger.LogInformation("Admin password set for family {FamilyId} ({Name})", updated.Id, updated.Name);

        return Ok(new
        {
            adminKey = updated.AdminPasswordHash,
            familyId = Guid.Parse(updated.Id),
            name = updated.Name,
        });
    }
}
