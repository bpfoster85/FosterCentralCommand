using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IStarLedgerRepository
{
    Task<StarLedgerEntry> AppendAsync(StarLedgerEntry entry);

    /// <summary>
    /// Returns the most recent entries for the current family, ordered by
    /// <see cref="StarLedgerEntry.CreatedAt"/> descending.
    /// </summary>
    Task<IEnumerable<StarLedgerEntry>> GetRecentAsync(int limit);

    /// <summary>
    /// Returns the most recent entries for a specific profile in the current
    /// family, ordered by <see cref="StarLedgerEntry.CreatedAt"/> descending.
    /// </summary>
    Task<IEnumerable<StarLedgerEntry>> GetRecentByProfileAsync(string profileId, int limit);
}
