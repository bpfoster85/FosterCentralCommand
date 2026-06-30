using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IShoppingListRepository"/> backed by the in-memory JSON document.
/// Scoped to the current family via <see cref="FamilyContext"/>.
/// </summary>
public sealed class JsonShoppingListRepository(JsonDataStore store, FamilyContext familyContext) : IShoppingListRepository
{
    private string FamilyId => familyContext.CurrentId;

    public Task<IEnumerable<ShoppingList>> GetAllAsync()
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<ShoppingList>)doc.ShoppingLists
            .Where(l => l.FamilyId == familyId)
            .OrderBy(l => l.Title)
            .ToList());
    }

    public Task<ShoppingList?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc =>
            doc.ShoppingLists.FirstOrDefault(l => l.Id == id && l.FamilyId == familyId));
    }

    public Task<ShoppingList> CreateAsync(ShoppingList list)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            list.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(list)!;
            doc.ShoppingLists.Add(stored);
            return stored;
        });
    }

    public Task<ShoppingList> UpdateAsync(ShoppingList list)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.ShoppingLists.FindIndex(l => l.Id == list.Id && l.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"ShoppingList {list.Id} not found for this family.");

            list.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(list)!;
            doc.ShoppingLists[index] = stored;
            return stored;
        });
    }

    public Task DeleteAsync(string id)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.ShoppingLists.FindIndex(l => l.Id == id && l.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"ShoppingList {id} not found for this family.");

            doc.ShoppingLists.RemoveAt(index);
        });
    }
}
