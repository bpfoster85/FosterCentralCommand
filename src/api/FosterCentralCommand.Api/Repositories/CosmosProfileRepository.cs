using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosProfileRepository(
    CosmosClient client,
    CosmosDbOptions options,
    FamilyContext familyContext) : IProfileRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ProfilesContainer);

    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Profile>> GetAllAsync()
    {
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Profile>()
            .Where(p => p.FamilyId == familyId)
            .OrderBy(p => p.Name)
            .ToFeedIterator();

        var results = new List<Profile>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<Profile?> GetByIdAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Profile>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId ? response.Resource : null;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Profile?> GetByEmailAsync(string email)
    {
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<Profile>()
            .Where(p => p.FamilyId == familyId && p.Email == email)
            .Take(1)
            .ToFeedIterator();

        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            var profile = page.FirstOrDefault();
            if (profile != null) return profile;
        }
        return null;
    }

    public async Task<Profile> CreateAsync(Profile profile)
    {
        profile.FamilyId = FamilyId;
        var response = await Container.CreateItemAsync(profile, new PartitionKey(profile.Id));
        return response.Resource;
    }

    public async Task<Profile> UpdateAsync(Profile profile)
    {
        if (!await IsOwnedByCurrentFamilyAsync(profile.Id))
            throw new KeyNotFoundException($"Profile {profile.Id} not found for this family.");

        profile.FamilyId = FamilyId;
        var response = await Container.ReplaceItemAsync(profile, profile.Id, new PartitionKey(profile.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        if (!await IsOwnedByCurrentFamilyAsync(id))
            throw new KeyNotFoundException($"Profile {id} not found for this family.");

        await Container.DeleteItemAsync<Profile>(id, new PartitionKey(id));
    }

    private async Task<bool> IsOwnedByCurrentFamilyAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<Profile>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
