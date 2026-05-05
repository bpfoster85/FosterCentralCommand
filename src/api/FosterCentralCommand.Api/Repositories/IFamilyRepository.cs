using FosterCentralCommand.Api.Models;

namespace FosterCentralCommand.Api.Repositories;

public interface IFamilyRepository
{
    Task<IEnumerable<Family>> GetAllAsync();
    Task<Family?> GetByIdAsync(string id);
    Task<Family?> GetByNameAsync(string name);
    Task<Family> CreateAsync(Family family);
    Task<Family> UpdateAsync(Family family);
    Task DeleteAsync(string id);
}
