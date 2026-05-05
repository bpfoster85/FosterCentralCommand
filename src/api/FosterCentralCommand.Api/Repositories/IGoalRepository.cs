using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IGoalRepository
{
    Task<IEnumerable<Goal>> GetAllAsync();
    Task<IEnumerable<Goal>> GetByProfileIdAsync(string profileId);
    Task<Goal?> GetByIdAsync(string id);
    Task<Goal> CreateAsync(Goal goal);
    Task<Goal> UpdateAsync(Goal goal);
    Task DeleteAsync(string id);
}
