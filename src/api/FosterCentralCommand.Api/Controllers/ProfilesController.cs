using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FosterCentralCommand.Api.Data;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProfileDto>>> GetAll()
    {
        var profiles = await db.Profiles
            .OrderBy(p => p.Name)
            .Select(p => MapToDto(p))
            .ToListAsync();
        return Ok(profiles);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProfileDto>> GetById(Guid id)
    {
        var profile = await db.Profiles.FindAsync(id);
        return profile == null ? NotFound() : Ok(MapToDto(profile));
    }

    [HttpPost]
    public async Task<ActionResult<ProfileDto>> Create([FromBody] CreateProfileRequest request)
    {
        var profile = new Profile
        {
            Name = request.Name,
            Email = request.Email,
            Color = request.Color,
            AvatarUrl = request.AvatarUrl
        };

        db.Profiles.Add(profile);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("A profile with this email already exists.");
        }

        return CreatedAtAction(nameof(GetById), new { id = profile.Id }, MapToDto(profile));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProfileDto>> Update(Guid id, [FromBody] UpdateProfileRequest request)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile == null) return NotFound();

        if (request.Name != null) profile.Name = request.Name;
        if (request.Email != null) profile.Email = request.Email;
        if (request.Color != null) profile.Color = request.Color;
        if (request.AvatarUrl != null) profile.AvatarUrl = request.AvatarUrl;
        profile.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("A profile with this email already exists.");
        }

        return Ok(MapToDto(profile));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var profile = await db.Profiles.FindAsync(id);
        if (profile == null) return NotFound();
        db.Profiles.Remove(profile);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ProfileDto MapToDto(Profile p) => new(
        p.Id, p.Name, p.Email, p.Color, p.AvatarUrl, p.CreatedAt, p.UpdatedAt);
}
