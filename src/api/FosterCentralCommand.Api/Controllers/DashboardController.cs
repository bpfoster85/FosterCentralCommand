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
    private const string WaterPeppersTitle = "Water Peppers";
    private const string WaterPeppersLogo = "pi pi-leaf";

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
    public async Task<ActionResult<DashboardChecklistDto>> GetChecklist()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        if (EnsureChecklistCollections(family))
        {
            family.UpdatedAt = DateTime.UtcNow;
            family = await familyRepo.UpdateAsync(family);
            familyContext.Current = family;
        }
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
    public async Task<ActionResult<DashboardChecklistCalendarMarksDto>> GetChecklistCalendarMarks()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        if (EnsureChecklistCollections(family))
        {
            family.UpdatedAt = DateTime.UtcNow;
            family = await familyRepo.UpdateAsync(family);
            familyContext.Current = family;
        }
        var itemsById = family.ChecklistItems.ToDictionary(i => i.Id, i => i);
        var marks = family.ChecklistCompletions
            .Where(c => itemsById.ContainsKey(c.ItemId))
            .GroupBy(c => c.DateKey)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<DashboardChecklistDayMarkDto>)g
                    .OrderBy(c => c.CompletedAtUtc)
                    .Select(c => new DashboardChecklistDayMarkDto(c.ItemId, itemsById[c.ItemId].Logo, itemsById[c.ItemId].Title))
                    .DistinctBy(x => x.ItemId)
                    .ToList());
        return Ok(new DashboardChecklistCalendarMarksDto(marks));
    }

    [HttpPost("checklist/items")]
    public ActionResult<DashboardChecklistDto> AddChecklistItem([FromBody] AddDashboardChecklistItemRequest request)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        return BadRequest("Checklist items are fixed and cannot be added.");
    }

    [HttpDelete("checklist/items/{itemId}")]
    public ActionResult<DashboardChecklistDto> DeleteChecklistItem(string itemId)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        return BadRequest("Checklist items are fixed and cannot be deleted.");
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

    private static bool EnsureChecklistCollections(Models.Family family)
    {
        var hadChecklistItems = family.ChecklistItems is not null;
        var hadChecklistCompletions = family.ChecklistCompletions is not null;
        family.ChecklistItems ??= [];
        family.ChecklistCompletions ??= [];

        var waterPeppersItem = family.ChecklistItems
            .FirstOrDefault(i =>
                i.Title is not null
                && string.Equals(i.Title.Trim(), WaterPeppersTitle, StringComparison.OrdinalIgnoreCase))
            ?? family.ChecklistItems.FirstOrDefault();

        var canonicalItemId = waterPeppersItem?.Id;
        if (string.IsNullOrWhiteSpace(canonicalItemId))
        {
            canonicalItemId = Guid.NewGuid().ToString();
        }

        List<Models.ChecklistItemDefinition> normalizedItems =
        [
            new Models.ChecklistItemDefinition
            {
                Id = canonicalItemId,
                Title = WaterPeppersTitle,
                Logo = WaterPeppersLogo,
            }
        ];

        var normalizedCompletions = family.ChecklistCompletions
            .Select(c => new Models.ChecklistItemCompletion
            {
                ItemId = canonicalItemId,
                DateKey = c.DateKey,
                CompletedAtUtc = c.CompletedAtUtc,
            })
            .GroupBy(c => c.DateKey)
            .Select(g => g.OrderBy(c => c.CompletedAtUtc).First())
            .ToList();

        var itemsChanged = !hadChecklistItems
            || family.ChecklistItems.Count != 1
            || family.ChecklistItems[0].Id != canonicalItemId
            || !string.Equals(family.ChecklistItems[0].Title, WaterPeppersTitle, StringComparison.Ordinal)
            || !string.Equals(family.ChecklistItems[0].Logo, WaterPeppersLogo, StringComparison.Ordinal);

        var completionsChanged = !hadChecklistCompletions
            || family.ChecklistCompletions.Count != normalizedCompletions.Count
            || family.ChecklistCompletions
                .OrderBy(c => c.DateKey).ThenBy(c => c.CompletedAtUtc)
                .Zip(normalizedCompletions.OrderBy(c => c.DateKey).ThenBy(c => c.CompletedAtUtc))
                .Any(pair =>
                    pair.First.ItemId != pair.Second.ItemId
                    || pair.First.DateKey != pair.Second.DateKey
                    || pair.First.CompletedAtUtc != pair.Second.CompletedAtUtc);

        family.ChecklistItems = normalizedItems;
        family.ChecklistCompletions = normalizedCompletions;
        return itemsChanged || completionsChanged;
    }

}
