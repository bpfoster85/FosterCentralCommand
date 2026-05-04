using FosterCentralCommand.Api.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;

namespace FosterCentralCommand.Api.Repositories;

public class CosmosShoppingListRepository(CosmosClient client, CosmosDbOptions options) : IShoppingListRepository
{
    private Container Container => client.GetContainer(options.DatabaseName, options.ShoppingListsContainer);

    public async Task<IEnumerable<ShoppingList>> GetAllAsync()
    {
        var query = Container.GetItemLinqQueryable<ShoppingList>()
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
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<ShoppingList> CreateAsync(ShoppingList list)
    {
        var response = await Container.CreateItemAsync(list, new PartitionKey(list.Id));
        return response.Resource;
    }

    public async Task<ShoppingList> UpdateAsync(ShoppingList list)
    {
        var response = await Container.ReplaceItemAsync(list, list.Id, new PartitionKey(list.Id));
        return response.Resource;
    }

    public async Task DeleteAsync(string id)
    {
        await Container.DeleteItemAsync<ShoppingList>(id, new PartitionKey(id));
    }
}
