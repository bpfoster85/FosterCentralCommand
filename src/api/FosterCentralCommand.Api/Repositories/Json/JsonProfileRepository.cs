using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IProfileRepository"/> backed by the in-memory JSON document.
/// Scoped to the current family via <see cref="FamilyContext"/>.
/// </summary>
public sealed class JsonProfileRepository(JsonDataStore store, FamilyContext familyContext) : IProfileRepository
{
    private string FamilyId => familyContext.CurrentId;

    public Task<IEnumerable<Profile>> GetAllAsync()
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<Profile>)doc.Profiles
            .Where(p => p.FamilyId == familyId)
            .OrderBy(p => p.Name)
            .ToList());
    }

    public Task<Profile?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc =>
            doc.Profiles.FirstOrDefault(p => p.Id == id && p.FamilyId == familyId));
    }

    public Task<Profile?> GetByEmailAsync(string email)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc =>
            doc.Profiles.FirstOrDefault(p => p.FamilyId == familyId && p.Email == email));
    }

    public Task<Profile> CreateAsync(Profile profile)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            profile.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(profile)!;
            doc.Profiles.Add(stored);
            return stored;
        });
    }

    public Task<Profile> UpdateAsync(Profile profile)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Profiles.FindIndex(p => p.Id == profile.Id && p.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Profile {profile.Id} not found for this family.");

            profile.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(profile)!;
            doc.Profiles[index] = stored;
            return stored;
        });
    }

    public Task DeleteAsync(string id)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Profiles.FindIndex(p => p.Id == id && p.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Profile {id} not found for this family.");

            doc.Profiles.RemoveAt(index);
        });
    }
}
