using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Services;

namespace FosterCentralCommand.Api.Repositories.Json;

/// <summary>
/// <see cref="IGoalRepository"/> backed by the in-memory JSON document.
/// Scoped to the current family via <see cref="FamilyContext"/>.
/// </summary>
public sealed class JsonGoalRepository(JsonDataStore store, FamilyContext familyContext) : IGoalRepository
{
    private string FamilyId => familyContext.CurrentId;

    public Task<IEnumerable<Goal>> GetAllAsync()
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<Goal>)doc.Goals
            .Where(g => g.FamilyId == familyId)
            .OrderBy(g => g.Title)
            .ToList());
    }

    public Task<IEnumerable<Goal>> GetByProfileIdAsync(string profileId)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc => (IEnumerable<Goal>)doc.Goals
            .Where(g => g.FamilyId == familyId && g.ProfileId == profileId)
            .OrderBy(g => g.Title)
            .ToList());
    }

    public Task<Goal?> GetByIdAsync(string id)
    {
        var familyId = FamilyId;
        return store.ReadAsync(doc =>
            doc.Goals.FirstOrDefault(g => g.Id == id && g.FamilyId == familyId));
    }

    public Task<Goal> CreateAsync(Goal goal)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            goal.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(goal)!;
            doc.Goals.Add(stored);
            return stored;
        });
    }

    public Task<Goal> UpdateAsync(Goal goal)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Goals.FindIndex(g => g.Id == goal.Id && g.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Goal {goal.Id} not found for this family.");

            goal.FamilyId = familyId;
            var stored = JsonStoreSerialization.Clone(goal)!;
            doc.Goals[index] = stored;
            return stored;
        });
    }

    public Task DeleteAsync(string id)
    {
        var familyId = FamilyId;
        return store.WriteAsync(doc =>
        {
            var index = doc.Goals.FindIndex(g => g.Id == id && g.FamilyId == familyId);
            if (index < 0)
                throw new KeyNotFoundException($"Goal {id} not found for this family.");

            doc.Goals.RemoveAt(index);
        });
    }
}
