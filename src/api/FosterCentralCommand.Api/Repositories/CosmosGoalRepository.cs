using FosterCentralCommand.Api.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosGoalRepository(CosmosClient client, CosmosDbOptions options) : IGoalRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.GoalsContainer);

    public async Task<IEnumerable<Goal>> GetAllAsync()
    {
        var query = Container.GetItemLinqQueryable<Goal>()
            .OrderBy(g => g.Title)
            .ToFeedIterator();

        var results = new List<Goal>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<IEnumerable<Goal>> GetByProfileIdAsync(string profileId)
    {
        var query = Container.GetItemLinqQueryable<Goal>()
            .Where(g => g.ProfileId == profileId)
            .OrderBy(g => g.Title)
            .ToFeedIterator();

        var results = new List<Goal>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<Goal?> GetByIdAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Goal>(id, new PartitionKey(id));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Goal> CreateAsync(Goal goal)
    {
        var response = await Container.CreateItemAsync(goal, new PartitionKey(goal.Id));
        return response.Resource;
    }

    public async Task<Goal> UpdateAsync(Goal goal)
    {
        var response = await Container.ReplaceItemAsync(goal, goal.Id, new PartitionKey(goal.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        await Container.DeleteItemAsync<Goal>(id, new PartitionKey(id));
    }
}
