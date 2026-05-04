using FosterCentralCommand.Api.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosProfileRepository(CosmosClient client, CosmosDbOptions options) : IProfileRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ProfilesContainer);

    public async Task<IEnumerable<Profile>> GetAllAsync()
    {
        var query = Container.GetItemLinqQueryable<Profile>()
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
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Profile?> GetByEmailAsync(string email)
    {
        var query = Container.GetItemLinqQueryable<Profile>()
            .Where(p => p.Email == email)
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
        var response = await Container.CreateItemAsync(profile, new PartitionKey(profile.Id));
        return response.Resource;
    }

    public async Task<Profile> UpdateAsync(Profile profile)
    {
        var response = await Container.ReplaceItemAsync(profile, profile.Id, new PartitionKey(profile.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        await Container.DeleteItemAsync<Profile>(id, new PartitionKey(id));
    }
}
