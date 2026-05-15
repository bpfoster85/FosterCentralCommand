using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosShoppingListRepository(
    CosmosClient client,
    CosmosDbOptions options,
    FamilyContext familyContext) : IShoppingListRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ShoppingListsContainer);

    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<ShoppingList>> GetAllAsync()
    {
        var familyId = FamilyId;
        var query = Container.GetItemLinqQueryable<ShoppingList>()
            .Where(l => l.FamilyId == familyId)
            .OrderBy(l => l.Title)
            .ToFeedIterator();

        var results = new List<ShoppingList>();
        while (query.HasMoreResults)
        {
            var page = await query.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<ShoppingList?> GetByIdAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<ShoppingList>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId ? response.Resource : null;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<ShoppingList> CreateAsync(ShoppingList list)
    {
        list.FamilyId = FamilyId;
        var response = await Container.CreateItemAsync(list, new PartitionKey(list.Id));
        return response.Resource;
    }

    public async Task<ShoppingList> UpdateAsync(ShoppingList list)
    {
        if (!await IsOwnedByCurrentFamilyAsync(list.Id))
            throw new KeyNotFoundException($"ShoppingList {list.Id} not found for this family.");

        list.FamilyId = FamilyId;
        var response = await Container.ReplaceItemAsync(list, list.Id, new PartitionKey(list.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        if (!await IsOwnedByCurrentFamilyAsync(id))
            throw new KeyNotFoundException($"ShoppingList {id} not found for this family.");

        await Container.DeleteItemAsync<ShoppingList>(id, new PartitionKey(id));
    }

    private async Task<bool> IsOwnedByCurrentFamilyAsync(string id)
    {
        try
        {
            var response = await Container.ReadItemAsync<ShoppingList>(id, new PartitionKey(id));
            return response.Resource.FamilyId == FamilyId;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
