using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Caching;

/// <summary>
/// Read-through / write-bust cache decorator for <see cref="IShoppingListRepository"/>.
/// Writes invalidate the entire lists region for the current family.
/// </summary>
public sealed class CachedShoppingListRepository(
    CosmosShoppingListRepository inner,
    FamilyCache cache,
    FamilyContext familyContext) : IShoppingListRepository
{
    private const string Region = CacheRegions.Lists;
    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<ShoppingList>> GetAllAsync()
    {
        var familyId = FamilyId;
        var cached = await cache.GetAsync<List<ShoppingList>>(Region, familyId, "all");
        if (cached is not null) return cached;

        var fresh = (await inner.GetAllAsync()).ToList();
        await cache.SetAsync(Region, familyId, "all", fresh);
        return fresh;
    }

    public async Task<ShoppingList?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        var suffix = $"item:{id}";
        var cached = await cache.GetAsync<ShoppingList>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = await inner.GetByIdAsync(id);
        if (fresh is not null)
            await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<ShoppingList> CreateAsync(ShoppingList list)
    {
        var created = await inner.CreateAsync(list);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return created;
    }

    public async Task<ShoppingList> UpdateAsync(ShoppingList list)
    {
        var updated = await inner.UpdateAsync(list);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return updated;
    }

    public async Task DeleteAsync(string id)
    {
        await inner.DeleteAsync(id);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
    }
}
