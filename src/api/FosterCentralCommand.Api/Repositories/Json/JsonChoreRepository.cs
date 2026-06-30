using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IChoreRepository"/> backed by the in-memory JSON document.
/// Scoped to the current family via <see cref="FamilyContext"/>.
/// </summary>
public sealed class JsonChoreRepository(JsonDataStore store, FamilyContext familyContext) : IChoreRepository
{
    private string FamilyId => familyContext.CurrentId;

    public Task<IEnumerable<Chore>> GetAllAsync()
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<Chore>)doc.Chores
            .Where(c => c.FamilyId == familyId)
            .OrderBy(c => c.DueDate)
            .ToList());
    }

    public Task<IEnumerable<Chore>> GetByProfileIdAsync(string profileId)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<Chore>)doc.Chores
            .Where(c => c.FamilyId == familyId && c.AssignedProfileId == profileId)
            .OrderBy(c => c.DueDate)
            .ToList());
    }

    public Task<Chore?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc =>
            doc.Chores.FirstOrDefault(c => c.Id == id && c.FamilyId == familyId));
    }

    public Task<Chore> CreateAsync(Chore chore)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            chore.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(chore)!;
            doc.Chores.Add(stored);
            return stored;
        });
    }

    public Task<Chore> UpdateAsync(Chore chore)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Chores.FindIndex(c => c.Id == chore.Id && c.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Chore {chore.Id} not found for this family.");

            chore.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(chore)!;
            doc.Chores[index] = stored;
            return stored;
        });
    }

    public Task DeleteAsync(string id)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Chores.FindIndex(c => c.Id == id && c.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Chore {id} not found for this family.");

            doc.Chores.RemoveAt(index);
        });
    }
}
