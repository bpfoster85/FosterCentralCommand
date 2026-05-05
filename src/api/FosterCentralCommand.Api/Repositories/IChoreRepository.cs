using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IChoreRepository
{
    Task<IEnumerable<Chore>> GetAllAsync();
    Task<IEnumerable<Chore>> GetByProfileIdAsync(string profileId);
    Task<Chore?> GetByIdAsync(string id);
    Task<Chore> CreateAsync(Chore chore);
    Task<Chore> UpdateAsync(Chore chore);
    Task DeleteAsync(string id);
}
