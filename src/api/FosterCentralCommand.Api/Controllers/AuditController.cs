using Microsoft.AspNetCore.Mvc;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using System.Globalization;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController(
    IStarLedgerRepository ledgerRepo,
    IChoreRepository choreRepo,
    IProfileRepository profileRepo) : ControllerBase
{
    private const int DefaultLimit = 100;
    private const int MaxLimit = 500;
    private const int BackfillDays = 14;

    /// <summary>
    /// Returns the most recent star-ledger entries for the current family,
    /// descending by <see cref="StarLedgerEntry.CreatedAt"/>.
    /// </summary>
    [HttpGet("star-ledger")]
    public async Task<ActionResult<IEnumerable<StarLedgerEntryDto>>> GetStarLedger(
        [FromQuery] int limit = DefaultLimit,
        [FromQuery] Guid? profileId = null)
    {
        var capped = Math.Clamp(limit, 1, MaxLimit);
        var profileIdValue = profileId?.ToString();
        var ledgerEntries = string.IsNullOrWhiteSpace(profileIdValue)
            ? (await ledgerRepo.GetRecentAsync(MaxLimit)).ToList()
            : (await ledgerRepo.GetRecentByProfileAsync(profileIdValue, MaxLimit)).ToList();

        // Backfill recent star awards from chore approvals so the audit view can
        // show useful history even before the ledger feature existed.
        var historicalAwards = await BuildRecentChoreApprovalBackfillAsync(profileIdValue);

        var existingKeys = new HashSet<string>(
            ledgerEntries.Select(e => $"{e.ProfileId}|{e.SourceId}|{e.OccurrenceDate}|{e.Reason}"),
            StringComparer.Ordinal);

        var merged = ledgerEntries
            .Concat(historicalAwards.Where(e =>
                !existingKeys.Contains($"{e.ProfileId}|{e.SourceId}|{e.OccurrenceDate}|{e.Reason}")))
            .OrderByDescending(e => e.CreatedAt)
            .Take(capped)
            .Select(MapToDto);

        return Ok(merged);
    }

    private async Task<List<StarLedgerEntry>> BuildRecentChoreApprovalBackfillAsync(string? profileId)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-(BackfillDays - 1));
        var chores = (await choreRepo.GetAllAsync())
            .Where(c => string.IsNullOrWhiteSpace(profileId) || c.AssignedProfileId == profileId)
            .ToList();
        if (chores.Count == 0) return [];

        var profileById = (await profileRepo.GetAllAsync())
            .ToDictionary(p => p.Id, StringComparer.Ordinal);

        var result = new List<StarLedgerEntry>();
        foreach (var chore in chores)
        {
            foreach (var approvedDate in chore.ApprovedDates)
            {
                if (!DateTime.TryParseExact(
                    approvedDate,
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out var occurrenceDate))
                {
                    continue;
                }

                if (occurrenceDate.Date < startDate) continue;

                profileById.TryGetValue(chore.AssignedProfileId, out var profile);
                result.Add(new StarLedgerEntry
                {
                    Id = $"hist-{chore.Id}-{approvedDate}",
                    ProfileId = chore.AssignedProfileId,
                    ProfileName = profile?.Name ?? "Unknown profile",
                    ProfileColor = profile?.Color ?? "#dbe7e7",
                    Delta = chore.StarValue,
                    Reason = StarLedgerReason.ChoreApproved,
                    SourceType = StarLedgerSourceType.Chore,
                    SourceId = chore.Id,
                    SourceTitle = chore.Title,
                    OccurrenceDate = approvedDate,
                    Note = "Historical backfill",
                    // No historical timestamp exists, so use end-of-day UTC.
                    CreatedAt = DateTime.SpecifyKind(occurrenceDate.Date.AddHours(23).AddMinutes(59), DateTimeKind.Utc),
                });
            }
        }

        return result;
    }

    private static StarLedgerEntryDto MapToDto(StarLedgerEntry e) => new(
        Guid.TryParse(e.Id, out var id) ? id : Guid.Empty,
        Guid.TryParse(e.ProfileId, out var pid) ? pid : Guid.Empty,
        e.ProfileName,
        e.ProfileColor,
        e.Delta,
        e.Reason,
        e.SourceType,
        Guid.TryParse(e.SourceId, out var sid) ? sid : null,
        e.SourceTitle,
        e.OccurrenceDate,
        e.Note,
        e.CreatedAt);
}
