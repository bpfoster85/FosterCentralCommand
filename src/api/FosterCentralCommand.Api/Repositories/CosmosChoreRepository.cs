using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosChoreRepository(
    CosmosClient client,
    CosmosDbOptions options,
    FamilyContext familyContext) : IChoreRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ChoresContainer);

    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Chore>> GetAllAsync()
    {
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Chore>()
            .Where(c => c.FamilyId == familyId)
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
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Chore>()
            .Where(c => c.FamilyId == familyId && c.AssignedProfileId == profileId)
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
            return response.Resource.FamilyId == FamilyId ? response.Resource : null;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Chore> CreateAsync(Chore chore)
    {
        chore.FamilyId = FamilyId;
        var response = await Container.CreateItemAsync(chore, new PartitionKey(chore.Id));
        return response.Resource;
    }

    public async Task<Chore> UpdateAsync(Chore chore)
    {
        if (!await IsOwnedByCurrentFamilyAsync(chore.Id))
            throw new KeyNotFoundException($"Chore {chore.Id} not found for this family.");

        chore.FamilyId = FamilyId;
        var response = await Container.ReplaceItemAsync(chore, chore.Id, new PartitionKey(chore.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        if (!await IsOwnedByCurrentFamilyAsync(id))
            throw new KeyNotFoundException($"Chore {id} not found for this family.");

        await Container.DeleteItemAsync<Chore>(id, new PartitionKey(id));
    }

    private async Task<bool> IsOwnedByCurrentFamilyAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Chore>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
