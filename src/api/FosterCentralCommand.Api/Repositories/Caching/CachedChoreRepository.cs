using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Caching;

/// <summary>
/// Read-through / write-bust cache decorator for <see cref="IChoreRepository"/>.
/// Reads are served from <see cref="FamilyCache"/> when present; any write
/// invalidates the entire chores region for the current family.
/// </summary>
public sealed class CachedChoreRepository(
    CosmosChoreRepository inner,
    FamilyCache cache,
    FamilyContext familyContext) : IChoreRepository
{
    private const string Region = CacheRegions.Chores;
    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Chore>> GetAllAsync()
    {
        var familyId = FamilyId;
        var cached = await cache.GetAsync<List<Chore>>(Region, familyId, "all");
        if (cached is not null) return cached;

        var fresh = (await inner.GetAllAsync()).ToList();
        await cache.SetAsync(Region, familyId, "all", fresh);
        return fresh;
    }

    public async Task<IEnumerable<Chore>> GetByProfileIdAsync(string profileId)
    {
        var familyId = FamilyId;
        var suffix = $"profile:{profileId}";
        var cached = await cache.GetAsync<List<Chore>>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = (await inner.GetByProfileIdAsync(profileId)).ToList();
        await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Chore?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        var suffix = $"item:{id}";
        var cached = await cache.GetAsync<Chore>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = await inner.GetByIdAsync(id);
        if (fresh is not null)
            await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Chore> CreateAsync(Chore chore)
    {
        var created = await inner.CreateAsync(chore);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return created;
    }

    public async Task<Chore> UpdateAsync(Chore chore)
    {
        var updated = await inner.UpdateAsync(chore);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return updated;
    }

    public async Task DeleteAsync(string id)
    {
        await inner.DeleteAsync(id);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
    }
}
