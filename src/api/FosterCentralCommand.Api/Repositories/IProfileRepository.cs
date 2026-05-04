using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IProfileRepository
{
    Task<IEnumerable<Profile>> GetAllAsync();
    Task<Profile?> GetByIdAsync(string id);
    Task<Profile?> GetByEmailAsync(string email);
    Task<Profile> CreateAsync(Profile profile);
    Task<Profile> UpdateAsync(Profile profile);
    Task DeleteAsync(string id);
}
