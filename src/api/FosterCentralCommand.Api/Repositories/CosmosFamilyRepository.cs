using FosterCentralCommand.Api.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosFamilyRepository(CosmosClient client, CosmosDbOptions options) : IFamilyRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.FamiliesContainer);

    public async Task<IEnumerable<Family>> GetAllAsync()
    {
        var query = Container.GetItemLinqQueryable<Family>()
            .OrderBy(f => f.Name)
            .ToFeedIterator();

        var results = new List<Family>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<Family?> GetByIdAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Family>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Family?> GetByNameAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var normalized = name.Trim().ToLowerInvariant();

        // Cross-partition query — families have unique names so result is at most one.
        var query = Container.GetItemLinqQueryable<Family>()
            .Where(f => f.NameNormalized == normalized)
            .Take(1)
            .ToFeedIterator();

        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<Family> CreateAsync(Family family)
    {
        var response = await Container.CreateItemAsync(family, new PartitionKey(family.Id));
        return response.Resource;
    }

    public async Task<Family> UpdateAsync(Family family)
    {
        var response = await Container.ReplaceItemAsync(family, family.Id, new PartitionKey(family.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        await Container.DeleteItemAsync<Family>(id, new PartitionKey(id));
    }
}
