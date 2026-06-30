using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IFamilyRepository"/> backed by the in-memory JSON document.
/// Families are global (not family-scoped) — this is the tenant directory used
/// by login, so it is intentionally not cached behind <see cref="FamilyContext"/>.
/// </summary>
public sealed class JsonFamilyRepository(JsonDataStore store) : IFamilyRepository
{
    public Task<IEnumerable<Family>> GetAllAsync() =>
        store.ReadAsync(doc => (IEnumerable<Family>)doc.Families
            .OrderBy(f => f.Name)
            .ToList());

    public Task<Family?> GetByIdAsync(string id) =>
        store.ReadAsync(doc => doc.Families.FirstOrDefault(f => f.Id == id));

    public Task<Family?> GetByNameAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Task.FromResult<Family?>(null);

        var normalized = name.Trim().ToLowerInvariant();
        return store.ReadAsync(doc =>
            doc.Families.FirstOrDefault(f => f.NameNormalized == normalized));
    }

    public Task<Family> CreateAsync(Family family) =>
        store.WriteAsync(doc =>
        {
            var stored = JsonStoreSerialization.Clone(family)!;
            doc.Families.Add(stored);
            return stored;
        });

    public Task<Family> UpdateAsync(Family family) =>
        store.WriteAsync(doc =>
        {
            var index = doc.Families.FindIndex(f => f.Id == family.Id);
            if (index < 0)
                throw new KeyNotFoundException($"Family {family.Id} not found.");

            var stored = JsonStoreSerialization.Clone(family)!;
            doc.Families[index] = stored;
            return stored;
        });

    public Task DeleteAsync(string id) =>
        store.WriteAsync(doc =>
        {
            var index = doc.Families.FindIndex(f => f.Id == id);
            if (index >= 0)
                doc.Families.RemoveAt(index);
        });
}
