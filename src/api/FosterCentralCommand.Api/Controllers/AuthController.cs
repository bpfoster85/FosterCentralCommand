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
/// subsequent request.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    IFamilyRepository familyRepo,
    IConfiguration configuration,
    ILogger<AuthController> logger) : ControllerBase
{
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

    /// <summary>Verify the admin password (the configured Admin:ApiKey).</summary>
    [HttpPost("admin-login")]
    public IActionResult AdminLogin([FromBody] AdminLoginRequest request)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var configured = configuration["Admin:ApiKey"];
        if (string.IsNullOrEmpty(configured))
        {
            logger.LogWarning("Admin login attempted but Admin:ApiKey is not configured.");
            return Unauthorized(new { error = "Admin login is not available." });
        }

        if (!CryptographicEquals(request.Password, configured))
        {
            logger.LogWarning("Failed admin login attempt.");
            return Unauthorized(new { error = "Invalid admin password." });
        }

        // Echo the key back so the frontend can store it and send X-Admin-Key
        // on subsequent admin calls. (No JWT/session for now — keeping it simple.)
        return Ok(new { adminKey = configured });
    }

    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var diff = 0;
        for (var i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
        return diff == 0;
    }
}
