using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController(IProfileRepository profileRepo) : ControllerBase
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

    private static ProfileDto MapToDto(Profile p) => new(
        Guid.Parse(p.Id), p.Name, p.Email, p.Color, p.AvatarUrl, p.CreatedAt, p.UpdatedAt);
}
