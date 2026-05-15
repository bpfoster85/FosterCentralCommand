using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosGoalRepository(
    CosmosClient client,
    CosmosDbOptions options,
    FamilyContext familyContext) : IGoalRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.GoalsContainer);

    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Goal>> GetAllAsync()
    {
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Goal>()
            .Where(g => g.FamilyId == familyId)
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
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Goal>()
            .Where(g => g.FamilyId == familyId && g.ProfileId == profileId)
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
            return response.Resource.FamilyId == FamilyId ? response.Resource : null;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Goal> CreateAsync(Goal goal)
    {
        goal.FamilyId = FamilyId;
        var response = await Container.CreateItemAsync(goal, new PartitionKey(goal.Id));
        return response.Resource;
    }

    public async Task<Goal> UpdateAsync(Goal goal)
    {
        if (!await IsOwnedByCurrentFamilyAsync(goal.Id))
            throw new KeyNotFoundException($"Goal {goal.Id} not found for this family.");

        goal.FamilyId = FamilyId;
        var response = await Container.ReplaceItemAsync(goal, goal.Id, new PartitionKey(goal.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        if (!await IsOwnedByCurrentFamilyAsync(id))
            throw new KeyNotFoundException($"Goal {id} not found for this family.");

        await Container.DeleteItemAsync<Goal>(id, new PartitionKey(id));
    }

    private async Task<bool> IsOwnedByCurrentFamilyAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Goal>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
