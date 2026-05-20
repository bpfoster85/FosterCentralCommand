using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController(
    IProfileRepository profileRepo,
    IStarLedgerRepository ledgerRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProfileDto>>> GetAll()
    {
        var profiles = await profileRepo.GetAllAsync();
        return Ok(profiles.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProfileDto>> GetById(Guid id)
    {
        var profile = await profileRepo.GetByIdAsync(id.ToString());
        return profile == null ? NotFound() : Ok(MapToDto(profile));
    }

    [HttpPost]
    public async Task<ActionResult<ProfileDto>> Create([FromBody] CreateProfileRequest request)
    {
        var existing = await profileRepo.GetByEmailAsync(request.Email);
        if (existing != null)
            return Conflict("A profile with this email already exists.");

        var profile = new Profile
        {
            Name = request.Name,
            Email = request.Email,
            Color = request.Color,
            AvatarUrl = request.AvatarUrl
        };

        var created = await profileRepo.CreateAsync(profile);
        return CreatedAtAction(nameof(GetById), new { id = Guid.Parse(created.Id) }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProfileDto>> Update(Guid id, [FromBody] UpdateProfileRequest request)
    {
        var profile = await profileRepo.GetByIdAsync(id.ToString());
        if (profile == null) return NotFound();

        if (request.Name != null) profile.Name = request.Name;
        if (request.Email != null)
        {
            var existing = await profileRepo.GetByEmailAsync(request.Email);
            if (existing != null && existing.Id != profile.Id)
                return Conflict("A profile with this email already exists.");
            profile.Email = request.Email;
        }
        if (request.Color != null) profile.Color = request.Color;
        if (request.AvatarUrl != null) profile.AvatarUrl = request.AvatarUrl;
        profile.UpdatedAt = DateTime.UtcNow;

        var updated = await profileRepo.UpdateAsync(profile);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var profile = await profileRepo.GetByIdAsync(id.ToString());
        if (profile == null) return NotFound();
        await profileRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    /// <summary>
    /// Admin endpoint: manually add or subtract stars from a profile's running
    /// total. Negative deltas are clamped so the total never goes below zero.
    /// </summary>
    [HttpPost("{id:guid}/stars")]
    public async Task<ActionResult<ProfileDto>> AdjustStars(Guid id, [FromBody] AdjustStarsRequest request)
    {
        var profile = await profileRepo.GetByIdAsync(id.ToString());
        if (profile == null) return NotFound();

        // Clamp negative deltas so we don't overdraw — record the actual change applied.
        var before = profile.TotalStars;
        profile.TotalStars = Math.Max(0, profile.TotalStars + request.Delta);
        var applied = profile.TotalStars - before;
        profile.UpdatedAt = DateTime.UtcNow;
        var updated = await profileRepo.UpdateAsync(profile);

        if (applied != 0)
        {
            var isCustomAward = applied > 0;
            await ledgerRepo.AppendAsync(new StarLedgerEntry
            {
                ProfileId = profile.Id,
                ProfileName = profile.Name,
                ProfileColor = profile.Color,
                Delta = applied,
                Reason = isCustomAward ? StarLedgerReason.CustomAward : StarLedgerReason.ManualAdjustment,
                SourceType = StarLedgerSourceType.Manual,
                SourceTitle = isCustomAward ? "Custom star award" : "Manual adjustment",
            });
        }

        return Ok(MapToDto(updated));
    }

    private static ProfileDto MapToDto(Profile p) => new(
        Guid.TryParse(p.Id, out var pid) ? pid : Guid.Empty,
        p.Name, p.Email, p.Color, p.AvatarUrl, p.TotalStars, p.CreatedAt, p.UpdatedAt);
}
