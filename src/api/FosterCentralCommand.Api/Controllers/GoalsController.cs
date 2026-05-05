using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GoalsController(IGoalRepository goalRepo, IProfileRepository profileRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GoalDto>>> GetAll([FromQuery] Guid? profileId = null)
    {
        var goals = profileId.HasValue
            ? await goalRepo.GetByProfileIdAsync(profileId.Value.ToString())
            : await goalRepo.GetAllAsync();
        return Ok(goals.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GoalDto>> GetById(Guid id)
    {
        var goal = await goalRepo.GetByIdAsync(id.ToString());
        return goal == null ? NotFound() : Ok(MapToDto(goal));
    }

    [HttpPost]
    public async Task<ActionResult<GoalDto>> Create([FromBody] CreateGoalRequest request)
    {
        var profile = await profileRepo.GetByIdAsync(request.ProfileId.ToString());
        if (profile == null) return BadRequest("Assigned profile does not exist.");

        var goal = new Goal
        {
            ProfileId = request.ProfileId.ToString(),
            Title = request.Title,
            Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? "⭐" : request.Emoji,
            StarTarget = request.StarTarget
        };

        var created = await goalRepo.CreateAsync(goal);
        return CreatedAtAction(nameof(GetById), new { id = Guid.Parse(created.Id) }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GoalDto>> Update(Guid id, [FromBody] UpdateGoalRequest request)
    {
        var goal = await goalRepo.GetByIdAsync(id.ToString());
        if (goal == null) return NotFound();

        if (request.Title != null) goal.Title = request.Title;
        if (request.Emoji != null) goal.Emoji = string.IsNullOrWhiteSpace(request.Emoji) ? goal.Emoji : request.Emoji;
        if (request.StarTarget.HasValue) goal.StarTarget = request.StarTarget.Value;
        goal.UpdatedAt = DateTime.UtcNow;

        var updated = await goalRepo.UpdateAsync(goal);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var goal = await goalRepo.GetByIdAsync(id.ToString());
        if (goal == null) return NotFound();
        await goalRepo.DeleteAsync(id.ToString());
        return NoContent();
    }

    private static GoalDto MapToDto(Goal g) => new(
        Guid.TryParse(g.Id, out var gid) ? gid : Guid.Empty,
        Guid.TryParse(g.ProfileId, out var pid) ? pid : Guid.Empty,
        g.Title, g.Emoji, g.StarTarget, g.CreatedAt, g.UpdatedAt);
}
