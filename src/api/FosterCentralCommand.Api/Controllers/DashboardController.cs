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
        return Ok(ToChecklistDto(family, today));
    }

    [HttpGet("checklist/calendar-marks")]
    public ActionResult<DashboardChecklistCalendarMarksDto> GetChecklistCalendarMarks()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var item = family.ChecklistItems.FirstOrDefault();
        if (item is null)
        {
            return Ok(new DashboardChecklistCalendarMarksDto(new Dictionary<string, IReadOnlyList<DashboardChecklistDayMarkDto>>()));
        }

        var safeLogo = NormalizeLogo(item.Logo);
        var marks = family.ChecklistCompletions
            .Where(c => c.ItemId == item.Id)
            .GroupBy(c => c.DateKey)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardChecklistDayMarkDto>)new[]
                {
                    new DashboardChecklistDayMarkDto(item.Id, safeLogo, item.Title)
                });
        return Ok(new DashboardChecklistCalendarMarksDto(marks));
    }

    [HttpPut("checklist")]
    public async Task<ActionResult<DashboardChecklistDto>> SetChecklistItem([FromBody] SetDashboardChecklistItemRequest request)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var title = request.Title.Trim();
        var logo = request.Logo.Trim();
        if (title.Length == 0) return BadRequest("Title is required.");
        if (logo.Length == 0) return BadRequest("Logo is required.");

        // Reuse the existing item's id when possible so the completion history
        // (which references ItemId) stays linked. Trim any extras left over
        // from the old multi-item schema.
        var existing = family.ChecklistItems.FirstOrDefault();
        if (existing is null)
        {
            family.ChecklistItems = [new Models.ChecklistItemDefinition { Title = title, Logo = logo }];
            family.ChecklistCompletions.Clear();
        }
        else
        {
            existing.Title = title;
            existing.Logo = logo;
            family.ChecklistItems = [existing];
            family.ChecklistCompletions.RemoveAll(c => c.ItemId != existing.Id);
        }
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;
        return Ok(ToChecklistDto(updated, DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd")));
    }

    [HttpDelete("checklist")]
    public async Task<ActionResult<DashboardChecklistDto>> ClearChecklistItem()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        family.ChecklistItems.Clear();
        family.ChecklistCompletions.Clear();
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;
        return Ok(ToChecklistDto(updated, DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd")));
    }

    [HttpPost("checklist/toggle")]
    public async Task<ActionResult<DashboardChecklistDto>> ToggleChecklistItem([FromBody] ToggleDashboardChecklistItemRequest request)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        EnsureChecklistCollections(family);
        var item = family.ChecklistItems.FirstOrDefault();
        if (item is null) return NotFound("No checklist item configured.");

        var dateKey = request.DateKey.Trim();
        if (!DateOnly.TryParseExact(dateKey, "yyyy-MM-dd", out _))
        {
            return BadRequest("DateKey must be formatted as yyyy-MM-dd.");
        }

        var existing = family.ChecklistCompletions.FirstOrDefault(c => c.ItemId == item.Id && c.DateKey == dateKey);
        if (existing is null)
        {
            family.ChecklistCompletions.Add(new Models.ChecklistItemCompletion
            {
                ItemId = item.Id,
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
        var item = family.ChecklistItems.FirstOrDefault();
        if (item is null) return new DashboardChecklistDto(null);

        var matches = family.ChecklistCompletions
            .Where(c => c.ItemId == item.Id)
            .OrderByDescending(c => c.CompletedAtUtc)
            .ToList();
        return new DashboardChecklistDto(new DashboardChecklistItemDto(
            item.Id,
            item.Title,
            NormalizeLogo(item.Logo),
            matches.Any(c => c.DateKey == activeDateKey),
            matches.FirstOrDefault()?.CompletedAtUtc));
    }

    private static void EnsureChecklistCollections(Models.Family family)
    {
        family.ChecklistItems ??= [];
        family.ChecklistCompletions ??= [];
    }

    // Older builds saved PrimeIcons class strings (e.g. `pi pi-leaf`, which
    // doesn't actually exist in PrimeIcons and rendered as an empty <i>).
    // We've since switched the picker to Font Awesome. Coerce any legacy
    // `pi pi-*` value to a known-good FA default so existing families render
    // a real glyph without needing to re-pick.
    private static string NormalizeLogo(string logo)
    {
        var trimmed = logo?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return "fa-solid fa-square-check";
        if (trimmed.StartsWith("pi ", StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith("pi-", StringComparison.OrdinalIgnoreCase))
            return "fa-solid fa-square-check";
        return trimmed;
    }
}
