using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosStarLedgerRepository(
    CosmosClient client,
    CosmosDbOptions options,
    FamilyContext familyContext) : IStarLedgerRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.StarLedgerContainer);

    private string FamilyId => familyContext.CurrentId;

    public async Task<StarLedgerEntry> AppendAsync(StarLedgerEntry entry)
    {
        entry.FamilyId = FamilyId;
        if (string.IsNullOrEmpty(entry.Id)) entry.Id = Guid.NewGuid().ToString();
        if (entry.CreatedAt == default) entry.CreatedAt = DateTime.UtcNow;

        var response = await Container.CreateItemAsync(entry, new PartitionKey(entry.Id));
        return response.Resource;
    }

    public async Task<IEnumerable<StarLedgerEntry>> GetRecentAsync(int limit)
    {
        if (limit <= 0) return [];

        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<StarLedgerEntry>(
                requestOptions: new QueryRequestOptions { MaxItemCount = limit })
            .Where(e => e.FamilyId == familyId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToFeedIterator();

        var results = new List<StarLedgerEntry>(capacity: limit);
        while (query.HasMoreResults && results.Count < limit)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results.Take(limit);
    }

    public async Task<IEnumerable<StarLedgerEntry>> GetRecentByProfileAsync(string profileId, int limit)
    {
        if (limit <= 0 || string.IsNullOrWhiteSpace(profileId)) return [];

        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<StarLedgerEntry>(
                requestOptions: new QueryRequestOptions { MaxItemCount = limit })
            .Where(e => e.FamilyId == familyId && e.ProfileId == profileId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToFeedIterator();

        var results = new List<StarLedgerEntry>(capacity: limit);
        while (query.HasMoreResults && results.Count < limit)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results.Take(limit);
    }
}
