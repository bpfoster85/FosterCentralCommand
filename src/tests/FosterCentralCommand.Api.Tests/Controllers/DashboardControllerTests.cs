using FosterCentralCommand.Api.Controllers;
using FosterCentralCommand.Api.DTOs;
using FosterCentralCommand.Api.Models;
using FosterCentralCommand.Api.Repositories;
using FosterCentralCommand.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FosterCentralCommand.Api.Tests.Controllers;

public class DashboardControllerTests
{
    [Fact]
    public void GetDadsSwearJar_ReturnsCurrentCount()
    {
        var family = new Family { DadsSwearJarCount = 7 };
        var controller = new DashboardController(new FakeFamilyRepository(), new FamilyContext { Current = family });

        var result = controller.GetDadsSwearJar();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DadsSwearJarDto>(ok.Value);
        Assert.Equal(7, dto.Count);
    }

    [Fact]
    public async Task AddToDadsSwearJar_IncrementsAndPersists()
    {
        var family = new Family { Id = Guid.NewGuid().ToString(), DadsSwearJarCount = 2 };
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var result = await controller.AddToDadsSwearJar();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DadsSwearJarDto>(ok.Value);
        Assert.Equal(3, dto.Count);
        Assert.True(repo.UpdateCalled);
    }

    [Fact]
    public void GetChecklist_ReturnsSeedItem()
    {
        var family = new Family();
        var controller = new DashboardController(new FakeFamilyRepository(), new FamilyContext { Current = family });

        var result = controller.GetChecklist();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<DashboardChecklistDto>(ok.Value);
        var item = Assert.Single(dto.Items);
        Assert.Equal("Water garden", item.Title);
        Assert.Equal("pi pi-leaf", item.Logo);
    }

    [Fact]
    public async Task ToggleChecklistItem_AddsAndRemovesCompletion()
    {
        var family = new Family { Id = Guid.NewGuid().ToString() };
        var item = family.ChecklistItems.First();
        var repo = new FakeFamilyRepository { Current = family };
        var controller = new DashboardController(repo, new FamilyContext { Current = family });

        var addResult = await controller.ToggleChecklistItem(item.Id, new ToggleDashboardChecklistItemRequest("2026-06-10"));
        var addOk = Assert.IsType<OkObjectResult>(addResult.Result);
        var addDto = Assert.IsType<DashboardChecklistDto>(addOk.Value);
        Assert.True(addDto.Items.Single(i => i.Id == item.Id).CheckedToday);
        Assert.True(repo.UpdateCalled);

        var removeResult = await controller.ToggleChecklistItem(item.Id, new ToggleDashboardChecklistItemRequest("2026-06-10"));
        var removeOk = Assert.IsType<OkObjectResult>(removeResult.Result);
        var removeDto = Assert.IsType<DashboardChecklistDto>(removeOk.Value);
        Assert.False(removeDto.Items.Single(i => i.Id == item.Id).CheckedToday);
    }

    private sealed class FakeFamilyRepository : IFamilyRepository
    {
        public Family? Current { get; set; }
        public bool UpdateCalled { get; private set; }

        public Task<IEnumerable<Family>> GetAllAsync() =>
            Task.FromResult(Enumerable.Empty<Family>());

        public Task<Family?> GetByIdAsync(string id) =>
            Task.FromResult(Current?.Id == id ? Current : null);

        public Task<Family?> GetByNameAsync(string name) =>
            Task.FromResult<Family?>(null);

        public Task<Family> CreateAsync(Family family) =>
            Task.FromResult(family);

        public Task<Family> UpdateAsync(Family family)
        {
            UpdateCalled = true;
            Current = family;
            return Task.FromResult(family);
        }

        public Task DeleteAsync(string id) => Task.CompletedTask;
    }
}
