using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IShoppingListRepository
{
    Task<IEnumerable<ShoppingList>> GetAllAsync();
    Task<ShoppingList?> GetByIdAsync(string id);
    Task<ShoppingList> CreateAsync(ShoppingList list);
    Task<ShoppingList> UpdateAsync(ShoppingList list);
    Task DeleteAsync(string id);
}
