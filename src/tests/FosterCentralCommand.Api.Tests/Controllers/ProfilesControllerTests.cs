using FosterCentralCommand.Api.Controllers;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Tests.Controllers;

public class ProfilesControllerTests
{
    [Fact]
    public async Task GetById_ReturnsNotFound_WhenProfileDoesNotExist()
    {
        var repo = new FakeProfileRepository();
        var controller = new ProfilesController(repo);

        var result = await controller.GetById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsConflict_WhenEmailAlreadyExists()
    {
        var existing = new Profile { Name = "Sam", Email = "sam@example.com" };
        var repo = new FakeProfileRepository { ExistingByEmail = existing };
        var controller = new ProfilesController(repo);

        var result = await controller.Create(new CreateProfileRequest("Test", "sam@example.com"));

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal("A profile with this email already exists.", conflict.Value);
    }

    [Fact]
    public async Task Create_ReturnsCreatedAtAction_WithMappedDto()
    {
        var profileId = Guid.NewGuid();
        var created = new Profile
        {
            Id = profileId.ToString(),
            Name = "Taylor",
            Email = "taylor@example.com",
            Color = "#FFFFFF"
        };

        var repo = new FakeProfileRepository { CreateResult = created };
        var controller = new ProfilesController(repo);

        var result = await controller.Create(new CreateProfileRequest("Taylor", "taylor@example.com", "#FFFFFF", null));

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(ProfilesController.GetById), createdResult.ActionName);

        var dto = Assert.IsType<ProfileDto>(createdResult.Value);
        Assert.Equal(profileId, dto.Id);
        Assert.Equal("Taylor", dto.Name);
        Assert.Equal("taylor@example.com", dto.Email);
    }

    private sealed class FakeProfileRepository : IProfileRepository
    {
        public Profile? ExistingByEmail { get; set; }
        public Profile? CreateResult { get; set; }

        public Task<Profile> CreateAsync(Profile profile)
            => Task.FromResult(CreateResult ?? profile);

        public Task DeleteAsync(string id)
            => Task.CompletedTask;

        public Task<IEnumerable<Profile>> GetAllAsync()
            => Task.FromResult(Enumerable.Empty<Profile>());

        public Task<Profile?> GetByEmailAsync(string email)
            => Task.FromResult(ExistingByEmail?.Email == email ? ExistingByEmail : null);

        public Task<Profile?> GetByIdAsync(string id)
            => Task.FromResult<Profile?>(null);

        public Task<Profile> UpdateAsync(Profile profile)
            => Task.FromResult(profile);
    }
}
