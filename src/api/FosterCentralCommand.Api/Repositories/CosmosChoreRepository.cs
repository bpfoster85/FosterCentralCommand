using FosterCentralCommand.Api.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosChoreRepository(CosmosClient client, CosmosDbOptions options) : IChoreRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ChoresContainer);

    public async Task<IEnumerable<Chore>> GetAllAsync()
    {
        var query = Container.GetItemLinqQueryable<Chore>()
            .OrderBy(c => c.DueDate)
            .ToFeedIterator();

        var results = new List<Chore>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<IEnumerable<Chore>> GetByProfileIdAsync(string profileId)
    {
        var query = Container.GetItemLinqQueryable<Chore>()
            .Where(c => c.AssignedProfileId == profileId)
            .OrderBy(c => c.DueDate)
            .ToFeedIterator();

        var results = new List<Chore>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<Chore?> GetByIdAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Chore>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Chore> CreateAsync(Chore chore)
    {
        var response = await Container.CreateItemAsync(chore, new PartitionKey(chore.Id));
        return response.Resource;
    }

    public async Task<Chore> UpdateAsync(Chore chore)
    {
        var response = await Container.ReplaceItemAsync(chore, chore.Id, new PartitionKey(chore.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        await Container.DeleteItemAsync<Chore>(id, new PartitionKey(id));
    }
}
