using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IStarLedgerRepository"/> backed by the in-memory JSON document.
/// Append-only; reads are scoped to the current family and ordered newest-first.
/// </summary>
public sealed class JsonStarLedgerRepository(JsonDataStore store, FamilyContext familyContext) : IStarLedgerRepository
{
    private string FamilyId => familyContext.CurrentId;

    public Task<StarLedgerEntry> AppendAsync(StarLedgerEntry entry)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            entry.FamilyId = familyId;
            if (string.IsNullOrEmpty(entry.Id)) entry.Id = Guid.NewGuid().ToString();
            if (entry.CreatedAt == default) entry.CreatedAt = DateTime.UtcNow;

            var stored = JsonStoreSerialization.Clone(entry)!;
            doc.StarLedger.Add(stored);
            return stored;
        });
    }

    public Task<IEnumerable<StarLedgerEntry>> GetRecentAsync(int limit)
    {
        if (limit <= 0) return Task.FromResult(Enumerable.Empty<StarLedgerEntry>());

        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<StarLedgerEntry>)doc.StarLedger
            .Where(e => e.FamilyId == familyId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToList());
    }

    public Task<IEnumerable<StarLedgerEntry>> GetRecentByProfileAsync(string profileId, int limit)
    {
        if (limit <= 0 || string.IsNullOrWhiteSpace(profileId))
            return Task.FromResult(Enumerable.Empty<StarLedgerEntry>());

        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<StarLedgerEntry>)doc.StarLedger
            .Where(e => e.FamilyId == familyId && e.ProfileId == profileId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToList());
    }
}
