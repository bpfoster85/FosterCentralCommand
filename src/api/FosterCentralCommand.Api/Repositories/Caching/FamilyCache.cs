using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace FosterCentralCommand.Api.Repositories.Caching;

/// <summary>
/// Logical cache regions, one per cached repository. Used to namespace keys
/// and as the unit of invalidation.
/// </summary>
internal static class CacheRegions
{
    public const string Chores = "chores";
    public const string Goals = "goals";
    public const string Lists = "lists";
    public const string Profiles = "profiles";
}

/// <summary>
/// Per-family caching helper backed by <see cref="IDistributedCache"/>.
/// Keys are scoped to a (region, familyId) pair and tracked in a per-family
/// index so a single write can wipe the family's slice in one call without
/// requiring a SCAN-capable backing store.
///
/// No time-based expiration is used — entries live until a write busts them.
/// </summary>
public sealed class FamilyCache(IDistributedCache cache)
{
    private static readonly DistributedCacheEntryOptions NeverExpires = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> IndexLocks = new();

    public async Task<T?> GetAsync<T>(string region, string familyId, string suffix, CancellationToken ct = default)
        where T : class
    {
        var json = await cache.GetStringAsync(Key(region, familyId, suffix), ct);
        return json is null ? null : JsonSerializer.Deserialize<T>(json);
    }

    public async Task SetAsync<T>(string region, string familyId, string suffix, T value, CancellationToken ct = default)
        where T : class
    {
        var key = Key(region, familyId, suffix);
        var json = JsonSerializer.Serialize(value);
        await cache.SetStringAsync(key, json, NeverExpires, ct);
        await TrackKeyAsync(region, familyId, key, ct);
    }

    /// <summary>
    /// Removes every cached entry for the given (region, familyId) pair and
    /// the index that tracks them.
    /// </summary>
    public async Task InvalidateFamilyAsync(string region, string familyId, CancellationToken ct = default)
    {
        var indexKey = IndexKey(region, familyId);
        var gate = IndexLocks.GetOrAdd(indexKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            var indexJson = await cache.GetStringAsync(indexKey, ct);
            if (indexJson is null) return;

            var keys = JsonSerializer.Deserialize<HashSet<string>>(indexJson) ?? [];
            foreach (var k in keys)
            {
                await cache.RemoveAsync(k, ct);
            }
            await cache.RemoveAsync(indexKey, ct);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task TrackKeyAsync(string region, string familyId, string key, CancellationToken ct)
    {
        var indexKey = IndexKey(region, familyId);
        var gate = IndexLocks.GetOrAdd(indexKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            var indexJson = await cache.GetStringAsync(indexKey, ct);
            var keys = indexJson is null
                ? []
                : JsonSerializer.Deserialize<HashSet<string>>(indexJson) ?? [];

            if (keys.Add(key))
            {
                await cache.SetStringAsync(indexKey, JsonSerializer.Serialize(keys), NeverExpires, ct);
            }
        }
        finally
        {
            gate.Release();
        }
    }

    private static string Key(string region, string familyId, string suffix) =>
        $"{region}:{familyId}:{suffix}";

    private static string IndexKey(string region, string familyId) =>
        $"{region}:{familyId}:__keys";
}
