using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Caching;

/// <summary>
/// Read-through / write-bust cache decorator for <see cref="IGoalRepository"/>.
/// Writes invalidate the entire goals region for the current family.
/// </summary>
public sealed class CachedGoalRepository(
    CosmosGoalRepository inner,
    FamilyCache cache,
    FamilyContext familyContext) : IGoalRepository
{
    private const string Region = CacheRegions.Goals;
    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Goal>> GetAllAsync()
    {
        var familyId = FamilyId;
        var cached = await cache.GetAsync<List<Goal>>(Region, familyId, "all");
        if (cached is not null) return cached;

        var fresh = (await inner.GetAllAsync()).ToList();
        await cache.SetAsync(Region, familyId, "all", fresh);
        return fresh;
    }

    public async Task<IEnumerable<Goal>> GetByProfileIdAsync(string profileId)
    {
        var familyId = FamilyId;
        var suffix = $"profile:{profileId}";
        var cached = await cache.GetAsync<List<Goal>>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = (await inner.GetByProfileIdAsync(profileId)).ToList();
        await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Goal?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        var suffix = $"item:{id}";
        var cached = await cache.GetAsync<Goal>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = await inner.GetByIdAsync(id);
        if (fresh is not null)
            await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Goal> CreateAsync(Goal goal)
    {
        var created = await inner.CreateAsync(goal);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return created;
    }

    public async Task<Goal> UpdateAsync(Goal goal)
    {
        var updated = await inner.UpdateAsync(goal);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return updated;
    }

    public async Task DeleteAsync(string id)
    {
        await inner.DeleteAsync(id);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
    }
}
