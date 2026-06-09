using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(
    IFamilyRepository familyRepo,
    FamilyContext familyContext) : ControllerBase
{
    [HttpGet("dads-swear-jar")]
    public ActionResult<DadsSwearJarDto> GetDadsSwearJar()
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        return Ok(MapToDto(family));
    }

    [HttpPost("dads-swear-jar/add")]
    public async Task<ActionResult<DadsSwearJarDto>> AddToDadsSwearJar([FromBody] AddDadsSwearJarRequest? request = null)
    {
        var family = familyContext.Current;
        if (family is null) return Unauthorized();

        var amount = request?.Amount ?? 1;
        if (amount <= 0) return BadRequest("Amount must be greater than 0.");

        family.DadsSwearJarCount += amount;
        family.UpdatedAt = DateTime.UtcNow;

        var updated = await familyRepo.UpdateAsync(family);
        familyContext.Current = updated;

        return Ok(MapToDto(updated));
    }

    private static DadsSwearJarDto MapToDto(Models.Family family) =>
        new(family.DadsSwearJarCount, family.UpdatedAt);
}
