using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Caching;

/// <summary>
/// Read-through / write-bust cache decorator for <see cref="IProfileRepository"/>.
/// Writes invalidate the entire profiles region for the current family.
/// </summary>
public sealed class CachedProfileRepository(
    CosmosProfileRepository inner,
    FamilyCache cache,
    FamilyContext familyContext) : IProfileRepository
{
    private const string Region = CacheRegions.Profiles;
    private string FamilyId => familyContext.CurrentId;

    public async Task<IEnumerable<Profile>> GetAllAsync()
    {
        var familyId = FamilyId;
        var cached = await cache.GetAsync<List<Profile>>(Region, familyId, "all");
        if (cached is not null) return cached;

        var fresh = (await inner.GetAllAsync()).ToList();
        await cache.SetAsync(Region, familyId, "all", fresh);
        return fresh;
    }

    public async Task<Profile?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        var suffix = $"item:{id}";
        var cached = await cache.GetAsync<Profile>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = await inner.GetByIdAsync(id);
        if (fresh is not null)
            await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Profile?> GetByEmailAsync(string email)
    {
        var familyId = FamilyId;
        var suffix = $"email:{email}";
        var cached = await cache.GetAsync<Profile>(Region, familyId, suffix);
        if (cached is not null) return cached;

        var fresh = await inner.GetByEmailAsync(email);
        if (fresh is not null)
            await cache.SetAsync(Region, familyId, suffix, fresh);
        return fresh;
    }

    public async Task<Profile> CreateAsync(Profile profile)
    {
        var created = await inner.CreateAsync(profile);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return created;
    }

    public async Task<Profile> UpdateAsync(Profile profile)
    {
        var updated = await inner.UpdateAsync(profile);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
        return updated;
    }

    public async Task DeleteAsync(string id)
    {
        await inner.DeleteAsync(id);
        await cache.InvalidateFamilyAsync(Region, FamilyId);
    }
}
