using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(
    IFamilyRepository familyRepo,
    FamilyContext familyContext) : ControllerBase
{
    [HttpGet("dads-swear-jar")]
    public ActionResult<DadsSwearJarDto> GetDadsSwearJar()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        return Ok(MapToDto(family));
    }

    [HttpPost("dads-swear-jar/add")]
    public async Task<ActionResult<DadsSwearJarDto>> AddToDadsSwearJar([FromBody] AddDadsSwearJarRequest? request = null)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        var amount = request?.Amount ?? 1;
        if (amount <= 0) return BadRequest("Amount must be greater than 0.");

        family.DadsSwearJarCount += amount;
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;

        return Ok(MapToDto(updated));
    }

    private static DadsSwearJarDto MapToDto(Models.Family family) =>
        new(family.DadsSwearJarCount, family.UpdatedAt);

    [HttpGet("checklist")]
    public ActionResult<DashboardChecklistDto> GetChecklist()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        var itemDtos = family.ChecklistItems
            .Select(item =>
            {
                var matches = family.ChecklistCompletions
                    .Where(c => c.ItemId == item.Id)
                    .OrderByDescending(c => c.CompletedAtUtc)
                    .ToList();
                return new DashboardChecklistItemDto(
                    item.Id,
                    item.Title,
                    item.Logo,
                    matches.Any(c => c.DateKey == today),
                    matches.FirstOrDefault()?.CompletedAtUtc);
            })
            .ToList();
        return Ok(new DashboardChecklistDto(itemDtos));
    }

    [HttpGet("checklist/calendar-marks")]
    public ActionResult<DashboardChecklistCalendarMarksDto> GetChecklistCalendarMarks()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var logosByItemId = family.ChecklistItems.ToDictionary(i => i.Id, i => i.Logo);
        var marks = family.ChecklistCompletions
            .Where(c => logosByItemId.ContainsKey(c.ItemId))
            .GroupBy(c => c.DateKey)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardChecklistDayMarkDto>)g
                    .OrderBy(c => c.CompletedAtUtc)
                    .Select(c => new DashboardChecklistDayMarkDto(c.ItemId, logosByItemId[c.ItemId]))
                    .DistinctBy(x => x.ItemId)
                    .ToList());
        return Ok(new DashboardChecklistCalendarMarksDto(marks));
    }

    [HttpPost("checklist/items")]
    public async Task<ActionResult<DashboardChecklistDto>> AddChecklistItem([FromBody] AddDashboardChecklistItemRequest request)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var title = request.Title.Trim();
        var logo = request.Logo.Trim();
        if (title.Length == 0) return BadRequest("Title is required.");
        if (logo.Length == 0) return BadRequest("Logo is required.");

        family.ChecklistItems.Add(new Models.ChecklistItemDefinition
        {
            Title = title,
            Logo = logo,
        });
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;
        return Ok(ToChecklistDto(updated, DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd")));
    }

    [HttpDelete("checklist/items/{itemId}")]
    public async Task<ActionResult<DashboardChecklistDto>> DeleteChecklistItem(string itemId)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var removed = family.ChecklistItems.RemoveAll(i => i.Id == itemId);
        if (removed == 0) return NotFound();

        family.ChecklistCompletions.RemoveAll(c => c.ItemId == itemId);
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;
        return Ok(ToChecklistDto(updated, DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd")));
    }

    [HttpPost("checklist/items/{itemId}/toggle")]
    public async Task<ActionResult<DashboardChecklistDto>> ToggleChecklistItem(string itemId, [FromBody] ToggleDashboardChecklistItemRequest request)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var item = family.ChecklistItems.FirstOrDefault(i => i.Id == itemId);
        if (item is null) return NotFound();

        var dateKey = request.DateKey.Trim();
        if (!DateOnly.TryParseExact(dateKey, "yyyy-MM-dd", out _))
        {
            return BadRequest("DateKey must be formatted as yyyy-MM-dd.");
        }

        var existing = family.ChecklistCompletions.FirstOrDefault(c => c.ItemId == itemId && c.DateKey == dateKey);
        if (existing is null)
        {
            family.ChecklistCompletions.Add(new Models.ChecklistItemCompletion
            {
                ItemId = itemId,
                DateKey = dateKey,
                CompletedAtUtc = DateTime.UtcNow,
            });
        }
        else
        {
            family.ChecklistCompletions.Remove(existing);
        }

        family.UpdatedAt = DateTime.UtcNow;
        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;
        return Ok(ToChecklistDto(updated, dateKey));
    }

    private static DashboardChecklistDto ToChecklistDto(Models.Family family, string activeDateKey)
    {
        var items = family.ChecklistItems
            .Select(item =>
            {
                var matches = family.ChecklistCompletions
                    .Where(c => c.ItemId == item.Id)
                    .OrderByDescending(c => c.CompletedAtUtc)
                    .ToList();
                return new DashboardChecklistItemDto(
                    item.Id,
                    item.Title,
                    item.Logo,
                    matches.Any(c => c.DateKey == activeDateKey),
                    matches.FirstOrDefault()?.CompletedAtUtc);
            })
            .ToList();
        return new DashboardChecklistDto(items);
    }

    private static void EnsureChecklistCollections(Models.Family family)
    {
        family.ChecklistItems ??= [];
        family.ChecklistCompletions ??= [];
    }

}
