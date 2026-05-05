using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChoresController(IChoreRepository choreRepo, IProfileRepository profileRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChoreDto>>> GetAll([FromQuery] Guid? profileId = null)
    {
        var chores = profileId.HasValue
            ? await choreRepo.GetByProfileIdAsync(profileId.Value.ToString())
            : await choreRepo.GetAllAsync();
        return Ok(chores.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ChoreDto>> GetById(Guid id)
    {
        var chore = await choreRepo.GetByIdAsync(id.ToString());
        return chore == null ? NotFound() : Ok(MapToDto(chore));
    }

    [HttpPost]
    public async Task<ActionResult<ChoreDto>> Create([FromBody] CreateChoreRequest request)
    {
        var profile = await profileRepo.GetByIdAsync(request.AssignedProfileId.ToString());
        if (profile == null) return BadRequest("Assigned profile does not exist.");

        var chore = new Chore
        {
            Title = request.Title,
            Description = request.Description,
            AssignedProfileId = request.AssignedProfileId.ToString(),
            StarValue = request.StarValue,
            DueDate = NormalizeDate(request.DueDate),
            Recurrence = request.Recurrence,
            RecurrenceDaysOfWeek = NormalizeDaysOfWeek(request.RecurrenceDaysOfWeek),
            RecurrenceEndDate = request.RecurrenceEndDate.HasValue
                ? NormalizeDate(request.RecurrenceEndDate.Value)
                : null
        };

        var created = await choreRepo.CreateAsync(chore);
        return CreatedAtAction(nameof(GetById), new { id = Guid.Parse(created.Id) }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChoreDto>> Update(Guid id, [FromBody] UpdateChoreRequest request)
    {
        var chore = await choreRepo.GetByIdAsync(id.ToString());
        if (chore == null) return NotFound();

        if (request.Title != null) chore.Title = request.Title;
        if (request.Description != null) chore.Description = request.Description;
        if (request.AssignedProfileId.HasValue)
        {
            var profile = await profileRepo.GetByIdAsync(request.AssignedProfileId.Value.ToString());
            if (profile == null) return BadRequest("Assigned profile does not exist.");
            chore.AssignedProfileId = request.AssignedProfileId.Value.ToString();
        }
        if (request.StarValue.HasValue) chore.StarValue = request.StarValue.Value;
        if (request.DueDate.HasValue) chore.DueDate = NormalizeDate(request.DueDate.Value);
        if (request.Recurrence.HasValue) chore.Recurrence = request.Recurrence.Value;
        if (request.RecurrenceDaysOfWeek != null)
            chore.RecurrenceDaysOfWeek = NormalizeDaysOfWeek(request.RecurrenceDaysOfWeek);
        if (request.RecurrenceEndDate.HasValue)
            chore.RecurrenceEndDate = NormalizeDate(request.RecurrenceEndDate.Value);
        chore.UpdatedAt = DateTime.UtcNow;

        var updated = await choreRepo.UpdateAsync(chore);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var chore = await choreRepo.GetByIdAsync(id.ToString());
        if (chore == null) return NotFound();
        await choreRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    /// <summary>
    /// Toggles whether the assignee has marked this chore's occurrence complete
    /// for the given date. This puts the occurrence in a "pending approval"
    /// state — no stars are awarded until an admin approves it via
    /// <see cref="ToggleApproval"/>. If a previously approved date is unchecked,
    /// the approval is also removed and stars refunded.
    /// </summary>
    [HttpPatch("{id:guid}/complete")]
    public async Task<ActionResult<ChoreDto>> ToggleComplete(Guid id, [FromQuery] DateTime date)
    {
        var chore = await choreRepo.GetByIdAsync(id.ToString());
        if (chore == null) return NotFound();

        var key = NormalizeDate(date).ToString("yyyy-MM-dd");
        var wasCompleted = chore.CompletedDates.Contains(key);

        if (wasCompleted)
        {
            chore.CompletedDates.Remove(key);
            // If admin had already approved this date, refund the stars and remove the approval.
            if (chore.ApprovedDates.Remove(key))
            {
                var profile = await profileRepo.GetByIdAsync(chore.AssignedProfileId);
                if (profile != null)
                {
                    profile.TotalStars = Math.Max(0, profile.TotalStars - chore.StarValue);
                    profile.UpdatedAt = DateTime.UtcNow;
                    await profileRepo.UpdateAsync(profile);
                }
            }
        }
        else
        {
            chore.CompletedDates.Add(key);
        }
        chore.UpdatedAt = DateTime.UtcNow;

        var updated = await choreRepo.UpdateAsync(chore);
        return Ok(MapToDto(updated));
    }

    /// <summary>
    /// Admin endpoint: toggles approval for a completed occurrence on the given
    /// date. Approving awards the chore's StarValue to the assigned profile;
    /// unapproving refunds them (clamped at 0). The date must already be in
    /// <see cref="Chore.CompletedDates"/>.
    /// </summary>
    [HttpPatch("{id:guid}/approve")]
    public async Task<ActionResult<ChoreDto>> ToggleApproval(Guid id, [FromQuery] DateTime date)
    {
        var chore = await choreRepo.GetByIdAsync(id.ToString());
        if (chore == null) return NotFound();

        var key = NormalizeDate(date).ToString("yyyy-MM-dd");
        if (!chore.CompletedDates.Contains(key))
            return BadRequest("That occurrence is not marked complete and cannot be approved.");

        var profile = await profileRepo.GetByIdAsync(chore.AssignedProfileId);
        var wasApproved = chore.ApprovedDates.Contains(key);

        if (wasApproved)
        {
            chore.ApprovedDates.Remove(key);
        }
        else
        {
            chore.ApprovedDates.Add(key);
        }
        chore.UpdatedAt = DateTime.UtcNow;

        if (profile != null)
        {
            var delta = wasApproved ? -chore.StarValue : chore.StarValue;
            profile.TotalStars = Math.Max(0, profile.TotalStars + delta);
            profile.UpdatedAt = DateTime.UtcNow;
            await profileRepo.UpdateAsync(profile);
        }

        var updated = await choreRepo.UpdateAsync(chore);
        return Ok(MapToDto(updated));
    }

    private static DateTime NormalizeDate(DateTime value)
        => DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

    private static List<int> NormalizeDaysOfWeek(IEnumerable<int>? days)
        => days?.Where(d => d >= 0 && d <= 6).Distinct().OrderBy(d => d).ToList() ?? [];

    private static ChoreDto MapToDto(Chore c) => new(
        Guid.TryParse(c.Id, out var cid) ? cid : Guid.Empty,
        c.Title,
        c.Description,
        Guid.TryParse(c.AssignedProfileId, out var apid) ? apid : Guid.Empty,
        c.StarValue,
        c.DueDate,
        c.Recurrence,
        c.RecurrenceDaysOfWeek,
        c.RecurrenceEndDate,
        c.CompletedDates,
        c.ApprovedDates,
        c.CreatedAt,
        c.UpdatedAt);
}
